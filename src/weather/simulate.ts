import { REPRESENTATIVE_CODE, isWet } from './conditions'
import type { Forecast, WeatherKind } from './types'

export interface Simulation {
  kind: WeatherKind
  isDay: boolean
}

/** Lê ?weather=storm&night=1 — usado para revisar todos os ambientes. */
export function simulationFromUrl(): Simulation | null {
  const params = new URLSearchParams(window.location.search)
  const kind = params.get('weather') as WeatherKind | null
  if (!kind || !(kind in REPRESENTATIVE_CODE)) return null
  return { kind, isDay: params.get('night') !== '1' }
}

/** Sobrepõe a condição atual mantendo o resto da previsão real. */
export function applySimulation(forecast: Forecast, sim: Simulation): Forecast {
  const code = REPRESENTATIVE_CODE[sim.kind]
  const wet = isWet(sim.kind)
  const hourly = forecast.hourly.map((h, i) =>
    i < 3 ? { ...h, code, kind: sim.kind, isDay: i === 0 ? sim.isDay : h.isDay, precipProbability: wet ? 80 - i * 10 : h.precipProbability } : h,
  )
  // chuva prevista começando em ~35 min, para exercitar a linha do tempo
  const nowcast = forecast.nowcast.map((n, i) => ({
    ...n,
    precipitation: wet ? (i < 2 ? 0 : Math.min(3, 0.4 + (i - 2) * (sim.kind === 'rain' ? 0.25 : 0.55))) : 0,
  }))
  const daily = forecast.daily.map((d, i) => (i === 0 ? { ...d, code, kind: sim.kind, precipProbability: wet ? 85 : d.precipProbability } : d))
  return {
    ...forecast,
    current: { ...forecast.current, code, kind: sim.kind, isDay: sim.isDay, precipitation: 0 },
    hourly,
    daily,
    nowcast,
  }
}
