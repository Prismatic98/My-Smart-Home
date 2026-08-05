/**
 * Der Inhalt der Textfelder – FREI VON REACT UND VOM DOM.
 *
 * Die Felder des Protokolls sind Rich-Text-Felder (TipTap) und liefern HTML.
 * Ausgelesen wird dieses HTML hier, mit einem eigenen kleinen Leser statt über
 * `DOMParser`. Zwei Gründe:
 *
 *  - Dieselbe Trennung wie bei `model.js` und `thoughtRecord.js`: die Regeln
 *    lassen sich in Node prüfen, ohne Browser. `stepHasContent()` hängt daran,
 *    und ein leeres TipTap-Dokument ist die Zeichenkette „<p></p>" – ohne
 *    Auslesen sähe jedes frische Protokoll gefüllt aus.
 *  - **Sicherheit.** Was hier herauskommt, ist eine Liste aus Blöcken und
 *    Textstücken; die Anzeige (RichTextView) setzt daraus React-Elemente
 *    zusammen und **nie** `dangerouslySetInnerHTML`. Ein fremdes `<script>`
 *    oder `<img onerror=…>` aus einem manipulierten Abgleich kann damit
 *    nichts auslösen – es fällt beim Lesen weg. Dieselbe Haltung wie in den
 *    Notizen, wo der Body in der Kachel nur als Text ausgelesen wird.
 *
 * Erlaubt ist genau das Schema, das der Editor erzeugen kann: Absätze,
 * Aufzählungen, nummerierte Listen, fett, kursiv, Zeilenumbruch. Alles andere
 * wird ignoriert, sein Text aber behalten – Inhalt geht nie verloren.
 *
 * Klartext bleibt lesbar: Protokolle aus der Zeit vor dem Rich-Text-Editor und
 * alles aus „Schnell festhalten" kommen als reiner Text an und werden nach
 * denselben Regeln in Blöcke zerlegt („- " am Zeilenanfang wird zur
 * Aufzählung). Es gibt deshalb keine Umwandlung in der Datenbank und keinen
 * Stichtag.
 */

/** Tags, die der Editor erzeugt. Alles andere ist für uns kein Tag. */
const KNOWN_TAGS = /<(p|ul|ol|li|br|strong|b|em|i)\b/i;

/** Ein Tag (mit Schrägstrich, falls schließend) oder ein Stück Text. */
const TOKEN = /<(\/?)([a-z0-9]+)[^>]*>|([^<]+)/gi;

/** Zeile einer Aufzählung im Klartext: „- ", „* " oder „• ". */
const TEXT_BULLET = /^\s*[-*•]\s+(.*)$/;

/**
 * Die Maskierungen, die der Editor erzeugt. Mehr braucht es nicht: Umlaute und
 * Sonderzeichen schreibt TipTap unmaskiert. Eine unbekannte benannte
 * Maskierung bleibt stehen, wie sie ist – sichtbar und damit erklärbar, statt
 * still zu verschwinden.
 */
const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  '#39': "'",
  nbsp: ' ',
};

/** Steckt in dem Wert HTML aus dem Editor – oder ist es Klartext? */
export function looksLikeHtml(value) {
  return KNOWN_TAGS.test(String(value ?? ''));
}

/**
 * Der Inhalt in der Form, die der Editor erwartet.
 *
 * Klartext wird dabei zu Absätzen, und Zeilen mit „- " werden zu einer echten
 * Aufzählung: wer ein altes Protokoll öffnet, findet seine Striche als Punkte
 * wieder, statt sie noch einmal tippen zu müssen.
 */
export function toEditorHtml(value) {
  const raw = String(value ?? '');
  if (looksLikeHtml(raw)) return raw;
  return blocksToHtml(blocksFromText(raw));
}

/**
 * Inhalt als Blöcke – die Form, aus der die Anzeige React-Elemente baut.
 *
 * @returns {Array<{ type: 'paragraph', spans: Span[] } |
 *                 { type: 'list', ordered: boolean, items: Span[][] }>}
 *   wobei Span = `{ text: string, bold?: boolean, italic?: boolean }`.
 */
