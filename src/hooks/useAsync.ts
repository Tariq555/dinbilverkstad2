import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '@/services/api'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

/**
 * Laddar data från IPC-bryggan och håller reda på laddnings- och felläge.
 * Svar från ett anrop som hunnit bli inaktuellt kastas bort.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]): AsyncState<T> & {
  reload: () => void
  setData: (value: T) => void
} {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null })
  const requestId = useRef(0)
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  const run = useCallback(() => {
    const id = ++requestId.current
    setState((current) => ({ ...current, loading: true, error: null }))

    loaderRef
      .current()
      .then((data) => {
        if (id === requestId.current) setState({ data, loading: false, error: null })
      })
      .catch((error: unknown) => {
        if (id === requestId.current) {
          setState({ data: null, loading: false, error: errorMessage(error) })
        }
      })
  }, [])

  useEffect(run, deps) // eslint-disable-line react-hooks/exhaustive-deps

  const setData = useCallback((value: T) => {
    setState({ data: value, loading: false, error: null })
  }, [])

  return { ...state, reload: run, setData }
}

/** Fördröjer ett värde — används för sökfält så att varje tangenttryck inte träffar databasen. */
export function useDebounced<T>(value: T, delayMs = 220): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
