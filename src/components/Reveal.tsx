import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import { useRef, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  /** atraso relativo dentro de uma linha (0…1): itens à direita chegam um pouco depois */
  lag?: number
}

/**
 * Revelação ligada ao scroll: o bloco começa invisível abaixo da dobra e vai
 * aparecendo enquanto entra na tela — sobe, cresce e perde o desfoque.
 * Rolar de volta desfaz o movimento.
 */
export function Reveal({ children, className, lag = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion() ?? false
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: [`start ${1 - lag * 0.06}`, `start ${0.68 - lag * 0.06}`],
  })
  const p = useSpring(scrollYProgress, { stiffness: 220, damping: 32, mass: 0.6 })
  const opacity = useTransform(p, [0, 1], [0, 1])
  const y = useTransform(p, [0, 1], [56, 0])
  const scale = useTransform(p, [0, 1], [0.93, 1])
  const blur = useTransform(p, [0, 0.7, 1], [10, 2, 0])
  const filter = useTransform(blur, (b) => (b < 0.2 ? 'none' : `blur(${b.toFixed(1)}px)`))

  return (
    <motion.div
      ref={ref}
      className={className}
      style={reduced ? { opacity } : { opacity, y, scale, filter }}
    >
      {children}
    </motion.div>
  )
}