export function parseRichText(value) {
  const raw = String(value ?? '');
  if (raw.trim().length === 0) return [];
  if (!looksLikeHtml(raw)) return blocksFromText(raw);

  const blocks = [];
  let list = null; // die gerade offene Liste, falls eine offen ist
  let spans = []; // Inhalt des offenen Absatzes bzw. Listenpunktes
  let bold = 0;
  let italic = 0;

  function closeBlock() {
    const cleaned = tidy(spans);
    spans = [];
    if (cleaned.length === 0) return;
    if (list) list.items.push(cleaned);
    else blocks.push({ type: 'paragraph', spans: cleaned });
  }

  function closeList() {
    closeBlock();
    if (list && list.items.length > 0) blocks.push(list);
    list = null;
  }

  for (const [, slash, name, text] of raw.matchAll(TOKEN)) {
    if (text != null) {
      spans.push({ text: decode(text), bold: bold > 0, italic: italic > 0 });
      continue;
    }

    const closing = slash === '/';

    switch (name.toLowerCase()) {
      case 'ul':
      case 'ol':
        // Auch das öffnende Tag schließt zuerst, was offen ist. Verschachtelte
        // Listen laufen dadurch zu einer flachen zusammen – die Einrückung
        // geht verloren, der Inhalt nicht.
        closeList();
        if (!closing) list = { type: 'list', ordered: name.toLowerCase() === 'ol', items: [] };
        break;
      case 'p':
      case 'li':
      case 'div':
        closeBlock();
        break;
      case 'br':
        if (!closing) spans.push({ text: '\n', bold: bold > 0, italic: italic > 0 });
        break;
      case 'strong':
      case 'b':
        bold = closing ? Math.max(0, bold - 1) : bold + 1;
        break;
      case 'em':
      case 'i':
        italic = closing ? Math.max(0, italic - 1) : italic + 1;
        break;
      default:
        break;
    }
  }

  closeList();
  return blocks;
}

/**
 * Der Inhalt als reiner Text – für „steht da schon etwas?", für Zitate in
 * einer Zeile und für alles, was keine Formatierung braucht.
 */
export function richTextToPlain(value) {
  return parseRichText(value)
    .map((block) =>
      block.type === 'list'
        ? block.items.map((item) => spansToText(item)).join('\n')
        : spansToText(block.spans)
    )
    .join('\n')
    .trim();
}

/** Steht in dem Feld etwas? („<p></p>" ist leer, auch wenn es Zeichen hat.) */
export function isRichTextEmpty(value) {
  return richTextToPlain(value).length === 0;
}

// ---------------------------------------------------------------------------

function spansToText(spans) {
  return spans.map((span) => span.text).join('');
}

/**
 * Klartext in Blöcke: Zeilen werden Absätze, „- " beginnt eine Aufzählung.
 * Aufeinanderfolgende Strich-Zeilen kommen in dieselbe Liste.
 */
function blocksFromText(text) {
  const blocks = [];
  let list = null;

  for (const line of String(text ?? '').split(/\r?\n/)) {
    const bullet = TEXT_BULLET.exec(line);

    if (bullet) {
      const content = bullet[1].trim();
      if (content.length === 0) continue;
      if (!list) {
        list = { type: 'list', ordered: false, items: [] };
        blocks.push(list);
      }
      list.items.push([{ text: content }]);
      continue;
    }

    list = null;
    const content = line.trim();
    if (content.length > 0) blocks.push({ type: 'paragraph', spans: [{ text: content }] });
  }

  return blocks;
}

/** Blöcke zurück nach HTML – nur für den Weg in den Editor. */
function blocksToHtml(blocks) {
  return blocks
    .map((block) =>
      block.type === 'list'
        ? `<ul>${block.items.map((item) => `<li><p>${escapeHtml(spansToText(item))}</p></li>`).join('')}</ul>`
        : `<p>${escapeHtml(spansToText(block.spans))}</p>`
    )
    .join('');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function decode(value) {
  return String(value).replace(/&(#?[a-z0-9]+);/gi, (match, name) => {
    const known = ENTITIES[name.toLowerCase()];
    if (known) return known;
    if (/^#\d+$/.test(name)) return String.fromCodePoint(Number(name.slice(1)));
    return match;
  });
}

/**
 * Aufräumen eines Blockes: leere Stücke weg, Gleichartiges zusammen, außen
 * keine Leerzeichen. Ohne das entstünden aus dem HTML des Editors laufend
 * Stücke mit leerem Text und dreifach verschachtelte Auszeichnungen.
 */
function tidy(spans) {
  const merged = [];

  for (const span of spans) {
    const text = span.text.replace(/[ 	]+/g, ' ');
    if (text.length === 0) continue;

    const last = merged[merged.length - 1];
    if (last && Boolean(last.bold) === Boolean(span.bold) && Boolean(last.italic) === Boolean(span.italic)) {
      last.text += text;
      continue;
    }

    merged.push({ text, bold: Boolean(span.bold), italic: Boolean(span.italic) });
  }

  if (merged.length > 0) {
    merged[0].text = merged[0].text.replace(/^\s+/, '');
    const last = merged[merged.length - 1];
    last.text = last.text.replace(/\s+$/, '');
  }

  return merged.filter((span) => span.text.length > 0);
}
