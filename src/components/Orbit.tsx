import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import type { TemperatureUnit } from '../weather/store'
import type { Forecast } from '../weather/types'
import { detailCards, type DetailId } from './Details'

/**
 * Computador: o Climinha no centro, os cards de detalhe em volta dele.
 * Quando alguém joga ele longe vezes demais, ele fica bravo e "come" cards —
 * o card é sugado na direção dele e some; quando se acalma, devolve.
 */

const LEFT: DetailId[] = ['uv', 'feels', 'humidity']
const RIGHT: DetailId[] = ['wind', 'precip', 'sun']
export const ORBIT_CARDS: DetailId[] = [...LEFT, ...RIGHT]

interface Props {
  forecast: Forecast
  unit: TemperatureUnit
  /** o hero (cidade, temperatura, lugar do Climinha, condição) */
  hero: ReactNode
  /** cards que ele já comeu (o lugar fica vazio) */
  eaten: DetailId[]
  /** card sendo sugado agora */
  eating: DetailId | null
}

export function OrbitStage({ forecast, unit, hero, eaten, eating }: Props) {
  const reduced = useReducedMotion() ?? false
  const cards = detailCards({ forecast, unit, order: 0, reveal: false })

  const side = (ids: DetailId[], which: 'left' | 'right') => (
    <div className={`orbit__side orbit__side--${which}`}>
      {ids.map((id) => {
        if (!cards[id]) return null
        const gone = eaten.includes(id)
        const beingEaten = eating === id
        // sugado na direção do Climinha (que está ao lado, do lado de dentro)
        const toward = which === 'left' ? 140 : -140
        return (
          <div key={id} className="orbit__slot" data-orbit-card={id} data-side={which}>
            <AnimatePresence initial={false}>
              {!gone && (
                <motion.div
                  key="card"
                  initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.4, x: toward * 0.6 }}
                  animate={
                    beingEaten && !reduced
                      ? { opacity: 0.9, scale: [1, 1.04, 0.6], x: [0, -8, toward * 0.4], rotate: which === 'left' ? 4 : -4 }
                      : { opacity: 1, scale: 1, x: 0, rotate: 0 }
                  }
                  exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.05, x: toward, rotate: which === 'left' ? 18 : -18 }}
                  transition={
                    beingEaten
                      ? { duration: 0.5, ease: 'easeIn' }
                      : { type: 'spring', stiffness: 320, damping: 18, mass: 0.8 }
                  }
                  style={{ originX: which === 'left' ? 1 : 0 }}
                >
                  {cards[id]}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
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
