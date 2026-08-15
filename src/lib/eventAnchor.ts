/**
 * Card permalinks. Hashes are `event-${ConflictEvent.id}`.
 * Copied URLs omit `?q=&tag=` so a later reader still sees the event.
 */

export function eventCardId(eventId: string): string {
  return `event-${eventId}`
}

/** Returns a card element id, or undefined for year hashes and empty fragments. */
export function readEventHash(hash: string): string | undefined {
  const id = hash.startsWith('#') ? hash.slice(1) : hash
  if (!id.startsWith('event-')) return undefined
  return decodeURIComponent(id)
}

export function eventPermalink(
  cardId: string,
  origin: string,
  pathname: string,
): string {
  return `${origin}${pathname}#${cardId}`
}
