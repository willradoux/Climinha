import { useCallback, useEffect, useRef, useState } from 'react'
import { ORBIT_CARDS } from '../components/Orbit'
import type { DetailId } from '../components/Details'
import type { Mood } from './states'

/** sem ninguém jogar ele por este tempo, ele se acalma e devolve os cards (ms) */
const CALM_MS = 14_000

/**
 * O humor de quem está sendo jogado longe:
 *  1º arremesso → acha graça
 *  2º → irritado (fica vermelho)
 *  3º em diante → furioso: vai até um card e come (dois, se continuar)
 * Depois de um tempo em paz, se acalma e devolve os cards.
 */
export function useMischief(enabled: boolean) {
  const [eaten, setEaten] = useState<DetailId[]>([])
  const [eating, setEating] = useState<DetailId | null>(null)
  const [visit, setVisit] = useState<DetailId | null>(null)
  const [mood, setMood] = useState<Mood | undefined>()
  const [fury, setFury] = useState(0)

  const throws = useRef(0)
  const eatenRef = useRef<DetailId[]>([])
  const busy = useRef(false)
  const timers = useRef<number[]>([])
  const calmTimer = useRef(0)

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  const calm = useCallback(() => {
    throws.current = 0
    busy.current = false
    setVisit(null)
    setEating(null)
    setFury(0)
    setMood('happy')
    window.setTimeout(() => setMood(undefined), 1400)
    // devolve os cards um por um
    const list = [...eatenRef.current]
    list.forEach((_, i) =>
      window.setTimeout(() => {
        eatenRef.current = eatenRef.current.slice(1)
        setEaten(eatenRef.current)
      }, 400 + i * 380),
    )
  }, [])

  const scheduleCalm = useCallback(() => {
    window.clearTimeout(calmTimer.current)
    calmTimer.current = window.setTimeout(calm, CALM_MS)
  }, [calm])

  const eat = useCallback((count: number) => {
    const options = ORBIT_CARDS.filter((id) => !eatenRef.current.includes(id))
    if (busy.current || count <= 0 || options.length === 0) return
    busy.current = true
    const target = options[Math.floor(Math.random() * options.length)]
    setVisit(target) // voa até o card
    later(() => setEating(target), 1100) // começa a sugar
    later(() => {
      eatenRef.current = [...eatenRef.current, target]
      setEaten(eatenRef.current)
      setEating(null)
      setMood('happy') // engoliu: satisfação rápida
    }, 1650)
    later(() => {
      setMood('irritated')
      busy.current = false
      if (count > 1) eat(count - 1)
      else setVisit(null) // volta para o lugar, ainda bravo
    }, 2300)
  }, [])

  /** pegou ele */
  const grab = useCallback(() => {
    window.clearTimeout(calmTimer.current)
  }, [])

  /** soltou com velocidade: arremesso */
  const thrown = useCallback(() => {
    throws.current += 1
  }, [])

  /** parou de voar depois de um arremesso */
  const settled = useCallback(() => {
    const n = throws.current
    if (n === 1) {
      setMood('happy')
      later(() => setMood((m) => (m === 'happy' ? undefined : m)), 1800)
    } else if (n === 2) {
      setMood('irritated')
      setFury(0.45)
    } else if (n >= 3) {
      setMood('irritated')
      setFury(1)
      eat(n >= 4 ? 2 : 1)
    }
    scheduleCalm()
  }, [eat, scheduleCalm])

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t))
      window.clearTimeout(calmTimer.current)
    },
    [],
  )

  // saiu do computador (ou mudou de tela): tudo volta ao normal
  useEffect(() => {
    if (enabled) return
    timers.current.forEach((t) => window.clearTimeout(t))
    throws.current = 0
    eatenRef.current = []
    busy.current = false
    setEaten([])
    setEating(null)
    setVisit(null)
    setMood(undefined)
    setFury(0)
  }, [enabled])

  return { eaten, eating, visit, mood, fury, grab, thrown, settled }
}
