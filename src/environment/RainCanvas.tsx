import { useEffect, useRef } from 'react'

interface Drop {
  x: number
  y: number
  len: number
  speed: number
  depth: number
}

/** Chuva ambiental (fundo). As gotas do Climinha são do personagem, não daqui. */
export function RainCanvas({ intensity, reduced }: { intensity: 0 | 1 | 2; reduced: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || intensity === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = 0
    let h = 0
    let drops: Drop[] = []
    const wind = intensity === 2 ? 0.22 : 0.12

    const spawn = (anywhere: boolean): Drop => {
      const depth = Math.random()
      return {
        x: Math.random() * (w + h * wind) - h * wind,
        y: anywhere ? Math.random() * h : -20 - Math.random() * h * 0.2,
        len: 10 + depth * (intensity === 2 ? 22 : 16),
        speed: 520 + depth * (intensity === 2 ? 900 : 620),
        depth,
      }
    }

    const resize = () => {
      // gotas finas e borradas pelo movimento: 1x basta e custa bem menos
      const dpr = 1
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const density = intensity === 2 ? 0.00027 : 0.00016
      const count = Math.round(w * h * density)
      drops = Array.from({ length: count }, () => spawn(true))
    }

    // 3 camadas de profundidade: um traço por camada por quadro (em vez de um por gota)
    const LAYERS = [
      { alpha: 0.16, width: 0.8 },
      { alpha: 0.28, width: 1.15 },
      { alpha: 0.42, width: 1.5 },
    ]
    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      ctx.lineCap = 'round'
      for (let l = 0; l < LAYERS.length; l++) {
        ctx.strokeStyle = `rgba(205, 222, 250, ${LAYERS[l].alpha})`
        ctx.lineWidth = LAYERS[l].width
        ctx.beginPath()
        for (const d of drops) {
          if (Math.min(2, Math.floor(d.depth * 3)) !== l) continue
          ctx.moveTo(d.x, d.y)
          ctx.lineTo(d.x + d.len * wind, d.y + d.len)
        }
        ctx.stroke()
      }
    }

    resize()
    window.addEventListener('resize', resize)

    if (reduced) {
      draw()
      return () => window.removeEventListener('resize', resize)
    }

    let raf = 0
    let last = performance.now()
    let lastDraw = 0
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      for (let i = 0; i < drops.length; i++) {
        const d = drops[i]
        d.y += d.speed * dt
        d.x += d.speed * dt * wind
        if (d.y > h + 20) drops[i] = spawn(false)
      }
      // 30 fps bastam para chuva (o rastro esconde) e liberam metade do trabalho
      if (now - lastDraw >= 32) {
        draw()
        lastDraw = now
      }
      raf = requestAnimationFrame(tick)
    }
    const onVisibility = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden) {
        last = performance.now()
        raf = requestAnimationFrame(tick)
      }
    }
    raf = requestAnimationFrame(tick)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [intensity, reduced])

  return <canvas ref={ref} className="env__rain" style={{ opacity: intensity === 0 ? 0 : 1 }} />
}
