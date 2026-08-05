import { Text } from '@mantine/core';

import { parseRichText } from '../lib/richText.js';
import classes from './RichTextView.module.scss';

/**
 * Zeigt den Inhalt eines Textfeldes an – Absätze und Aufzählungen.
 *
 * **Nie `dangerouslySetInnerHTML`.** Der Inhalt wird über `parseRichText()`
 * in Blöcke zerlegt und hier als React-Elemente wieder aufgebaut; was nicht
 * ins erlaubte Schema passt, kommt gar nicht erst an. Damit gibt es an dieser
 * Stelle keine Angriffsfläche, obwohl in der Datenbank HTML steht – dieselbe
 * Haltung wie in den Notizen, nur ohne auf die Formatierung zu verzichten.
 *
 * Klartext aus „Schnell festhalten" und aus alten Protokollen läuft durch
 * denselben Weg und sieht deshalb genauso aus.
 */
export default function RichTextView({ value, size = 'sm', className }) {
  const blocks = parseRichText(value);
  if (blocks.length === 0) return null;

  return (
    <div className={className}>
      {blocks.map((block, index) =>
        block.type === 'list' ? (
          <Text
            key={index}
            component={block.ordered ? 'ol' : 'ul'}
            size={size}
            className={classes.list}
          >
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>
                <Spans spans={item} />
              </li>
            ))}
          </Text>
        ) : (
          <Text key={index} size={size} className={classes.paragraph}>
            <Spans spans={block.spans} />
          </Text>
        )
      )}
    </div>
  );
}

/** Fett und kursiv – mehr Auszeichnungen kann der Editor nicht erzeugen. */
function Spans({ spans }) {
  return spans.map((span, index) => {
    let content = span.text;
    if (span.italic) content = <em key={index}>{content}</em>;
    if (span.bold) content = <strong key={index}>{content}</strong>;
    return <span key={index}>{content}</span>;
  });
}
