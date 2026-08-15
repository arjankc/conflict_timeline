import { describe, expect, it } from 'vitest'
import { showToast, subscribeToast } from './toast'

describe('toast', () => {
  it('delivers a message to subscribers and stops after unsubscribe', () => {
    const seen: string[] = []
    const unsubscribe = subscribeToast((message) => {
      seen.push(message)
    })
    showToast('Link to this event copied to the clipboard')
    expect(seen).toEqual(['Link to this event copied to the clipboard'])
    unsubscribe()
    showToast('ignored')
    expect(seen).toEqual(['Link to this event copied to the clipboard'])
  })
})
