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
  try {
    return decodeURIComponent(id)
  } catch {
    return undefined
  }
}

export function eventPermalink(
  cardId: string,
  origin: string,
  pathname: string,
): string {
  return `${origin}${pathname}#${cardId}`
}

/** Current page with an event hash, keeping `?q=` filters. Does not scroll. */
export function pageUrlWithEventHash(
  pathname: string,
  search: string,
  cardId: string,
): string {
  return `${pathname}${search}#${cardId}`
}
