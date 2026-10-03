import { motion, useReducedMotion } from 'motion/react'
import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import type { TemperatureUnit } from '../weather/store'
import type { Forecast } from '../weather/types'
import { detailCards, type DetailId } from './Details'

/**
 * Computador: o Climinha no centro "apresentando" o clima. Os cards de detalhe ficam
 * em volta dele, ligados por linhas finas que saem do corpo dele; a linha do card sob o
 * mouse se acende (e ele já olha para o mouse).
 */

const LEFT: DetailId[] = ['uv', 'feels', 'humidity']
const RIGHT: DetailId[] = ['wind', 'precip', 'sun']

interface Props {
  forecast: Forecast
  unit: TemperatureUnit
  /** o hero (cidade, temperatura, lugar do Climinha, condição) */
  hero: ReactNode
  /** lugar reservado do Climinha dentro do hero */
  anchorRef: RefObject<HTMLDivElement | null>
}

export function OrbitStage({ forecast, unit, hero, anchorRef }: Props) {
  const cards = detailCards({ forecast, unit, order: 0, reveal: false })
  const [hovered, setHovered] = useState<DetailId | null>(null)

  const side = (ids: DetailId[], which: 'left' | 'right') => (
    <div className={`orbit__side orbit__side--${which}`}>
      {ids.map((id) =>
        cards[id] ? (
          <div
            key={id}
            className="orbit__slot"
            data-orbit-card={id}
            data-active={hovered === id || undefined}
            onPointerEnter={() => setHovered(id)}
            onPointerLeave={() => setHovered((h) => (h === id ? null : h))}
          >
            {cards[id]}
          </div>
        ) : null,
      )}
    </div>
  )

  return (
    <section className="orbit">
      <OrbitLines anchorRef={anchorRef} hovered={hovered} />
      {side(LEFT, 'left')}
      <div className="orbit__center">{hero}</div>
      {side(RIGHT, 'right')}
    </section>
  )
}

interface Line {
  id: string
  d: string
}

/** Linhas do corpo do Climinha até a borda interna de cada card. */
function OrbitLines({ anchorRef, hovered }: { anchorRef: RefObject<HTMLDivElement | null>; hovered: string | null }) {
  // o palco é o pai do próprio <svg>: o ref do svg já existe quando este efeito roda
  // (o ref do palco ainda não — por isso as linhas não apareciam)
  const svgRef = useRef<SVGSVGElement>(null)
  const reduced = useReducedMotion() ?? false
  const [lines, setLines] = useState<Line[]>([])
  const [size, setSize] = useState({ w: 0, h: 0 })

  useLayoutEffect(() => {
    const stage = svgRef.current?.parentElement
    if (!stage) return
    const measure = () => {
      const anchor = anchorRef.current
      if (!anchor) return
      const s = stage.getBoundingClientRect()
      const a = anchor.getBoundingClientRect()
      // centro do corpo (o desenho tem folga embaixo para a sombra)
      const cx = a.left - s.left + a.width / 2
      const cy = a.top - s.top + a.height * 0.47
      const bodyHalf = a.width * 0.44
      const next: Line[] = []
      stage.querySelectorAll<HTMLElement>('[data-orbit-card]').forEach((el) => {
        const r = el.getBoundingClientRect()
        const isLeft = r.right - s.left < cx
        const x2 = isLeft ? r.right - s.left : r.left - s.left
        const y2 = r.top - s.top + r.height / 2
        const x1 = cx + (isLeft ? -bodyHalf : bodyHalf)
        const y1 = cy + (y2 - cy) * 0.18
        const mx = (x1 + x2) / 2
        next.push({ id: el.dataset.orbitCard ?? '', d: `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}` })
      })
      setLines(next)
      setSize({ w: s.width, h: s.height })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(stage)
    window.addEventListener('resize', measure)
    // a fonte e os dados podem mudar a altura dos cards logo depois da montagem
    const t = window.setTimeout(measure, 600)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
      window.clearTimeout(t)
    }
  }, [anchorRef])

  return (
    <svg ref={svgRef} className="orbit__lines" width={size.w} height={size.h} aria-hidden="true">
      {lines.map((l, i) => (
        <motion.path
          key={l.id}
          d={l.d}
          className="orbit__line"
          data-active={hovered === l.id || undefined}
          initial={reduced ? false : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.5 + i * 0.08, ease: [0.2, 0.8, 0.2, 1] }}
        />
      ))}
    </svg>
  )
}
