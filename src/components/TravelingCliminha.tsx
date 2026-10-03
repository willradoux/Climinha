import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  type MotionValue,
} from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { Climinha, type CliminhaPhase } from '../climinha/Climinha'
import type { CliminhaState, Mood } from '../climinha/states'
import { motionTokens } from '../theme/motion'
import type { VisitReaction } from './Orbit'

/**
 * O Climinha que acompanha a interface.
 *  - topo: ocupa o lugar reservado no hero
 *  - rolando: se solta e pousa em cima da barra de navegação, centralizado
 *  - arrastando entre cidades: fica centralizado, acompanha o gesto só de leve e
 *    inclina o corpo com a inércia (a tela é que vai para o lado)
 * A velocidade do scroll inclina e estica o corpo; molas dão o atraso de nuvem.
 */

const RATIO = 182 / 240
const DOCK_TRAVEL = 0.6 // fração da altura da tela até ele pousar na barra
const SWIPE_FOLLOW = 0.18 // quanto do arraste ele acompanha (o resto vira inclinação)

interface Geometry {
  // âncora no documento (scroll = 0, página sem deslocamento lateral)
  anchorX: number
  anchorY: number
  anchorW: number
  vw: number
  vh: number
  navTop: number
}

interface Props {
  anchorRef: RefObject<HTMLDivElement | null>
  state: CliminhaState
  phase: CliminhaPhase
  moodOverride?: Mood
  /** troca de cidade: remede a âncora */
  layoutKey: string
  /** avisado quando já está posicionado — a intro pode soltar o personagem dela */
  onReady?: () => void
  /** personagem da intro: o voo começa exatamente de onde ele está */
  fromRef?: RefObject<HTMLDivElement | null>
  /** deslocamento do arraste entre cidades */
  swipeX?: MotionValue<number>
  /** computador: card que ele está visitando (null = no centro) */
  visit?: string | null
  /** como reagir ao card visitado */
  reaction?: VisitReaction | null
}

