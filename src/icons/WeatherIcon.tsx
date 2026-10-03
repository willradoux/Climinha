import type { WeatherKind } from '../weather/types'
import './icons.css'

/**
 * Ícones de clima do Climinha, desenhados à mão: formas orgânicas (nada de círculo
 * perfeito), cor chapada, contorno de "tinta" e um leve desalinhamento de impressão
 * (a camada de cor sai um pouco do traço, como em risografia).
 */

const CLOUD =
  'M6.5 18.6c-2.1.1-3.6-1.3-3.6-3.2 0-1.7 1.3-3 3-3.1.3-2.6 2.5-4.5 5-4.3 2 .1 3.6 1.3 4.2 3.1 2.3-.3 4.3 1.3 4.4 3.6.1 2.2-1.6 3.9-3.8 3.9-2.9.1-6.2-.1-9.2 0z'
const CLOUD_BACK =
  'M9.4 11.2c.6-2.2 2.6-3.6 4.8-3.4 1.8.2 3.2 1.3 3.7 2.9 1.9-.1 3.4 1.3 3.5 3.1.1 1.2-.4 2.2-1.3 2.9'
const SUN_DISC = 'M12 7.4c2.6-.1 4.7 2 4.6 4.7-.1 2.5-2.1 4.5-4.7 4.4-2.5 0-4.5-2.1-4.4-4.6.1-2.5 2-4.4 4.5-4.5z'
const MOON = 'M15.6 4.1c-3.7.9-6.1 4.6-5.3 8.4.7 3.3 3.7 5.6 7 5.4-1.4 1.6-3.4 2.5-5.6 2.4-3.9-.1-7-3.4-6.8-7.3.2-3.8 3.4-6.8 7.2-6.6 1.3 0 2.5.6 3.5 1.7z'
const DROP = 'M0 0c1.1 1.5 1.7 2.5 1.7 3.4a1.7 1.7 0 0 1-3.4 0c0-.9.6-1.9 1.7-3.4z'
const BOLT = 'M13.2 13.6 9.4 18.9h2.8l-1.5 4 4.9-5.9h-2.8l2-3.4z'

// raios do sol: comprimentos e ângulos levemente irregulares
const RAYS = [
  [0, 2.6],
  [44, 2.1],
  [93, 2.7],
  [137, 2],
  [182, 2.5],
  [226, 2.2],
  [272, 2.8],
  [318, 2],
]

function Ink({ d, tone, transform }: { d: string; tone: string; transform?: string }) {
  return (
    <g transform={transform}>
      {/* cor deslocada (impressão fora de registro) */}
      <path d={d} className={`wi-mis wi-mis--${tone}`} transform="translate(0.7 0.8)" />
      <path d={d} className={`wi-fill wi-fill--${tone}`} />
      <path d={d} className={`wi-ink wi-ink--${tone}`} />
    </g>
  )
}

function Sun({ x = 0, y = 0, s = 1 }: { x?: number; y?: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) translate(12 12) scale(${s}) translate(-12 -12)`}>
      {RAYS.map(([deg, len]) => {
        const a = (deg * Math.PI) / 180
        const r = 6.3
        return (
          <line
            key={deg}
            x1={12 + Math.cos(a) * r}
            y1={12 + Math.sin(a) * r}
            x2={12 + Math.cos(a) * (r + len)}
            y2={12 + Math.sin(a) * (r + len)}
            className="wi-ray"
          />
        )
      })}
      <Ink d={SUN_DISC} tone="sun" />
    </g>
  )
}

function Drops({ heavy }: { heavy?: boolean }) {
  const spots = heavy
    ? [
        [7.6, 19.2],
        [11.4, 20.4],
        [15.2, 19.1],
        [18.6, 20.6],
      ]
    : [
        [8.4, 19.4],
        [12.4, 20.6],
        [16.4, 19.3],
      ]
  return (
    <>
      {spots.map(([x, y]) => (
        <Ink key={x} d={DROP} tone="rain" transform={`translate(${x} ${y}) scale(0.82)`} />
      ))}
    </>
  )
}

export interface WeatherIconProps {
  kind: WeatherKind
  isDay?: boolean
  size?: number
  className?: string
  title?: string
}

export function WeatherIcon({ kind, isDay = true, size = 26, className, title }: WeatherIconProps) {
  const body = (() => {
    switch (kind) {
      case 'sunny':
      case 'clear':
        return isDay ? <Sun /> : <Ink d={MOON} tone="moon" transform="translate(-1 0.5)" />
      case 'partly':
        return (
          <>
            {isDay ? <Sun x={-2.8} y={-3.2} s={0.78} /> : <Ink d={MOON} tone="moon" transform="translate(-3.2 -2.6) scale(0.8)" />}
            <Ink d={CLOUD} tone="cloud" transform="translate(1.2 1.4) scale(0.9)" />
          </>
        )
      case 'cloudy':
        return (
          <>
            <path d={CLOUD_BACK} className="wi-ink wi-ink--back" fill="none" />
            <Ink d={CLOUD} tone="cloud" transform="translate(-0.6 0.8)" />
          </>
        )
      case 'fog':
        return (
          <>
            <Ink d={CLOUD} tone="cloud" transform="translate(0 -3.4)" />
            <path d="M3.6 19.3c2.1-.9 3.6.8 5.7 0s3.7-.9 5.8 0 3.4.7 5.3 0" className="wi-fog" />
            <path d="M6.4 22.3c1.8-.7 3.1.6 4.9 0s3.3-.7 5 0" className="wi-fog" />
          </>
        )
      case 'rain':
        return (
          <>
            <Ink d={CLOUD} tone="cloud" transform="translate(0 -3.8)" />
            <Drops />
          </>
        )
      case 'heavyRain':
        return (
          <>
            <Ink d={CLOUD} tone="cloud" transform="translate(0 -3.8)" />
            <Drops heavy />
          </>
        )
      case 'storm':
        return (
          <>
            <Ink d={CLOUD} tone="cloud" transform="translate(0 -3.8)" />
            <Ink d={BOLT} tone="bolt" transform="translate(0 -0.6)" />
          </>
        )
    }
  })()

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={['wi', className].filter(Boolean).join(' ')}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {body}
    </svg>
  )
}

/** Nascer / pôr do sol para a linha do tempo por hora. */
export function SunEventIcon({ type, size = 26 }: { type: 'sunrise' | 'sunset'; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className="wi" aria-hidden="true">
      <clipPath id={`clip-${type}`}>
        <rect x="0" y="0" width="24" height="17.2" />
      </clipPath>
      <g clipPath={`url(#clip-${type})`}>
        <Sun y={5} s={0.9} />
      </g>
      <path d="M2.8 17.8c3.1-.5 6 .4 9.2 0 3.1-.4 6.1.3 9.2 0" className="wi-fog" />
      <path
        d={type === 'sunrise' ? 'M12 22.6V20m-1.6 1.2L12 19.6l1.6 1.6' : 'M12 19.6v2.6m-1.6-1.2 1.6 1.6 1.6-1.6'}
        className="wi-fog"
      />
    </svg>
  )
}
