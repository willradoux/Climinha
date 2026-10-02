import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchForecast } from './openMeteo'
import type { Forecast, Place } from './types'

export const DEFAULT_PLACES: Place[] = [
  { id: 'salvador', name: 'Salvador', region: 'Bahia, Brasil', latitude: -12.9711, longitude: -38.5108 },
  { id: 'sao-paulo', name: 'São Paulo', region: 'São Paulo, Brasil', latitude: -23.5505, longitude: -46.6333 },
  { id: 'curitiba', name: 'Curitiba', region: 'Paraná, Brasil', latitude: -25.4284, longitude: -49.2733 },
]

const PLACES_KEY = 'climinha:places'
const CACHE_KEY = 'climinha:forecasts'
const UNIT_KEY = 'climinha:unit'
const STALE_MS = 10 * 60 * 1000

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // armazenamento indisponível: segue só em memória
  }
}

export function usePlaces() {
  const [places, setPlaces] = useState<Place[]>(() => {
    const saved = read<Place[]>(PLACES_KEY, [])
    return saved.length ? saved : DEFAULT_PLACES
  })

  useEffect(() => write(PLACES_KEY, places), [places])

  const addPlace = useCallback((place: Place) => {
    setPlaces((list) => (list.some((p) => p.id === place.id) ? list : [...list, place]))
  }, [])

  const removePlace = useCallback((id: string) => {
    setPlaces((list) => (list.length > 1 ? list.filter((p) => p.id !== id) : list))
  }, [])

  return { places, addPlace, removePlace }
}

export interface ForecastEntry {
  data?: Forecast
  status: 'loading' | 'ready' | 'error'
}

export function useForecasts(places: Place[]) {
  const [entries, setEntries] = useState<Record<string, ForecastEntry>>(() => {
    const cache = read<Record<string, Forecast>>(CACHE_KEY, {})
    const initial: Record<string, ForecastEntry> = {}
    for (const [id, data] of Object.entries(cache)) initial[id] = { data, status: 'loading' }
    return initial
  })
  const inflight = useRef(new Map<string, AbortController>())
  const entriesRef = useRef(entries)
  useEffect(() => {
    entriesRef.current = entries
  }, [entries])

  const load = useCallback(async (place: Place, force = false) => {
    const existing = entriesRef.current[place.id]
    if (!force && existing?.status === 'ready' && existing.data && Date.now() - existing.data.fetchedAt < STALE_MS) return
    if (inflight.current.has(place.id)) return
    const controller = new AbortController()
    inflight.current.set(place.id, controller)
    setEntries((e) => ({ ...e, [place.id]: { data: e[place.id]?.data, status: 'loading' } }))
    try {
      const data = await fetchForecast(place, controller.signal)
      setEntries((e) => {
        const next = { ...e, [place.id]: { data, status: 'ready' as const } }
        const cache: Record<string, Forecast> = {}
        for (const [id, entry] of Object.entries(next)) if (entry.data) cache[id] = entry.data
        write(CACHE_KEY, cache)
        return next
      })
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      // mantém o último dado bom
      setEntries((e) => ({ ...e, [place.id]: { data: e[place.id]?.data, status: 'error' } }))
    } finally {
      inflight.current.delete(place.id)
    }
  }, [])

  useEffect(() => {
    for (const p of places) void load(p)
  }, [places, load])

  // ao voltar para o app, atualiza o que estiver velho
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) for (const p of places) void load(p)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [places, load])

  const refresh = useCallback((place: Place) => load(place, true), [load])

  return { entries, refresh }
}

export type TemperatureUnit = 'c' | 'f'

export function useUnit() {
  const [unit, setUnit] = useState<TemperatureUnit>(() => read<TemperatureUnit>(UNIT_KEY, 'c'))
  useEffect(() => write(UNIT_KEY, unit), [unit])
  return [unit, setUnit] as const
}

export function toUnit(celsius: number, unit: TemperatureUnit) {
  return Math.round(unit === 'f' ? (celsius * 9) / 5 + 32 : celsius)
}
