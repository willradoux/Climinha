import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useLayoutEffect, useState, type RefObject } from 'react'
import { motionTokens } from '../theme/motion'

/**
 * Tutorial do Climinha (computador, primeira visita): um balão ao lado dele
 * explicando que dá para pegar e jogar. Some sozinho quando a pessoa pega ele.
 */

const STEPS = [
  { title: 'Oi! Eu sou o Climinha.', text: 'Eu mostro o clima de onde você está, em tempo real.', cta: 'Próximo' },
  { title: 'Pode me pegar.', text: 'Me arraste com o mouse e solte rápido: eu voo. Só não abusa…', cta: 'Entendi' },
]

interface Props {
  open: boolean
  anchorRef: RefObject<HTMLDivElement | null>
  onDone: () => void
}

export function Tutorial({ open, anchorRef, onDone }: Props) {
  const reduced = useReducedMotion() ?? false
  const [step, setStep] = useState(0)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const r = anchorRef.current?.getBoundingClientRect()
      if (r) setPos({ left: r.right + 18, top: r.top + r.height * 0.12 })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, { passive: true })
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place)
    }
  }, [open, anchorRef])

  const s = STEPS[step]
  return (
    <AnimatePresence>
      {open && pos && (
        <motion.div
          className="tutorial glass"
          role="dialog"
          aria-label="Tutorial do Climinha"
          style={{ left: pos.left, top: pos.top, originX: 0, originY: 0.3 }}
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.9, x: -8 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
          transition={motionTokens.system.menu}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
            >
              <p className="tutorial__title">{s.title}</p>
              <p className="tutorial__text">{s.text}</p>
              {step === 1 && !reduced && <DragHint />}
            </motion.div>
          </AnimatePresence>
          <div className="tutorial__footer">
            <span className="tutorial__dots" aria-hidden="true">
              {STEPS.map((_, i) => (
                <span key={i} data-on={i === step || undefined} />
              ))}
            </span>
            <button
              type="button"
              className="tutorial__cta"
              onClick={() => {
                if (step < STEPS.length - 1) setStep(step + 1)
                else onDone()
              }}
            >
              {s.cta}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** mãozinha arrastando e soltando, em loop */
function DragHint() {
  return (
    <svg viewBox="0 0 160 44" className="tutorial__hint" aria-hidden="true">
      <path d="M 18 30 Q 70 2 142 22" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="3 5" />
      <motion.g
        animate={{ x: [0, 0, 118, 124], y: [0, 0, -10, -6], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 2.2, times: [0, 0.15, 0.75, 1], repeat: Infinity, repeatDelay: 0.6, ease: 'easeInOut' }}
      >
        <circle cx="18" cy="30" r="7" fill="currentColor" fillOpacity="0.9" />
        <circle cx="18" cy="30" r="11" fill="none" stroke="currentColor" strokeOpacity="0.4" />
      </motion.g>
    </svg>
  )
}
