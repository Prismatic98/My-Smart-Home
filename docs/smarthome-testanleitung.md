# Manuelle Testanleitung: Smart-Home-Modul

Gezielt für die Grenzfälle des capability-getriebenen Umbaus. Die reine
Gruppierungslogik ist bereits gegen einen echten Registry-Abzug geprüft
(61 Lichtentitäten → 8 Karten, keine Entität doppelt oder verloren); was hier
steht, prüft die Oberfläche und das Verhalten am echten Gerät.

## Vorbereitung

Im Dev-Server gibt es keinen `/api`-Proxy zu Home Assistant. Für einen Test auf
dem Rechner muss `VITE_HA_URL` gesetzt sein:

```
# .env.local
VITE_HA_URL=http://smarthome:8123
VITE_HA_TOKEN=<Long-Lived Access Token>
```

Danach `npm run dev`. Auf dem Pi (Produktion) bleibt `VITE_HA_URL` leer — dort
läuft alles über Caddy auf derselben Origin.

**Wichtig:** Der Token muss zu einem **Administrator-Konto** gehören. Nur solche
Tokens dürfen die Geräte-, Entitäts- und Bereichs-Registry lesen. Fehlt das
Recht, zeigt die Übersicht die Meldung „Geräteliste nicht abrufbar" — das ist
dann kein Fehler der App.

---

## 1. Übersicht: Gruppierung

- [ ] `/smart-home` zeigt **8 Karten**, nicht 61. Eine Karte pro Gerät.
- [ ] Gruppen: Badezimmer (1), Flur (1), Schlafzimmer (1), Wohnzimmer (5).
      Küche hat keine Geräte und darf **nicht** als leere Gruppe erscheinen.
- [ ] Keine Karten für Sun, Backup, HACS, Forecast, Google Übersetzer,
      Govee Cloud Integration, Govee Integration, hci0 — die haben keine
      bedienbare Entität.
- [ ] Auf keiner Karte stehen Segmente, Selects oder Zonen-Switches.
- [ ] Kopfzeile je Bereich: „Alle an" / „Alle aus" schaltet nur die Geräte
      dieses Bereichs. Beim Wohnzimmer (5 Geräte) läuft das sichtbar
      nacheinander, nicht als Salve.

## 2. Pixel Light — kein Farbwähler

Das Gerät meldet nur `supported_color_modes: ["brightness"]`.

- [ ] Detailseite öffnen (`/smart-home/…`): Es gibt **Helligkeit**, aber
      **keinen Farbwähler** und **keinen Farbtemperatur-Regler**.
- [ ] Effekt-Picker: genau drei Tabs — „Szenen" (243), „DIY" (6), „Musik" (9).
      Kein „Snapshots"-Tab, das Gerät hat kein Snapshot-Select.
      („None" wird in keiner Liste als Eintrag gezeigt, sondern nur als Knopf
      „Effekt beenden" — das Scene-Select hat 244 Optionen, die Liste 243.)
- [ ] Die Szenenliste scrollt flüssig. Beim Scrollen dürfen keine Lücken oder
      übereinanderliegenden Kacheln entstehen (Virtualisierung).
- [ ] Suche eingeben: filtert sofort, Abschnitts-Überschriften verschwinden,
      es bleibt eine flache Trefferliste.
- [ ] Eine Szene anheften (Stern): sie erscheint oben unter „Favoriten".
      Seite neu laden → Favorit ist noch da (Dexie).
- [ ] Eine Szene wählen: wird sofort angewendet, Dialog schließt, die Szene
      steht danach unter „Zuletzt verwendet".

## 3. Flur — Musik-Switch ohne Select

`switch.flur_music_mode` existiert, ein `select.flur_music_mode` nicht.

- [ ] Detailseite zeigt den Abschnitt **Musikmodus** mit dem Schalter, aber
      **ohne** Modus-Auswahl. Kein leeres Auswahlfeld.
- [ ] Der Schalter steht auf `unavailable` → er ist durch das Badge „offline"
      ersetzt und nicht bedienbar. Der Abschnitt bleibt trotzdem sichtbar.
- [ ] Es gibt **keinen** Regler „Music Sensitivity" (das Gerät hat keine
      `number`-Entität).

## 4. TV — keine Segmente, aber Snapshot

- [ ] Detailseite hat **keinen** Abschnitt „Segmente".
- [ ] Abschnitte vorhanden: Licht, Effekt, „Zonen und Modi" (DreamView),
      Musikmodus (Schalter + Modus-Auswahl + Music Sensitivity).
- [ ] Effekt-Picker hat genau **drei** Tabs: Szenen (69), Snapshots (1),
      Musik (8) — **kein** DIY-Tab (`select.tv_diy_style` ist von der
      Integration deaktiviert und muss ausgefiltert sein).
- [ ] Nach dem Anwenden eines Snapshots steht **nicht** dauerhaft „Snapshot X
      aktiv" im Effekt-Kasten. Snapshots sind einmalige Aktionen.

## 5. Stehlampe — 8 Segmente statt 15

- [ ] Abschnitt „Segmente" zeigt das Badge **8**, nicht 15.
- [ ] Der Streifen ist in Reihenfolge 1…8 nummeriert (aufsteigend, keine
      Sortierung wie 1, 10, 11, 2).
