/**
 * Identificadores únicos.
 *
 * Antes se usaban plantillas tipo `act-${Date.now()}`: crear dos elementos en el
 * mismo milisegundo (o duplicar un plan justo después de crearlo) generaba IDs
 * repetidos y, con ellos, claves duplicadas en React.
 */
export function createId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${prefix}-${uuid}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
