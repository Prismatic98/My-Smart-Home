import { constants } from 'node:fs';
import { access, lstat, mkdir, realpath } from 'node:fs/promises';
import path from 'node:path';

import { invalidPath, notFound } from '../errors.js';

/**
 * Pfad-Sicherheit für die Dateiablage.
 *
 * Jeder Pfad, der vom Client kommt, ist relativ zum Wurzelverzeichnis
 * (z. B. "/Fotos/2026"). Alles in dieser Datei existiert, um genau eine Frage
 * zuverlässig zu beantworten: liegt das Ziel wirklich noch innerhalb der
 * Wurzel? Keine Route darf einen Pfad an das Dateisystem weiterreichen, der
 * nicht durch resolveSafePath() gelaufen ist.
 */

/** Wurzel der Ablage. Im Container ein Bind-Mount, im Dev ein lokaler Ordner. */
export const FILES_ROOT = path.resolve(process.env.FILES_ROOT ?? './data/files');

/**
 * Legt die Wurzel an und prüft, dass wir dort schreiben dürfen. Läuft beim
 * Start – ein fehlendes Schreibrecht soll sofort auffallen und nicht erst beim
 * ersten Upload.
 */
export async function ensureFilesRoot() {
  try {
    await mkdir(FILES_ROOT, { recursive: true });
  } catch (cause) {
    throw new Error(
      `Wurzelverzeichnis ${FILES_ROOT} lässt sich nicht anlegen: ${cause.message}`,
      { cause }
    );
  }

  try {
    await access(FILES_ROOT, constants.W_OK | constants.X_OK);
  } catch (cause) {
    throw new Error(
      `Keine Schreibrechte auf ${FILES_ROOT}. Im Container läuft der Server als uid 1000 – ` +
        `gehört das gemountete Verzeichnis auf dem Host jemand anderem, hilft ` +
        `"sudo chown -R 1000:1000 <verzeichnis>".`,
      { cause }
    );
  }

  return FILES_ROOT;
}

/**
 * Übersetzt einen Client-Pfad in einen absoluten Pfad innerhalb der Wurzel.
 *
 * Drei Stufen, bewusst redundant:
 *  1. posix-normalisieren – damit werden "..", "." und Doppel-Slashes
 *     aufgelöst. Der führende Slash sorgt dafür, dass "../etc" zu "/etc"
 *     kollabiert statt oberhalb der Wurzel zu landen.
 *  2. mit der Wurzel zusammensetzen und auflösen.
 *  3. gegenprüfen. Der Vergleich läuft über path.relative und NICHT über
 *     startsWith auf Strings: sonst würde "/data/files-alt" als Treffer für
 *     "/data/files" durchgehen.
 */
export function resolveSafePath(userPath = '/') {
  const raw = typeof userPath === 'string' && userPath.length > 0 ? userPath : '/';

  if (raw.includes('\0')) {
    throw invalidPath('Der Pfad enthält ein ungültiges Zeichen.');
  }

  const relPath = path.posix.normalize(`/${raw}`);
  const absPath = path.resolve(FILES_ROOT, `.${relPath}`);

  const relativeToRoot = path.relative(FILES_ROOT, absPath);
  const escapes = relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot);
  if (escapes) {
    throw invalidPath('Der Pfad liegt außerhalb der Dateiablage.');
  }

  return { absPath, relPath };
}

/**
 * Prüft einen einzelnen Datei- oder Ordnernamen und gibt ihn getrimmt zurück.
 * Gilt für alles, was neu entsteht: mkdir, rename und der Dateiname beim Upload.
 */
