import { useCallback, useEffect, useRef, useState } from 'react'

// Boolean flag that auto-resets to false after `durationMs`. Used for
// "saved!" / "copied!" style toasts that need to show briefly then hide.
export function useTimedFlag(durationMs: number): [boolean, () => void] {
  const [flag, setFlag] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const trigger = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setFlag(true)
    timeoutRef.current = setTimeout(() => setFlag(false), durationMs)
  }, [durationMs])

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }, [])

  return [flag, trigger]
}
