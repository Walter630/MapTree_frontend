import { describe, expect, it } from 'vitest'
import {
  buildTreePopup,
  googleMapsLocationUrl,
  treeCode,
  type TreePopupInput,
} from './treePopup'

const base: TreePopupInput = {
  id: '6ae278098613bd2921e8946a',
  name: 'Ipê-Amarelo',
  scientificName: 'Handroanthus albus',
  icon: '🌼',
  statusLabel: 'Precisa de poda',
  tone: 'priority',
  latitude: -5.243381,
  longitude: -38.127549,
}

describe('treeCode', () => {
  it('usa os 4 últimos caracteres em maiúsculas, como a lista de alertas', () => {
    expect(treeCode('6ae278098613bd2921e8946a')).toBe('946A')
    expect(treeCode('ab')).toBe('AB')
    expect(treeCode('')).toBe('')
  })
})

describe('googleMapsLocationUrl', () => {
  it('monta a URL de busca por coordenadas', () => {
    const url = new URL(googleMapsLocationUrl(-5.24338, -38.12755))
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/search/')
    expect(url.searchParams.get('api')).toBe('1')
    expect(url.searchParams.get('query')).toBe('-5.24338,-38.12755')
  })
})

describe('buildTreePopup', () => {
  it('separa identificação, situação/localização e ação', () => {
    const card = buildTreePopup(base)
    expect(card.querySelector('header .tip-name')?.textContent).toBe('Ipê-Amarelo')
    expect(card.querySelector('header .tip-sci')?.textContent).toBe('Handroanthus albus')
    expect(card.querySelector('header .tip-code')?.textContent).toBe('Código #946A')

    const labels = [...card.querySelectorAll('dl dt')].map((node) => node.textContent)
    expect(labels).toEqual(['Situação', 'Localização'])
    expect(card.querySelector('.tip-chip')?.textContent).toBe('Precisa de poda')
    expect(card.querySelector('.tip-coords')?.textContent).toBe('-5.24338, -38.12755')
    expect(card.querySelector('a.tip-action')).not.toBeNull()
  })

  it('guarda o tom para a cor de acento e da etiqueta', () => {
    for (const tone of ['critical', 'priority', 'normal'] as const) {
      expect(buildTreePopup({ ...base, tone }).dataset.tone).toBe(tone)
    }
  })

  it('omite o nome científico quando a API não o informa', () => {
    const card = buildTreePopup({ ...base, scientificName: undefined })
    expect(card.querySelector('.tip-sci')).toBeNull()
    expect(card.querySelector('.tip-code')).not.toBeNull()
  })

  it('abre o Google Maps em nova aba, sem vazar a origem', () => {
    const link = buildTreePopup(base).querySelector<HTMLAnchorElement>('a.tip-action')!
    expect(link.target).toBe('_blank')
    expect(link.rel).toBe('noopener noreferrer')
    expect(link.getAttribute('aria-label')).toBe('Abrir no Google Maps (abre em nova aba)')
    expect(new URL(link.href).searchParams.get('query')).toBe('-5.243381,-38.127549')
  })

  it('trata nomes vindos da API como texto, nunca como HTML', () => {
    const hostile = '<img src=x onerror="window.__pwned = true"><b>negrito</b>'
    const card = buildTreePopup({ ...base, name: hostile, scientificName: hostile })
    expect(card.querySelector('img')).toBeNull()
    expect(card.querySelector('b')).toBeNull()
    expect(card.querySelector('.tip-name')?.textContent).toBe(hostile)
    expect((window as unknown as { __pwned?: boolean }).__pwned).toBeUndefined()
  })

  it('esconde dos leitores de tela os elementos puramente decorativos', () => {
    const card = buildTreePopup(base)
    expect(card.querySelector('.tip-avatar')?.getAttribute('aria-hidden')).toBe('true')
    expect(card.querySelector('.tip-dot')?.getAttribute('aria-hidden')).toBe('true')
    expect(card.querySelector('.tip-external')?.getAttribute('aria-hidden')).toBe('true')
  })
})
