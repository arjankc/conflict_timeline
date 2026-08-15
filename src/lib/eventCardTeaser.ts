export const MOBILE_TAG_LIMIT = 3
export const DESKTOP_TAG_LIMIT = 5
export const DESKTOP_TEASER_MIN_WIDTH_PX = 640

export type MetaPillKind = 'keyword' | 'category' | 'organization'

export type MetaPill = {
  kind: MetaPillKind
  label: string
}

export function metadataPills(event: {
  keywords: string[]
  categories: string[]
  organizations: string[]
}): MetaPill[] {
  return [
    ...event.keywords.map((label) => ({ kind: 'keyword' as const, label })),
    ...event.categories.map((label) => ({ kind: 'category' as const, label })),
    ...event.organizations.map((label) => ({ kind: 'organization' as const, label })),
  ]
}

function pillKey(pill: MetaPill): string {
  return `${pill.kind}:${pill.label.toLowerCase()}`
}

/**
 * First `limit` pills while collapsed. A selected filter that would be hidden
 * replaces the last unselected visible pill so the active chip stays on the card.
 */
export function pickVisiblePills(
  pills: MetaPill[],
  limit: number,
  expanded: boolean,
  selected: (pill: MetaPill) => boolean,
): { visible: MetaPill[]; hiddenCount: number } {
  if (expanded || pills.length <= limit) {
    return { visible: pills, hiddenCount: 0 }
  }

  const visible = pills.slice(0, limit)
  const visibleKeys = new Set(visible.map(pillKey))

  for (const pill of pills) {
    if (!selected(pill) || visibleKeys.has(pillKey(pill))) continue
    let replaceAt = -1
    for (let index = visible.length - 1; index >= 0; index -= 1) {
      if (!selected(visible[index])) {
        replaceAt = index
        break
      }
    }
    if (replaceAt < 0) break
    visibleKeys.delete(pillKey(visible[replaceAt]))
    visible[replaceAt] = pill
    visibleKeys.add(pillKey(pill))
  }

  return { visible, hiddenCount: pills.length - visible.length }
}
