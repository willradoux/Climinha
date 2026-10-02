import type { WeatherKind } from '../weather/types'

export type Mood =
  | 'neutral'
  | 'happy'
  | 'curious'
  | 'sleepy'
  | 'bored'
  | 'irritated'
  | 'surprised'
  | 'confused'
  | 'sleeping'
  | 'scared'
  | 'wink'

export interface BodyColors {
  light: string
  mid: string
  shade: string
  /** luz de borda — separa corpos escuros de céus escuros, sem outline */
  rim: string
  /** halo atmosférico atrás do personagem */
  halo: string
  contactShadow: string
}

export interface CliminhaState {
  mood: Mood
  body: BodyColors
  /** amplitude (unidades do viewBox) e período (s) da flutuação */
  float: { amplitude: number; period: number }
  /** 0 nenhuma · 1 algumas gotas · 2 muitas */
  drops: 0 | 1 | 2
  heavy: boolean
}

/**
 * A cor do corpo comunica o clima (decisão da folha v2):
 * céu limpo branco-frio → ensolarado azul vivo → nublado cinza-azulado →
 * chuva cinza médio → chuva forte grafite → tempestade quase preto.
 */
const BODY: Record<WeatherKind | 'night', BodyColors> = {
  clear: {
    light: '#fbfdff',
    mid: '#e4edfa',
    shade: '#a8c5ee',
    rim: 'rgba(255, 255, 255, 0)',
    halo: 'rgba(255, 255, 255, 0.10)',
    contactShadow: 'rgba(40, 90, 170, 0.32)',
  },
  sunny: {
    light: '#f1f8ff',
    mid: '#cde4fd',
    shade: '#78b0f3',
    rim: 'rgba(255, 255, 255, 0)',
    halo: 'rgba(255, 250, 235, 0.12)',
    contactShadow: 'rgba(30, 90, 180, 0.34)',
  },
  partly: {
    light: '#fbfdff',
    mid: '#e2ebf8',
    shade: '#a3bfe6',
    rim: 'rgba(255, 255, 255, 0)',
    halo: 'rgba(255, 255, 255, 0.10)',
    contactShadow: 'rgba(40, 80, 150, 0.32)',
  },
  cloudy: {
    light: '#eef1f6',
    mid: '#cbd3de',
    shade: '#8e9cb0',
    rim: 'rgba(255, 255, 255, 0.10)',
    halo: 'rgba(235, 240, 248, 0.10)',
    contactShadow: 'rgba(30, 40, 60, 0.3)',
  },
  fog: {
    light: '#f6f7f9',
    mid: '#dfe4ea',
    shade: '#aab5c3',
    rim: 'rgba(255, 255, 255, 0)',
    halo: 'rgba(255, 255, 255, 0.14)',
    contactShadow: 'rgba(40, 50, 65, 0.22)',
  },
  rain: {
    light: '#c3c9d2',
    mid: '#9ba3af',
    shade: '#5f6977',
    rim: 'rgba(225, 235, 250, 0.32)',
    halo: 'rgba(190, 210, 235, 0.12)',
    contactShadow: 'rgba(5, 10, 20, 0.38)',
  },
  heavyRain: {
    light: '#9aa1ac',
    mid: '#727a86',
    shade: '#3d444f',
    rim: 'rgba(215, 228, 248, 0.38)',
    halo: 'rgba(175, 195, 225, 0.13)',
    contactShadow: 'rgba(0, 4, 12, 0.42)',
  },
  storm: {
    light: '#767d89',
    mid: '#4d535e',
    shade: '#202430',
    rim: 'rgba(200, 216, 245, 0.42)',
    halo: 'rgba(150, 170, 215, 0.14)',
    contactShadow: 'rgba(0, 0, 0, 0.5)',
  },
  night: {
    light: '#f0f3fd',
    mid: '#c8d3ef',
    shade: '#7a8fc6',
    rim: 'rgba(200, 215, 255, 0.12)',
    halo: 'rgba(150, 175, 255, 0.10)',
    contactShadow: 'rgba(0, 6, 30, 0.45)',
  },
}

/**
 * Regras de humor:
 *  - noite: dorme (a tempestade acorda — aí ele fica com medo)
 *  - sol (limpo / ensolarado / parcialmente nublado de dia): sempre feliz
 *  - chuva: chateado (e cinza)
 *  - raio: com medo
 *  - o resto: humor normal
 */
function moodFor(kind: WeatherKind, isDay: boolean): Mood {
  if (kind === 'storm') return 'scared'
  if (!isDay) return 'sleeping'
  if (kind === 'sunny' || kind === 'clear' || kind === 'partly') return 'happy'
  if (kind === 'rain' || kind === 'heavyRain') return 'bored'
  return 'neutral'
}

