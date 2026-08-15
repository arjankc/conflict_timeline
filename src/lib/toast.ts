type ToastListener = (message: string) => void

const listeners = new Set<ToastListener>()

/** Show a short status toast. `Toast` in App must be mounted. */
export function showToast(message: string): void {
  for (const listen of listeners) listen(message)
}

export function subscribeToast(listener: ToastListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
