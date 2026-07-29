/**
 * Einheitliche Fehler für die API.
 *
 * Alles, was der Client zu sehen bekommt, hat die Form
 *   { error: { code, message } }
 * mit einer Meldung, die die UI unverändert anzeigen kann. Deshalb sind die
 * Texte hier deutsch und für Menschen geschrieben, nicht für Logfiles.
 */
export class AppError extends Error {
  constructor(code, message, statusCode) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/** Pfad oder Name verletzt die Regeln – oder versucht aus dem Wurzelverzeichnis auszubrechen. */
export const invalidPath = (message) => new AppError('INVALID_PATH', message, 400);

/** Gibt es nicht (mehr). */
export const notFound = (message) => new AppError('NOT_FOUND', message, 404);

/** Ziel ist belegt und darf nicht stillschweigend überschrieben werden. */
export const alreadyExists = (message) => new AppError('ALREADY_EXISTS', message, 409);

/** Datei überschreitet das Upload-Limit. */
export const tooLarge = (message) => new AppError('TOO_LARGE', message, 413);

/** Alles, was beim Zugriff auf das Dateisystem schiefgeht. */
export const ioError = (message) => new AppError('IO_ERROR', message, 500);