export function validateName(name) {
  const trimmed = String(name ?? '').trim();

  if (!trimmed) {
    throw invalidPath('Der Name darf nicht leer sein.');
  }
  if (trimmed.length > 255) {
    throw invalidPath('Der Name darf höchstens 255 Zeichen lang sein.');
  }
  if (trimmed.includes('\0')) {
    throw invalidPath('Der Name enthält ein ungültiges Zeichen.');
  }
  if (trimmed.includes('/') || trimmed.includes('\\')) {
    throw invalidPath('Der Name darf keine Schrägstriche enthalten.');
  }
  if (/^\.+$/.test(trimmed)) {
    throw invalidPath('Der Name darf nicht nur aus Punkten bestehen.');
  }
  // Führende Punkte wären zwar technisch erlaubt, der Eintrag würde aber
  // sofort aus dem Listing fallen (dort werden Punktdateien ausgeblendet).
  // Ein unsichtbarer Ordner, der beim zweiten Anlegen "existiert bereits"
  // meldet, ist die schlechtere Überraschung.
  if (trimmed.startsWith('.')) {
    throw invalidPath('Namen mit führendem Punkt sind nicht möglich – sie wären in der Ablage unsichtbar.');
  }

  return trimmed;
}

/**
 * lstat ohne Symlinks zu folgen. Ein Symlink könnte aus der Wurzel
 * herauszeigen, deshalb wird er grundsätzlich abgelehnt statt aufgelöst.
 */
export async function statNoFollow(absPath, { missingMessage } = {}) {
  let stats;
  try {
    stats = await lstat(absPath);
  } catch (cause) {
    if (cause.code === 'ENOENT' || cause.code === 'ENOTDIR') {
      throw notFound(missingMessage ?? 'Der Eintrag existiert nicht.');
    }
    throw cause;
  }

  if (stats.isSymbolicLink()) {
    throw invalidPath('Verknüpfungen werden aus Sicherheitsgründen nicht unterstützt.');
  }

  return stats;
}

/**
 * Zweite Verteidigungslinie gegen Symlinks: resolveSafePath() rechnet nur mit
 * Zeichenketten und merkt nicht, wenn ein Verzeichnis MITTEN im Pfad ein
 * Symlink nach außen ist. realpath() löst die echte Kette auf, danach wird
 * erneut gegen die Wurzel geprüft.
 */
export async function assertResolvedInsideRoot(absPath) {
  let real;
  try {
    real = await realpath(absPath);
  } catch (cause) {
    if (cause.code === 'ENOENT' || cause.code === 'ENOTDIR') {
      throw notFound('Das Verzeichnis existiert nicht.');
    }
    throw cause;
  }

  const rootReal = await realpath(FILES_ROOT);
  const relative = path.relative(rootReal, real);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw invalidPath('Der Pfad verlässt über eine Verknüpfung die Dateiablage.');
  }

  return real;
}

/**
 * Auflösen eines Eintrags, der bereits existieren muss (Download, Löschen,
 * Umbenennen, Auflisten).
 */
export async function resolveExisting(userPath, { missingMessage } = {}) {
  const { absPath, relPath } = resolveSafePath(userPath);
  const stats = await statNoFollow(absPath, { missingMessage });

  // Elternverzeichnis real auflösen – bei der Wurzel selbst diese.
  const parent = relPath === '/' ? absPath : path.dirname(absPath);
  await assertResolvedInsideRoot(parent);

  return { absPath, relPath, stats };
}

/**
 * Auflösen eines Ziels, das erst entstehen soll (Upload, mkdir, rename).
 * Das übergeordnete Verzeichnis muss existieren.
 */
export async function resolveParentDirectory(userPath) {
  const { absPath, relPath } = resolveSafePath(userPath);
  const stats = await statNoFollow(absPath, {
    missingMessage: `Der Ordner ${relPath} existiert nicht.`,
  });

  if (!stats.isDirectory()) {
    throw invalidPath(`${relPath} ist kein Ordner.`);
  }

  await assertResolvedInsideRoot(absPath);

  return { absPath, relPath };
}

/** Ist das die Wurzel selbst? Die darf nicht gelöscht oder umbenannt werden. */
export function isRoot(relPath) {
  return relPath === '/' || relPath === '';
}
