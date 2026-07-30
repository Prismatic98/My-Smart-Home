/**
 * Reine Helfer für einzelne Home-Assistant-Entitäten.
 *
 * Bewusst frei von React und von `import.meta.env`: dadurch ist alles, was auf
 * diesen Helfern aufbaut (vor allem das Geräte-Modell), auch außerhalb des
 * Browsers ausführbar und lässt sich gegen einen Registry-Abzug prüfen.
 */

/** Anzeigename einer Entität, mit entity_id als Rückfallebene. */
export function entityName(entity) {
  return entity?.attributes?.friendly_name ?? entity?.entity_id?.split('.')[1] ?? '';
}

/** Domain einer entity_id: 'light.flur' -> 'light'. */
export function entityDomain(entityId) {
  const separator = entityId.indexOf('.');
  return separator === -1 ? entityId : entityId.slice(0, separator);
}