export function climinhaFor(kind: WeatherKind, isDay: boolean): CliminhaState {
  const nightCalm = !isDay && (kind === 'sunny' || kind === 'clear' || kind === 'partly')
  const body = nightCalm ? BODY.night : BODY[kind]
  const mood = moodFor(kind, isDay)

  switch (kind) {
    case 'storm':
      return { mood, body, float: { amplitude: 1.6, period: 4.6 }, drops: 2, heavy: true }
    case 'heavyRain':
      return { mood, body, float: { amplitude: 2.2, period: 4.2 }, drops: 2, heavy: true }
    case 'rain':
      return { mood, body, float: { amplitude: 3, period: 3.8 }, drops: 1, heavy: true }
    case 'fog':
    case 'cloudy':
      return { mood, body, float: { amplitude: 4, period: 3.8 }, drops: 0, heavy: false }
    default:
      return {
        mood,
        body,
        // dormindo: respiração lenta e baixa
        float: nightCalm ? { amplitude: 2.5, period: 5.2 } : { amplitude: 5.5, period: 3.2 },
        drops: 0,
        heavy: false,
      }
  }
}

/** Neutro, usado durante o carregamento e no erro. */
export const NEUTRAL_STATE: CliminhaState = {
  mood: 'neutral',
  body: BODY.clear,
  float: { amplitude: 4, period: 3.6 },
  drops: 0,
  heavy: false,
}

export interface EyeShape {
  rx: number
  ry: number
  /** deslocamento vertical do olho */
  dy: number
  /** altura da pálpebra (y local); acima de -ry = olho aberto */
  lid: number
  /** inclinação da pálpebra; positivo baixa o lado interno */
  lidTilt: number
  arc: boolean
  /** arco virado para baixo: olho fechado dormindo */
  closed?: boolean
  /** curvatura da pálpebra (positivo = pálpebra pesada, arredondada) */
  curve?: number
  /** esconde o traço da pálpebra (sono não é irritação) */
  noLine?: boolean
}

/**
 * Sonolento: pálpebras pesadas e arredondadas, caídas para fora (cansaço, não irritação).
 * level 0 → quase aberto; 1 → fechado.
 */
export function drowsyEyes(level: number): [EyeShape, EyeShape] {
  const lid = -8 + level * 21
  const eye = { rx: 10, ry: 12.5, dy: 0, arc: false, lid, lidTilt: -2.5, curve: 3.5, noLine: true }
  return [eye, { ...eye }]
}

const OPEN = { lid: -30, lidTilt: 0, arc: false, dy: 0 }

/** Formato de cada olho [esquerdo, direito] por humor. */
export function eyesFor(mood: Mood): [EyeShape, EyeShape] {
  switch (mood) {
    case 'happy':
      return [
        { rx: 9.5, ry: 12.5, ...OPEN, arc: true },
        { rx: 9.5, ry: 12.5, ...OPEN, arc: true },
      ]
    case 'curious':
      return [
        { rx: 8.5, ry: 11, ...OPEN, dy: 3 },
        { rx: 9.5, ry: 13, ...OPEN, dy: -5 },
      ]
    case 'confused':
      return [
        { rx: 8.5, ry: 11.5, ...OPEN, dy: 2 },
        { rx: 9, ry: 12.5, ...OPEN, lid: -7, lidTilt: -10, dy: -2 },
      ]
    case 'sleepy':
      return [
        { rx: 9.5, ry: 11, ...OPEN, lid: 1.5, lidTilt: 0 },
        { rx: 9.5, ry: 11, ...OPEN, lid: 1.5, lidTilt: 0 },
      ]
    case 'bored':
      return [
        { rx: 9.5, ry: 12, ...OPEN, lid: -2.5, lidTilt: 0 },
        { rx: 9.5, ry: 12, ...OPEN, lid: -2.5, lidTilt: 0 },
      ]
    case 'irritated':
      return [
        { rx: 9.5, ry: 11.5, ...OPEN, lid: -1.5, lidTilt: 3.5 },
        { rx: 9.5, ry: 11.5, ...OPEN, lid: -1.5, lidTilt: 3.5 },
      ]
    case 'wink':
      // piscadinha de felicidade: um olho aberto, o outro fecha em ∩
      return [
        { rx: 10, ry: 12.5, ...OPEN },
        { rx: 9.5, ry: 12.5, ...OPEN, arc: true },
      ]
    case 'sleeping':
      // olhos fechados em arco para baixo (‿)
      return [
        { rx: 9.5, ry: 12.5, ...OPEN, arc: true, closed: true },
        { rx: 9.5, ry: 12.5, ...OPEN, arc: true, closed: true },
      ]
    case 'scared':
      // olhos arregalados, pálpebra interna erguida (preocupado)
      return [
        { rx: 9, ry: 14.5, ...OPEN, lid: -10.5, lidTilt: -6, dy: -1 },
        { rx: 9, ry: 14.5, ...OPEN, lid: -10.5, lidTilt: -6, dy: -1 },
      ]
    case 'surprised':
      return [
        { rx: 10.5, ry: 15, ...OPEN },
        { rx: 10.5, ry: 15, ...OPEN },
      ]
    default:
      return [
        { rx: 10, ry: 12.5, ...OPEN },
        { rx: 10, ry: 12.5, ...OPEN },
      ]
  }
}
