import { useEffect, useRef, useState } from 'react';

/**
 * Hält beim Bedienen eines Reglers kurzzeitig den gewünschten Wert fest,
 * bis Home Assistant den echten Zustand zurückmeldet.
 *
 * Ohne das springt jeder Slider beim Loslassen einmal auf den alten Wert
 * zurück – die Rückmeldung über den WebSocket braucht ein paar hundert
 * Millisekunden. Sobald sich der Live-Wert ändert, gilt wieder er:
 * die Subscription bleibt die Quelle der Wahrheit, der lokale Wert ist
 * nur eine Überbrückung.
 *
 * Notbremse: kommt gar keine Rückmeldung – die Lampe hat den Befehl
 * angenommen, führt ihn aber nicht aus, oder der Zustand ändert sich schlicht
 * nicht –, würde der Wunschwert sonst für immer stehen bleiben und die Karte
 * dauerhaft etwas Falsches zeigen. Nach FALLBACK_TIMEOUT gilt wieder der
 * Live-Wert.
 *
 * @param {*} liveValue Wert aus der Subscription (primitiv, damit vergleichbar)
 * @returns {[*, (value: *) => void]} [anzuzeigender Wert, Wunschwert setzen]
 *   Ein Aufruf mit `null` verwirft den Wunschwert – so wird nach einem
 *   fehlgeschlagenen Service-Aufruf zurückgerollt.
 */

/** So lange darf ein Wunschwert höchstens ohne Bestätigung stehen. */
const FALLBACK_TIMEOUT = 8_000;

export function useOptimisticValue(liveValue) {
  const [pending, setPending] = useState(null);
  const previousLive = useRef(liveValue);

  useEffect(() => {
    if (previousLive.current !== liveValue) {
      previousLive.current = liveValue;
      setPending(null);
    }
  }, [liveValue]);

  useEffect(() => {
    if (pending === null) return undefined;
    const timer = setTimeout(() => setPending(null), FALLBACK_TIMEOUT);
    return () => clearTimeout(timer);
  }, [pending]);

  return [pending ?? liveValue, setPending];
}
