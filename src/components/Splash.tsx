import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState, type CSSProperties, type RefObject } from 'react'
import { Climinha } from '../climinha/Climinha'
import type { CliminhaState, Mood } from '../climinha/states'

/**
 * Intro: o Climinha passa bem perto da tela, enorme, como uma nuvem atravessando
 * o céu — olhos abertos. Depois dá uma piscadinha feliz e voa até o lugar dele
 * na interface (o TravelingCliminha começa o voo da posição medida aqui).
 */

/** duração mínima da intro antes de liberar a interface (ms) */
export const SPLASH_MIN_MS = 2700

interface Puff {
  left: number
  top: number
  size: number
  dx: number
  dy: number
}

// névoa nas bordas, que se desfaz para fora no fim
const PUFFS: Puff[] = [
  { left: -10, top: -8, size: 60, dx: -40, dy: -30 },
  { left: 104, top: 6, size: 64, dx: 44, dy: -20 },
  { left: 100, top: 96, size: 70, dx: 40, dy: 34 },
  { left: -6, top: 104, size: 66, dx: -44, dy: 36 },
]

interface Props {
  visible: boolean
  /** o personagem da intro só sai quando o da Home já pode recebê-lo */
  characterVisible: boolean
  climinha: CliminhaState
  /** medido pelo Climinha da Home para começar o voo daqui */
  characterRef: RefObject<HTMLDivElement | null>
}

export function Splash({ visible, characterVisible, climinha, characterRef }: Props) {
  const reduced = useReducedMotion() ?? false

  // olhos abertos enquanto passa → piscadinha → feliz
  const [mood, setMood] = useState<Mood>('neutral')
  useEffect(() => {
    if (reduced) return
    const wink = window.setTimeout(() => setMood('wink'), 1750)
    const happy = window.setTimeout(() => setMood('happy'), 2200)
    return () => {
      window.clearTimeout(wink)
      window.clearTimeout(happy)
    }
  }, [reduced])

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            key="splash"
            className="splash"
            aria-hidden="true"
            initial={false}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.25 : 0.5, delay: reduced ? 0 : 0.6 }}
          >
            {/* o céu da intro sai rápido: o voo até a Home fica visível */}
            <motion.div className="splash__sky" exit={{ opacity: 0 }} transition={{ duration: reduced ? 0.2 : 0.35 }} />
            {PUFFS.map((p, i) => (
              <motion.div
                key={i}
                className="splash__puff"
                style={{ left: `${p.left}%`, top: `${p.top}%`, '--size': `${p.size}vmax` } as CSSProperties}
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.3, x: `${p.dx}vw`, y: `${p.dy}vh` }}
                transition={{ duration: reduced ? 0.2 : 1.1, ease: [0.25, 0.1, 0.25, 1] }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {characterVisible && (
        <div className="splash__stage">
          {/* deriva lateral: ele atravessa a tela devagar, como nuvem */}
          <motion.div
            className="splash__drift"
            initial={reduced ? false : { x: '26vw', y: '3vh', rotate: 3 }}
            animate={{ x: '0vw', y: '0vh', rotate: 0 }}
            transition={{ duration: 2.2, ease: [0.16, 0.84, 0.3, 1] }}
          >
            <motion.div
              ref={characterRef}
              className="splash__character"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <Climinha state={climinha} moodOverride={mood} size="100%" />
            </motion.div>
          </motion.div>
        </div>
      )}
    </>
  )
}
