import { useReducedMotion } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'
import type { Mood } from '../climinha/states'
import type { TemperatureUnit } from '../weather/store'
import type { Forecast } from '../weather/types'
import { detailCards, type DetailId } from './Details'

/**
 * Computador: o Climinha no centro "apresentando" o clima. Os cards de detalhe ficam
 * em volta dele e ele vai visitá-los — sozinho, num passeio de tempos em tempos, ou
 * quando o mouse passa por um card — reagindo ao que cada um mostra.
 */

const LEFT: DetailId[] = ['uv', 'feels', 'humidity']
const RIGHT: DetailId[] = ['wind', 'precip', 'sun']
const TOUR: DetailId[] = ['uv', 'wind', 'feels', 'precip', 'humidity', 'sun']

/** tempo ao lado do card e tempo de volta no centro, no passeio (ms) */
const STAY_MS = 3800
const REST_MS = 4200

export interface VisitReaction {
  mood?: Mood
  effect?: 'sweat' | 'drip'
  /** vento: o corpo é soprado para o lado */
  gust?: boolean
  /** para onde olhar: -1 esquerda … 1 direita, -1 cima … 1 baixo */
  look?: { x: number; y: number }
}

/** Como o Climinha reage ao card que está visitando. */
export function reactionFor(id: DetailId, f: Forecast): VisitReaction {
  const c = f.current
  const today = f.daily[0]
  switch (id) {
    case 'uv': {
      const uv = c.isDay ? c.uv : 0
      // sol forte: aperta os olhos; fraco: feliz; à noite: só olha
      return uv >= 3 ? { mood: 'squint', look: { x: 0, y: -0.8 } } : { mood: c.isDay ? 'happy' : 'neutral' }
    }
    case 'feels':
      if (c.apparent >= 30) return { mood: 'hot', effect: 'sweat' }
      if (c.apparent < 16) return { mood: 'cold' }
      return { mood: 'happy' }
    case 'humidity':
      return c.humidity >= 70 ? { mood: 'hot', effect: 'sweat' } : { mood: 'neutral', look: { x: 0, y: 0.6 } }
    case 'precip':
      return (today?.precipSum ?? 0) > 0.2 || f.daily[1]?.precipSum > 0.5
        ? { mood: 'bored', effect: 'drip', look: { x: 0, y: 0.7 } }
        : { mood: 'happy' }
    case 'wind':
      return c.windSpeed >= 8 ? { mood: 'squint', gust: true } : { mood: 'neutral' }
    case 'sun':
      return { mood: c.isDay ? 'happy' : 'sleepy', look: { x: 0, y: -0.6 } }
  }
}

interface Props {
  forecast: Forecast
  unit: TemperatureUnit
  /** o hero (cidade, temperatura, lugar do Climinha, condição) */
  hero: ReactNode
  /** card que o Climinha está visitando (null = no centro) */
  visit: DetailId | null
  onVisit: (id: DetailId | null) => void
}

export function OrbitStage({ forecast, unit, hero, visit, onVisit }: Props) {
  const reduced = useReducedMotion() ?? false
  const cards = detailCards({ forecast, unit, order: 0, reveal: false })
  const hovering = useRef(false)

  // passeio: visita um card, volta ao centro, visita o próximo… (pausa enquanto o mouse está num card)
  useEffect(() => {
    if (reduced) return
    let step = 0
    let timer = 0
    const next = (atCard: boolean) => {
      timer = window.setTimeout(
        () => {
          if (hovering.current) return next(atCard)
          if (atCard) onVisit(null)
          else onVisit(TOUR[step++ % TOUR.length])
          next(!atCard)
        },
        atCard ? STAY_MS : REST_MS,
      )
    }
    next(false)
    return () => {
      window.clearTimeout(timer)
      onVisit(null)
    }
  }, [reduced, onVisit])

  const side = (ids: DetailId[], which: 'left' | 'right') => (
    <div className={`orbit__side orbit__side--${which}`}>
      {ids.map((id) =>
        cards[id] ? (
          <div
            key={id}
            className="orbit__slot"
            data-orbit-card={id}
            data-side={which}
            data-active={visit === id || undefined}
            onPointerEnter={() => {
              hovering.current = true
              onVisit(id)
            }}
            onPointerLeave={() => {
              hovering.current = false
              onVisit(null)
            }}
          >
            {cards[id]}
          </div>
        ) : null,
      )}
    </div>
  )

  return (
    <section className="orbit">
      {side(LEFT, 'left')}
      <div className="orbit__center">{hero}</div>
      {side(RIGHT, 'right')}
    </section>
  )
}