export function TravelingCliminha({
  anchorRef,
  state,
  phase,
  moodOverride,
  layoutKey,
  onReady,
  fromRef,
  swipeX,
  visit = null,
  reaction = null,
}: Props) {
  const reduced = useReducedMotion() ?? false
  const { scrollY } = useScroll()
  const [geo, setGeo] = useState<Geometry | null>(null)

  const fallbackSwipe = useMotionValue(0)
  const swipe = swipeX ?? fallbackSwipe

  // --- medidas ---------------------------------------------------------------
  useLayoutEffect(() => {
    const measure = () => {
      const el = anchorRef.current
      if (!el) return
      // posição de layout (offsetLeft/Top ignoram transforms): a página pode estar
      // deslocada pelo arraste ou no meio de uma animação quando medimos
      let left = 0
      let top = 0
      for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) {
        left += n.offsetLeft
        top += n.offsetTop
      }
      const nav = document.querySelector('.floatnav')?.getBoundingClientRect()
      setGeo({
        anchorX: left,
        anchorY: top,
        anchorW: el.offsetWidth,
        vw: window.innerWidth,
        vh: window.innerHeight,
        navTop: nav ? nav.top : window.innerHeight - 80,
      })
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (anchorRef.current) ro.observe(anchorRef.current)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [anchorRef, layoutKey])

  // --- posição alvo a partir do scroll ----------------------------------------
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const rawScale = useMotionValue(1)
  const progress = useMotionValue(0)

  const landed = useRef(false)
  const [landing, setLanding] = useState(false)
  const x = useSpring(rawX, motionTokens.climinha.follow)
  const y = useSpring(rawY, motionTokens.climinha.follow)
  const scale = useSpring(rawScale, motionTokens.climinha.follow)

  useLayoutEffect(() => {
    if (!geo) return
    const heroW = geo.anchorW
    const travel = Math.max(1, geo.vh * DOCK_TRAVEL)
    // pousado em cima da barra, centralizado
    const dw = geo.vw >= 1024 ? 76 : 58
    const dx = geo.vw / 2 - dw / 2
    const dy = geo.navTop - dw * RATIO + 10

    const place = (s: number, first: boolean) => {
      const p = Math.min(1, Math.max(0, s / travel))
      const e = p * p * (3 - 2 * p) // smoothstep
      const hx = geo.anchorX
      const hy = geo.anchorY - s
      let tx = hx + (dx - hx) * e
      let ty = hy + (dy - hy) * e
      let ts = (heroW + (dw - heroW) * e) / heroW

      // visitando um card (só no topo da página): voa até o lado interno do card, menor
      const card = visit && e < 0.15 ? document.querySelector<HTMLElement>(`[data-orbit-card="${visit}"]`) : null
      if (card) {
        const r = card.getBoundingClientRect()
        const vwid = Math.min(heroW * 0.6, 150)
        const vhgt = vwid * RATIO
        tx = card.dataset.side === 'left' ? r.right + 10 : r.left - vwid - 10
        ty = r.top + r.height / 2 - vhgt * 0.55
        ts = vwid / heroW
      }

      rawX.set(tx)
      rawY.set(ty)
      rawScale.set(ts)
      progress.set(e)

      if (reduced) {
        x.jump(tx)
        y.jump(ty)
        scale.jump(ts)
        return
      }
      if (!first || landed.current) return
      landed.current = true
      // vindo da intro: começa no tamanho/posição do close-up e encolhe devagar até o hero
      const from = fromRef?.current?.getBoundingClientRect()
      if (from && from.width > 0) {
        x.jump(from.left)
        y.jump(from.top)
        scale.jump(from.width / heroW)
        const t = motionTokens.climinha.landing
        void animate(x, tx, t)
        void animate(y, ty, t)
        void animate(scale, ts, t)
        setLanding(true)
        // a camada alta vale só durante o voo — por tempo, sem depender do fim da animação
        window.setTimeout(() => setLanding(false), 1600)
      } else {
        x.jump(tx)
        y.jump(ty)
        scale.jump(ts)
      }
    }

    place(window.scrollY, true)
    return scrollY.on('change', (s) => place(s, false))
  }, [geo, scrollY, reduced, rawX, rawY, rawScale, progress, x, y, scale, fromRef, visit])

  // --- arraste: acompanha só de leve; a velocidade do gesto vira inércia no corpo ---
  const screenX = useTransform(() => x.get() + swipe.get() * SWIPE_FOLLOW)
  const lateralVelocity = useVelocity(screenX)
  const leanRaw = useTransform(lateralVelocity, [-1800, 0, 1800], [-1, 0, 1], { clamp: true })
  // mola pouco amortecida: depois de parar ele ainda balança um pouco, como gelatina
  const springLean = useSpring(leanRaw, motionTokens.climinha.jelly)
  // vento: rajadas sopram o corpo para o lado enquanto ele visita o card de vento
  const gust = useMotionValue(0)
  useEffect(() => {
    if (reduced || !reaction?.gust) {
      const c = animate(gust, 0, { duration: 0.6 })
      return () => c.stop()
    }
    const c = animate(gust, [0, 0.9, 0.45, 1, 0.55, 0.85, 0.4], { duration: 2.6, repeat: Infinity, ease: 'easeInOut' })
    return () => c.stop()
  }, [reaction?.gust, reduced, gust])
  const lean = useTransform(() => springLean.get() + gust.get())

  // --- inclinação e esticada pela velocidade do scroll ----------------------
  const velocity = useVelocity(scrollY)
  const tiltRaw = useTransform(velocity, [-2400, 0, 2400], [7, 0, -7], { clamp: true })
  const stretchRaw = useTransform(velocity, [-2400, 0, 2400], [1.06, 1, 1.06], { clamp: true })
  const rotate = useSpring(tiltRaw, motionTokens.climinha.soft)
  const scaleY = useSpring(stretchRaw, motionTokens.climinha.soft)
  const scaleX = useTransform(scaleY, (v) => 2 - v)

  // --- olhar: cursor no topo; pousado na barra, olha para o conteúdo acima -----
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  useEffect(() => {
    if (reduced || !window.matchMedia('(pointer: fine)').matches) return
    const onMove = (e: PointerEvent) => {
      pointerX.set(Math.max(-1, Math.min(1, (e.clientX / window.innerWidth - 0.5) * 2)) * 0.8)
      pointerY.set(Math.max(-1, Math.min(1, (e.clientY / window.innerHeight - 0.35) * 2)) * 0.5)
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [reduced, pointerX, pointerY])

  const visitSide = visit ? document.querySelector<HTMLElement>(`[data-orbit-card="${visit}"]`)?.dataset.side : null
  const visitLookX = reaction?.look?.x ?? (visitSide === 'left' ? -0.9 : visitSide === 'right' ? 0.9 : 0)
  const visitLookY = reaction?.look?.y ?? 0.1
  const visiting = useSpring(visit ? 1 : 0, { stiffness: 120, damping: 20 })
  useEffect(() => {
    visiting.set(visit ? 1 : 0)
  }, [visit, visiting])
  const lookX = useTransform(() => {
    const e = progress.get()
    // arrastando, olha para onde a tela vai
    const drag = Math.max(-1, Math.min(1, -swipe.get() / 300))
    const base = pointerX.get() * (1 - e) * 0.6 + drag * 0.8 + pointerX.get() * 0.4
    const v = visiting.get()
    return base * (1 - v) + visitLookX * v
  })
  const lookY = useTransform(() => {
    const e = progress.get()
    const dir = Math.max(-0.4, Math.min(0.4, velocity.get() / 3000))
    const base = pointerY.get() * (1 - e) + (-0.45 + dir) * e
    const v = visiting.get()
    return base * (1 - v) + visitLookY * v
  })

  const ready = !!geo
  useEffect(() => {
    if (ready) onReady?.()
  }, [ready, onReady])

  if (!geo) return null

  return (
    <motion.div
      className="traveler"
      // pousando: por cima do céu da intro (que ainda está sumindo); depois volta para baixo da barra
      style={{ x: screenX, y, scale, width: geo.anchorW, originX: 0, originY: 0, zIndex: landing ? 101 : 15 }}
    >
      <motion.div style={reduced ? undefined : { rotate, scaleY, scaleX, originY: 1 }}>
        <motion.div
          style={{ originY: 1 }}
          initial={false}
          animate={landing ? { scaleY: [1, 1.06, 0.93, 1], scaleX: [1, 0.96, 1.05, 1] } : undefined}
          transition={{ duration: 1.3, times: [0, 0.45, 0.82, 1], ease: 'easeInOut' }}
          onAnimationComplete={() => setLanding(false)}
        >
          <Climinha
            state={state}
            phase={phase}
            size="100%"
            lookX={lookX}
            lookY={lookY}
            moodOverride={reaction?.mood ?? moodOverride}
            effect={reaction?.effect}
            lean={lean}
            perceive
            onTap={() => {}}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
