/**
 * Cartão de informações de uma árvore, exibido no popup do mini mapa.
 * Montado com a API do DOM e `textContent`: nenhum dado vindo da API é
 * interpretado como HTML.
 */

export type TreeTone = 'critical' | 'priority' | 'normal'

export interface TreePopupInput {
  id: string
  name: string
  scientificName?: string
  /** Símbolo da espécie, o mesmo usado no marcador. */
  icon: string
  statusLabel: string
  /** Define a cor do marcador e da etiqueta de situação. */
  tone: TreeTone
  latitude: number
  longitude: number
}

/** Cores dos marcadores por tom. O cartão usa o mesmo tom para manter a coerência visual. */
export const TREE_TONE_COLORS: Record<TreeTone, string> = {
  critical: '#b93d43',
  priority: '#b66b20',
  normal: '#347451',
}

/** Código curto da árvore, o mesmo exibido na lista de alertas do painel. */
export function treeCode(id: string): string {
  return String(id ?? '')
    .slice(-4)
    .toUpperCase()
}

/** Link para abrir o ponto no Google Maps (formato documentado da Maps URLs API). */
export function googleMapsLocationUrl(latitude: number, longitude: number): string {
  const url = new URL('https://www.google.com/maps/search/')
  url.searchParams.set('api', '1')
  url.searchParams.set('query', `${latitude},${longitude}`)
  return url.toString()
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

export function buildTreePopup(input: TreePopupInput): HTMLElement {
  const card = element('div', 'tip')
  card.dataset.tone = input.tone

  // Faixa 1: identificação
  const head = element('header', 'tip-head')
  const avatar = element('span', 'tip-avatar')
  avatar.textContent = input.icon
  avatar.setAttribute('aria-hidden', 'true')
  const identity = element('div', 'tip-identity')
  identity.append(element('h3', 'tip-name', input.name))
  if (input.scientificName) identity.append(element('p', 'tip-sci', input.scientificName))
  identity.append(element('p', 'tip-code', `Código #${treeCode(input.id)}`))
  head.append(avatar, identity)

  // Faixa 2: situação e localização
  const rows = element('dl', 'tip-rows')

  const statusRow = element('div', 'tip-row')
  const chip = element('span', 'tip-chip')
  const dot = element('i', 'tip-dot')
  dot.setAttribute('aria-hidden', 'true')
  chip.append(dot, document.createTextNode(input.statusLabel))
  const statusValue = element('dd')
  statusValue.append(chip)
  statusRow.append(element('dt', undefined, 'Situação'), statusValue)

  const placeRow = element('div', 'tip-row')
  placeRow.append(
    element('dt', undefined, 'Localização'),
    element(
      'dd',
      'tip-coords',
      `${input.latitude.toFixed(5)}, ${input.longitude.toFixed(5)}`,
    ),
  )
  rows.append(statusRow, placeRow)

  // Faixa 3: ação
  const action = element('a', 'tip-action')
  action.href = googleMapsLocationUrl(input.latitude, input.longitude)
  action.target = '_blank'
  action.rel = 'noopener noreferrer'
  action.setAttribute('aria-label', 'Abrir no Google Maps (abre em nova aba)')
  const external = element('span', 'tip-external', '↗')
  external.setAttribute('aria-hidden', 'true')
  action.append(document.createTextNode('Abrir no Google Maps '), external)

  card.append(head, rows, action)
  return card
}
