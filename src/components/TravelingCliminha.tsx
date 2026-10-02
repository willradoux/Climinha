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

/**
 * O Climinha que acompanha a interface.
 * No topo ele ocupa o lugar reservado no hero. Ao rolar, ele se solta e flutua junto:
 *  - desktop: nas laterais, trocando de lado conforme a seção em foco
 *  - mobile/tablet: encolhe e fica num canto, olhando o conteúdo
 * A velocidade do scroll inclina e estica o corpo; molas dão o atraso de nuvem.
 */

const RATIO = 182 / 240
const DOCK_TRAVEL = 0.6 // fração da altura do hero até ele se soltar por completo
const SIDE_MIN_GUTTER = 190 // abaixo disso não cabe nas laterais → canto

type Side = 'left' | 'right'

interface Geometry {
  // âncora no documento (posição com scroll = 0)
  anchorX: number
  anchorY: number
  anchorW: number
  vw: number
  vh: number
  gutter: number
  contentLeft: number
  contentRight: number
  navLeft: number
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
  /** deslocamento do arraste entre cidades — ele vai para o lado junto com a tela */
  swipeX?: MotionValue<number>
}

export function TravelingCliminha({ anchorRef, state, phase, moodOverride, layoutKey, onReady, fromRef, swipeX }: Props) {
  const reduced = useReducedMotion() ?? false
  const { scrollY } = useScroll()
  const [geo, setGeo] = useState<Geometry | null>(null)
  const [side, setSide] = useState<Side>('left')

  // --- medidas --------------------------------------------------------------
  useLayoutEffect(() => {
    const measure = () => {
      const el = anchorRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const page = document.querySelector('.content') ?? document.querySelector('.page')
      const pr = page?.getBoundingClientRect()
      const nav = document.querySelector('.floatnav')?.getBoundingClientRect()
      const vw = window.innerWidth
      setGeo({
        anchorX: r.left,
        anchorY: r.top + window.scrollY,
        anchorW: r.width,
        vw,
        vh: window.innerHeight,
        gutter: pr ? pr.left : 0,
        contentLeft: pr ? pr.left : 0,
        contentRight: pr ? pr.right : vw,
        navLeft: nav ? nav.left : 16,
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

  // --- seção em foco decide o lado (desktop) ----------------------------------
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setSide(((e.target as HTMLElement).dataset.side as Side) ?? 'left')
        }
      },
      { rootMargin: '-48% 0px -48% 0px' },
    )
    const els = document.querySelectorAll<HTMLElement>('[data-side]')
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [layoutKey, geo])

  // --- posição alvo a partir do scroll ----------------------------------------
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const rawScale = useMotionValue(1)
  const progress = useMotionValue(0)

  const landed = useRef(false)
  // amassadinho ao chegar
  const [landing, setLanding] = useState(false)
  const springCfg = motionTokens.climinha.follow
  const x = useSpring(rawX, springCfg)
  const y = useSpring(rawY, springCfg)
  const scale = useSpring(rawScale, springCfg)

  useLayoutEffect(() => {
    if (!geo) return
    const sideMode = geo.gutter >= SIDE_MIN_GUTTER
    const heroW = geo.anchorW
    const travel = Math.max(1, geo.vh * DOCK_TRAVEL)

    const place = (s: number, jump: boolean) => {
      const p = Math.min(1, Math.max(0, s / travel))
      const e = p * p * (3 - 2 * p) // smoothstep

      // âncora no hero: rola junto com a página
      const hx = geo.anchorX
      const hy = geo.anchorY - s

      let dw: number
      let dx: number
      let dy: number
      if (sideMode) {
        dw = Math.min(150, geo.gutter - 48)
        const center = side === 'left' ? geo.contentLeft / 2 : (geo.contentRight + geo.vw) / 2
        dx = center - dw / 2
        dy = geo.vh * 0.42 - (dw * RATIO) / 2
      } else {
        // mobile/tablet: senta em cima da barra de navegação, fora do caminho dos dados
        dw = 56
        dx = geo.navLeft + 6
        dy = geo.navTop - dw * RATIO + 10
      }

      const tx = hx + (dx - hx) * e
      const ty = hy + (dy - hy) * e
      const ts = (heroW + (dw - heroW) * e) / heroW

      for (const [mv, v] of [
        [rawX, tx],
        [rawY, ty],
        [rawScale, ts],
      ] as const) {
        mv.set(v)
      }
      progress.set(e)
      // remedidas posteriores (resize, troca de cidade) seguem pela mola, sem salto
      if (reduced || (jump && !landed.current)) {
        // primeira vez vindo da intro: começa do tamanho/posição do close-up e a mola faz o voo
        const from = !reduced && !landed.current ? fromRef?.current?.getBoundingClientRect() : null
        landed.current = true
        if (from && from.width > 0) {
          x.jump(from.left)
          y.jump(from.top)
          scale.jump(from.width / heroW)
          // pouso: encolhe devagar até o lugar dele no hero, como nuvem assentando
          const t = motionTokens.climinha.landing
          void animate(x, tx, t)
          void animate(y, ty, t)
          void animate(scale, ts, t)
          setLanding(true)
        } else {
          x.jump(tx)
          y.jump(ty)
          scale.jump(ts)
        }
      }
    }

    place(window.scrollY, true)
    return scrollY.on('change', (s) => place(s, false))
  }, [geo, side, scrollY, reduced, rawX, rawY, rawScale, progress, x, y, scale])

  // troca de lado no meio do scroll também reposiciona
  // (o efeito acima depende de `side`)

  // --- arraste lateral: vai junto com a tela; a velocidade vira inércia no corpo ---
  const fallbackSwipe = useMotionValue(0)
  const swipe = swipeX ?? fallbackSwipe
  const screenX = useTransform(() => x.get() + swipe.get())
  const lateralVelocity = useVelocity(screenX)
  const leanRaw = useTransform(lateralVelocity, [-1600, 0, 1600], [-1, 0, 1], { clamp: true })
  // mola pouco amortecida: depois de parar ele ainda balança um pouco, como gelatina
  const lean = useSpring(leanRaw, motionTokens.climinha.jelly)

  // --- inclinação e esticada pela velocidade do scroll ----------------------
  const velocity = useVelocity(scrollY)
  const tiltRaw = useTransform(velocity, [-2400, 0, 2400], [9, 0, -9], { clamp: true })
  const stretchRaw = useTransform(velocity, [-2400, 0, 2400], [1.07, 1, 1.07], { clamp: true })
  const rotate = useSpring(tiltRaw, motionTokens.climinha.soft)
  const scaleY = useSpring(stretchRaw, motionTokens.climinha.soft)
  const scaleX = useTransform(scaleY, (v) => 2 - v)

  // --- olhar: cursor no topo; solto, olha para o conteúdo -------------------
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

  const sideMode = !!geo && geo.gutter >= SIDE_MIN_GUTTER
  const dockLookX = sideMode ? (side === 'left' ? 0.85 : -0.85) : -0.6
  const lookX = useTransform(() => {
    const e = progress.get()
    return pointerX.get() * (1 - e) + dockLookX * e
  })
  const lookY = useTransform(() => {
    const e = progress.get()
    // descendo: olha para baixo; subindo: para cima
    const dir = Math.max(-0.5, Math.min(0.5, velocity.get() / 3000))
    return pointerY.get() * (1 - e) + (0.55 + dir) * e
  })

  const ready = !!geo
  useEffect(() => {
    if (ready) onReady?.()
  }, [ready, onReady])

  if (!geo) return null

  return (
    <motion.div
      className="traveler"
      style={{ x: screenX, y, scale, width: geo.anchorW, originX: 0, originY: 0 }}
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
            moodOverride={moodOverride}
            lean={lean}
            onTap={() => {}}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
