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
 * @param {*} liveValue Wert aus der Subscription (primitiv, damit vergleichbar)
 * @returns {[*, (value: *) => void]} [anzuzeigender Wert, Wunschwert setzen]
 */
export function useOptimisticValue(liveValue) {
  const [pending, setPending] = useState(null);
  const previousLive = useRef(liveValue);

  useEffect(() => {
    if (previousLive.current !== liveValue) {
      previousLive.current = liveValue;
      setPending(null);
    }
  }, [liveValue]);

  return [pending ?? liveValue, setPending];
}
