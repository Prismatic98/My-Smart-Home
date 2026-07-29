import { open, readdir, lstat, mkdir, rename, rm, statfs } from 'node:fs/promises';
import path from 'node:path';

import mime from 'mime-types';

import { alreadyExists, ioError } from '../errors.js';
import { FILES_ROOT } from './paths.js';

/**
 * Die eigentlichen Dateisystem-Operationen. Bekommt ausschließlich absolute
 * Pfade, die vorher durch paths.js gelaufen sind – hier wird nicht mehr
 * geprüft, ob etwas innerhalb der Wurzel liegt.
 */

/** MIME-Typ aus der Endung. Der Inhalt wird bewusst nicht angefasst. */
export function lookupMimeType(name) {
  return mime.lookup(name) || 'application/octet-stream';
}

/**
 * Einträge eines Verzeichnisses.
 *
 * Ausgeblendet werden Punkt-Einträge (darunter die .upload-*.tmp der laufenden
 * Uploads), Symlinks und alles, was weder Datei noch Ordner ist.
 */
export async function listDirectory(absPath) {
  const dirents = await readdir(absPath, { withFileTypes: true });
  const entries = [];

  for (const dirent of dirents) {
    if (dirent.name.startsWith('.')) continue;
    if (dirent.isSymbolicLink()) continue;

    let stats;
    try {
      stats = await lstat(path.join(absPath, dirent.name));
    } catch {
      // Zwischen readdir und lstat gelöscht – einfach überspringen.
      continue;
    }

    const isDirectory = stats.isDirectory();
    if (!isDirectory && !stats.isFile()) continue;

    entries.push({
      name: dirent.name,
      type: isDirectory ? 'dir' : 'file',
      size: isDirectory ? null : stats.size,
      modifiedAt: stats.mtime.toISOString(),
      mimeType: isDirectory ? null : lookupMimeType(dirent.name),
    });
  }

  // Sinnvolle Vorgabe: Ordner zuerst, dann alphabetisch. Sortieren kann das
  // Frontend anschließend anders, aber die Antwort soll nicht zufällig sein.
  entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name, 'de', { sensitivity: 'base' });
  });

  return entries;
}

/** Legt einen Ordner an. Existiert er schon, gibt es 409 statt stillem Erfolg. */
export async function makeDirectory(parentAbs, name) {
  const target = path.join(parentAbs, name);
  try {
    await mkdir(target);
  } catch (cause) {
    if (cause.code === 'EEXIST') {
      throw alreadyExists(`„${name}" gibt es hier schon.`);
    }
    throw cause;
  }
  return target;
}

/** Benennt um. Bei Kollision 409 – rename() würde das Ziel sonst überschreiben. */
export async function renameEntry(absPath, newName) {
  const target = path.join(path.dirname(absPath), newName);

  if (target === absPath) return target;

  // rename() ersetzt ein vorhandenes Ziel kommentarlos. Deshalb vorher fragen.
  // Die kleine Lücke zwischen Prüfung und rename ist hier akzeptabel: es gibt
  // genau einen Nutzer, und das Ergebnis wäre schlimmstenfalls ein
  // überschriebener Eintrag, den derselbe Mensch gerade selbst angelegt hat.
  if (await exists(target)) {
    throw alreadyExists(`„${newName}" gibt es hier schon.`);
  }

  try {
    await rename(absPath, target);
  } catch (cause) {
    throw ioError(`Umbenennen fehlgeschlagen: ${cause.message}`);
  }

  return target;
}

/** Löscht Datei oder Ordner, Ordner rekursiv. */
export async function removeEntry(absPath) {
  try {
    await rm(absPath, { recursive: true, force: false });
  } catch (cause) {
    throw ioError(`Löschen fehlgeschlagen: ${cause.message}`);
  }
}

/**
 * Reserviert einen freien Dateinamen und legt ihn als leere Datei an.
 *
 * Das Anlegen mit dem Flag "wx" ist der Kern: es schlägt fehl, wenn die Datei
 * bereits existiert, und zwar atomar. Ein reines "existiert der Name schon?"
 * hätte bei parallelen Uploads (das Frontend lädt bis zu drei gleichzeitig
 * hoch) eine Lücke – zwei Dateien gleichen Namens könnten sich auf dasselbe
 * "(1)" einigen. Der reservierte Platzhalter wird später vom fertigen Upload
 * per rename überschrieben.
 */
export async function reserveUniqueName(dirAbs, desiredName) {
  const extension = path.extname(desiredName);
  const base = desiredName.slice(0, desiredName.length - extension.length);

  for (let counter = 0; counter < 1000; counter += 1) {
    const candidate = counter === 0 ? desiredName : `${base} (${counter})${extension}`;

    try {
      const handle = await open(path.join(dirAbs, candidate), 'wx');
      await handle.close();
      return candidate;
    } catch (cause) {
      if (cause.code !== 'EEXIST') {
        throw ioError(`Datei konnte nicht angelegt werden: ${cause.message}`);
      }
    }
  }

  throw alreadyExists(`Für „${desiredName}" ist kein freier Name mehr zu finden.`);
}

/** Belegung des Dateisystems, auf dem die Ablage liegt. */
export async function readUsage() {
  const stats = await statfs(FILES_ROOT);

  const blockSize = Number(stats.bsize);
  const totalBytes = Number(stats.blocks) * blockSize;
  // bavail statt bfree: die für normale Nutzer wirklich verfügbaren Blöcke.
  const freeBytes = Number(stats.bavail) * blockSize;

  return {
    totalBytes,
    freeBytes,
    usedBytes: totalBytes - Number(stats.bfree) * blockSize,
  };
}

/** Pfad in der Form, wie ihn der Client kennt (immer mit Slashes). */
export function toClientPath(relDir, name) {
  return path.posix.join(relDir === '' ? '/' : relDir, name);
}

async function exists(absPath) {
  try {
    await lstat(absPath);
    return true;
  } catch (cause) {
    if (cause.code === 'ENOENT' || cause.code === 'ENOTDIR') return false;
    throw cause;
  }
}

/** Wird beim Aufräumen abgebrochener Uploads gebraucht. */
export async function removeQuietly(absPath) {
  try {
    await rm(absPath, { force: true });
  } catch {
    // Aufräumen darf den eigentlichen Fehler nicht verdecken.
  }
}
