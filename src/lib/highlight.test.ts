import { describe, expect, it } from 'vitest'
import { splitHighlight } from './highlight'

describe('splitHighlight', () => {
  it('returns the original string when the query is empty', () => {
    expect(splitHighlight('Talks in Kathmandu', '  ')).toEqual([
      { text: 'Talks in Kathmandu', match: false },
    ])
  })

  it('marks case-insensitive matches without eating the rest', () => {
    expect(splitHighlight('Talks in Kathmandu and kathmandu', 'kathmandu')).toEqual([
      { text: 'Talks in ', match: false },
      { text: 'Kathmandu', match: true },
      { text: ' and ', match: false },
      { text: 'kathmandu', match: true },
    ])
  })

  it('treats regex metacharacters as literal text', () => {
    expect(splitHighlight('Cost is (est.) 2+2', '(est.)')).toEqual([
      { text: 'Cost is ', match: false },
      { text: '(est.)', match: true },
      { text: ' 2+2', match: false },
    ])
  })
})
