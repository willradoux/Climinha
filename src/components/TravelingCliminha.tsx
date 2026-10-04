import {
  animate,
  motion,
  useAnimationControls,
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

/**
 * O Climinha que acompanha a interface.
 *  - topo: ocupa o lugar reservado no hero
 *  - rolando: se solta e pousa em cima da barra de navegação, centralizado
 *  - arrastando entre cidades: fica centralizado, acompanha o gesto só de leve e
 *    inclina o corpo com a inércia (a tela é que vai para o lado)
 *  - computador: dá para pegar, arrastar e jogar ele longe (física de nuvem:
 *    freia no ar e quica nas bordas da tela); depois ele volta para o lugar
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
  /** 0…1: raiva */
  fury?: number
  /** computador: dá para pegar, arrastar e jogar */
  throwable?: boolean
  onGrab?: () => void
  onThrow?: () => void
  /** parou de voar depois de um arremesso */
  onSettle?: () => void
  /** saiu do lugar / voltou (a sombra espera no centro) */
  onAway?: (away: boolean) => void
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
  fury = 0,
  throwable = false,
  onGrab,
  onThrow,
  onSettle,
  onAway,
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

  // --- pegar, arrastar e jogar ------------------------------------------------
  // free = 1: posição livre (fx, fy); ret 0→1 mistura de volta para a âncora
  const free = useMotionValue(0)
  const ret = useMotionValue(0)
  const fx = useMotionValue(0)
  const fy = useMotionValue(0)
  const outX = useTransform(() => (free.get() ? fx.get() + (screenX.get() - fx.get()) * ret.get() : screenX.get()))
  const outY = useTransform(() => (free.get() ? fy.get() + (y.get() - fy.get()) * ret.get() : y.get()))
  const [grip, setGrip] = useState<'none' | 'held' | 'flying'>('none')
  const dragState = useRef<{ offX: number; offY: number; samples: [number, number, number][]; moved: boolean } | null>(null)
  const physicsRaf = useRef(0)
  const returning = useRef<{ stop: () => void } | null>(null)
  const impact = useAnimationControls()

  const returnHome = () => {
    returning.current?.stop()
    ret.set(0)
    returning.current = animate(ret, 1, {
      duration: 0.9,
      ease: [0.3, 0, 0.2, 1],
      onComplete: () => {
        free.set(0)
        ret.set(0)
        onAway?.(false)
      },
    })
  }

  const fling = (startVx: number, startVy: number) => {
    let vx = startVx
    let vy = startVy
    const w = (geo?.anchorW ?? 200) * scale.get()
    const h = w * RATIO
    let last = performance.now()
    const step = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000)
      last = now
      // o ar freia aos poucos: nuvem não cai, desliza e para
      const airDrag = Math.exp(-1.5 * dt)
      vx *= airDrag
      vy *= airDrag
      let nx = fx.get() + vx * dt
      let ny = fy.get() + vy * dt
      const maxX = window.innerWidth - w * 0.9
      const maxY = window.innerHeight - h
      if (nx < -w * 0.1 || nx > maxX) {
        nx = Math.max(-w * 0.1, Math.min(maxX, nx))
        vx = -vx * 0.6
        void impact.start({ scaleX: [1, 0.8, 1.08, 1], scaleY: [1, 1.18, 0.95, 1], transition: { duration: 0.45 } })
      }
      if (ny < 0 || ny > maxY) {
        ny = Math.max(0, Math.min(maxY, ny))
        vy = -vy * 0.6
        void impact.start({ scaleX: [1, 1.2, 0.94, 1], scaleY: [1, 0.8, 1.06, 1], transition: { duration: 0.45 } })
      }
      fx.set(nx)
      fy.set(ny)
      if (Math.hypot(vx, vy) < 45) {
        setGrip('none')
        window.setTimeout(() => {
          onSettle?.()
          returnHome()
        }, 450)
        return
      }
      physicsRaf.current = requestAnimationFrame(step)
    }
    physicsRaf.current = requestAnimationFrame(step)
  }

  useEffect(() => () => cancelAnimationFrame(physicsRaf.current), [])

  const onPointerDown = (e: React.PointerEvent) => {
    if (!throwable || reduced || e.button !== 0) return
    cancelAnimationFrame(physicsRaf.current)
    returning.current?.stop()
    fx.set(outX.get())
    fy.set(outY.get())
    ret.set(0)
    free.set(1)
    dragState.current = {
      offX: e.clientX - fx.get(),
      offY: e.clientY - fy.get(),
      samples: [[e.clientX, e.clientY, e.timeStamp]],
      moved: false,
    }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragState.current
    if (!d) return
    const [sx, sy] = d.samples[0]
    if (!d.moved && Math.hypot(e.clientX - sx, e.clientY - sy) > 6) {
      // só vira arraste depois de alguns pixels: um toque simples continua sendo toque
      d.moved = true
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      setGrip('held')
      onAway?.(true)
      onGrab?.()
    }
    if (!d.moved) return
    fx.set(e.clientX - d.offX)
    fy.set(e.clientY - d.offY)
    d.samples.push([e.clientX, e.clientY, e.timeStamp])
    if (d.samples.length > 6) d.samples.shift()
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragState.current
    dragState.current = null
    if (!d) return
    if (!d.moved) {
      free.set(0)
      return
    }
    // velocidade do último trecho do gesto (o começo do arraste não conta)
    const recent = d.samples.filter(([, , t]) => e.timeStamp - t <= 140)
    const [x0, y0, t0] = recent.length >= 2 ? recent[0] : d.samples[Math.max(0, d.samples.length - 2)]
    const dt = Math.max(16, e.timeStamp - t0) / 1000
    const vx = (e.clientX - x0) / dt
    const vy = (e.clientY - y0) / dt
    if (Math.hypot(vx, vy) > 300) {
      setGrip('flying')
      onThrow?.()
      fling(vx, vy)
    } else {
      setGrip('none')
      returnHome()
    }
  }

  const lateralVelocity = useVelocity(outX)
  const leanRaw = useTransform(lateralVelocity, [-1800, 0, 1800], [-1, 0, 1], { clamp: true })
  // mola pouco amortecida: depois de parar ele ainda balança um pouco, como gelatina
  const lean = useSpring(leanRaw, motionTokens.climinha.jelly)

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
  const visitLookX = visitSide === 'left' ? -0.9 : visitSide === 'right' ? 0.9 : 0
  const visitLookY = 0.1
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
      style={{ x: outX, y: outY, scale, width: geo.anchorW, originX: 0, originY: 0, zIndex: landing ? 101 : 15 }}
    >
      <motion.div
        className="traveler__grip"
        data-throwable={(throwable && !reduced) || undefined}
        data-held={grip === 'held' || undefined}
        style={reduced ? undefined : { rotate, scaleY, scaleX, originY: 1 }}
        animate={impact}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
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
            moodOverride={grip === 'held' ? 'surprised' : grip === 'flying' ? (fury > 0 ? 'irritated' : 'happy') : moodOverride}
            fury={fury}
            lean={lean}
            perceive
            onTap={() => {}}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