- [ ] Farbfelder zeigen die tatsächlichen Segmentfarben.
- [ ] Kein An/Aus und keine Helligkeit pro Segment.
- [ ] Antippen wählt aus (blauer Rahmen), nochmal antippen hebt auf.
      Ein Antippen öffnet **keinen** Dialog — es bedeutet nur „ausgewählt".
- [ ] Mit 3 ausgewählten Segmenten: Farbe im Wähler ändern → währenddessen
      passiert **nichts** an der Lampe. Erst „Auswahl färben (3)" sendet.
- [ ] „Verlauf" färbt alle 8 sichtbar nacheinander, mit Fortschrittsbalken
      und Zähler. „Abbrechen" stoppt mitten in der Reihe.
- [ ] Der Hinweis nennt die Zahl der Anfragen (8).

Zum Vergleich: Flur, Badezimmer und Schreibtisch haben 15 Segmente.

## 6. Gerät ohne Bereich

Aktuell hat **jedes** Gerät einen Bereich — der Fall muss erzeugt werden:
in Home Assistant → Einstellungen → Geräte → z. B. „Schreibtisch" →
Bereich entfernen.

- [ ] Die Karte wandert in eine Gruppe **„Ohne Bereich"** ganz am **Ende** der
      Seite, nicht an den Anfang und nicht alphabetisch dazwischen.
- [ ] Auf der Detailseite steht das graue Badge „Ohne Bereich".
- [ ] Die Änderung erscheint **ohne Neuladen** (Event
      `device_registry_updated`). Danach Bereich wieder zuweisen — auch das
      muss live durchkommen.

## 7. Lampe offline

Erzeugen: eine Lampe vom Strom nehmen und warten, bis Home Assistant sie als
`unavailable` meldet (Attribut `connectivity` kippt).

- [ ] Karte: Badge „offline" statt Schalter, Karte leicht abgedunkelt,
      Helligkeitsregler verschwindet.
- [ ] Detailseite: Hinweis oben, alle Bedienelemente **sichtbar aber gesperrt**
      (nicht versteckt). Der Farbwähler nimmt keine Klicks an — auch nicht auf
      die Farbfelder.
- [ ] Segmentfelder sind gesperrt.
- [ ] Deep-Link auf die Detailseite funktioniert weiter.

## 8. Effekt-Zustand (der nachgemessene Teil)

- [ ] Szene über den Picker wählen (Tab „Szenen"): Die Karte zeigt danach den
      Namen als lila Badge, die Detailseite unter „Effekt" mit dem Zusatz
      „Szene". Die Lampe geht dabei mit an, falls sie aus war.
- [ ] DIY-Szene wählen (Wohnzimmer, Schlafzimmer oder Pixel Light): Der Name
      erscheint ebenfalls, mit dem Zusatz **„DIY-Szene"**. Das funktioniert nur,
      weil hier das DIY-Select als Quelle gelesen wird — `light.effect` ist bei
      DIY nachweislich `null`.
- [ ] „Effekt beenden": Badge verschwindet, die Lampe fällt auf ihre Farbe
      zurück.

## 9. Drosselung / Rate Limit

- [ ] Helligkeitsregler langsam über die ganze Breite ziehen: Die Lampe folgt
      ruckartig in Schritten (max. ein Aufruf pro 400 ms), nicht flüssig — das
      ist beabsichtigt. Beim Loslassen springt sie auf den Endwert.
- [ ] Dasselbe im Farbwähler.
- [ ] Zum Prüfen des Kontingents: in Home Assistant
      `sensor.govee_integration_api_rate_limit_remaining` beobachten. Sinkt der
      Wert unter 20, erscheint in der App oben rechts ein orangefarbenes Badge
      „N Anfragen übrig"; unter 6 wird es rot. Im Normalbetrieb ist es
      unsichtbar.

## 10. Navigation und Fehlerfälle

- [ ] „Details" → Detailseite → Zurück-Taste des Browsers/Androids landet
      wieder auf der Übersicht.
- [ ] Direkter Aufruf von `/smart-home/<device_id>` funktioniert (Deep-Link).
- [ ] `/smart-home/gibtsnicht` zeigt „Gerät nicht gefunden", nicht eine leere
      Seite und keinen Absturz.
- [ ] Home Assistant kurz stoppen: Die Seite meldet „Verbindung unterbrochen".
      Nach dem Start kommen Zustände **und** Registries wieder (der
      `ready`-Handler holt sie neu) — ohne Neuladen der Seite.
- [ ] Ein fehlgeschlagener Befehl (z. B. während HA neu startet) zeigt eine
      rote Mantine-Notification mit Klartext, und der Schalter/Regler springt
      auf den echten Wert zurück.

## 11. Diagnose

- [ ] Ganz unten auf der Detailseite steht „Diagnose", zugeklappt.
- [ ] Aufgeklappt: `Last Update Received` und `Last Command Sent` als
      „vor N Minuten", `Connectivity` als `on`/`off`.
- [ ] Diagnosewerte erscheinen **nirgends** in der Hauptansicht.
