import { mount, flushPromises } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'
import MiniMap from '../MiniMap.vue'

// O canvas do heatmap não existe no jsdom. A integração Leaflet permanece real.
vi.mock('leaflet.heat', async () => {
  const L = await import('leaflet')
  return {
    HeatLayer: class extends L.Layer {
      setLatLngs() {
        return this
      }
      onAdd() {
        return this
      }
      onRemove() {
        return this
      }
    },
  }
})
globalThis.ResizeObserver =
  globalThis.ResizeObserver ||
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
const trees = [
  { id: 'p', status: 'TO_PRUNE', latitude: 0, longitude: 0, species: { commonName: 'Oiticica' } },
  { id: 'n', status: 'NORMAL', latitude: 0.002, longitude: 0.002 },
  { id: 'invalid', status: 'CRITICAL', latitude: 200, longitude: 0 },
]
function render() {
  return mount(MiniMap, {
    props: { trees, priorityIds: ['p', 'invalid'] },
    attachTo: document.body,
  })
}

/**
 * O jsdom não calcula layout, então o mapa ficaria com 0×0. Nesse tamanho o
 * MarkerClusterGroup trata o marcador como fora da área visível e o remove logo
 * após o clique, fechando o popup (artefato do jsdom, não do componente).
 * Dá um tamanho de leitura ao contêiner enquanto o teste roda e restaura depois.
 */
function withMapLayout() {
  const original = {
    width: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth'),
    height: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight'),
  }
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 400 })
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 300 })
  return () => {
    for (const [key, descriptor] of [
      ['clientWidth', original.width],
      ['clientHeight', original.height],
    ] as const) {
      if (descriptor) Object.defineProperty(HTMLElement.prototype, key, descriptor)
      else delete (HTMLElement.prototype as unknown as Record<string, unknown>)[key]
    }
  }
}
it('mostra só prioridades válidas e seleciona o mesmo registro usado pela lista', async () => {
  const wrapper = render()
  await flushPromises()
  expect(wrapper.text()).toContain('1 árvore(s) precisam de atenção em 1 setor(es)')
  const marker = wrapper.get('[title="Oiticica"]')
  await marker.trigger('click')
  expect(wrapper.emitted('select-trees')?.[0]).toEqual([['p']])
  wrapper.unmount()
})
it('abre o cartão da árvore com situação, localização e ação, em português', async () => {
  const restoreLayout = withMapLayout()
  const wrapper = render()
  try {
    await flushPromises()
    await wrapper.get('[title="Oiticica"]').trigger('click')

    const popup = document.querySelector('.tree-info-popup')
    expect(popup).not.toBeNull()
    expect(popup!.querySelector('.tip-name')?.textContent).toBe('Oiticica')
    expect(popup!.querySelector('.tip')?.getAttribute('data-tone')).toBe('priority')
    expect(popup!.querySelector('.tip-chip')?.textContent).toBe('Precisa de poda')
    expect(popup!.querySelector('.tip-coords')?.textContent).toBe('0.00000, 0.00000')
    expect(popup!.querySelector('a.tip-action')?.getAttribute('href')).toContain(
      'google.com/maps/search',
    )
    expect(popup!.querySelector('.leaflet-popup-close-button')?.getAttribute('aria-label')).toBe(
      'Fechar',
    )
  } finally {
    wrapper.unmount()
    restoreLayout()
  }
})

it('usa o tom crítico no cartão de uma árvore em estado crítico', async () => {
  const restoreLayout = withMapLayout()
  const wrapper = mount(MiniMap, {
    props: {
      trees: [
        {
          id: 'c',
          status: 'CRITICAL',
          latitude: 0,
          longitude: 0,
          species: { commonName: 'Ipê-Amarelo', scientificName: 'Handroanthus albus' },
        },
      ],
      priorityIds: ['c'],
    },
    attachTo: document.body,
  })
  try {
    await flushPromises()
    await wrapper.get('[title="Ipê-Amarelo"]').trigger('click')

    const card = document.querySelector('.tree-info-popup .tip')
    expect(card?.getAttribute('data-tone')).toBe('critical')
    expect(card?.querySelector('.tip-sci')?.textContent).toBe('Handroanthus albus')
    expect(card?.querySelector('.tip-chip')?.textContent).toBe('Crítico')
  } finally {
    wrapper.unmount()
    restoreLayout()
  }
})

it('mantém o cartão aberto quando o painel repassa os mesmos dados em arrays novos', async () => {
  // Regressão: o clique emite select-trees, o painel re-renderiza e recria priorityIds.
  // O mapa não pode redesenhar (e fechar o popup) se o conteúdo não mudou.
  const restoreLayout = withMapLayout()
  const wrapper = render()
  try {
    await flushPromises()
    await wrapper.get('[title="Oiticica"]').trigger('click')
    expect(document.querySelector('.tree-info-popup')).not.toBeNull()

    await wrapper.setProps({ trees: [...trees], priorityIds: ['p', 'invalid'] })
    await flushPromises()
    expect(document.querySelector('.tree-info-popup')).not.toBeNull()

    // Mudança real de conteúdo continua redesenhando.
    await wrapper.setProps({ priorityIds: [] })
    await flushPromises()
    expect(document.querySelector('.tree-info-popup')).toBeNull()
  } finally {
    wrapper.unmount()
    restoreLayout()
  }
})

it('alterna para concentração com todas as árvores válidas e limpa a seleção da lista', async () => {
  const wrapper = render()
  await wrapper.findAll('button')[1]!.trigger('click')
  await flushPromises()
  expect(wrapper.text()).toContain('2 árvore(s) com localização')
  expect(wrapper.emitted('select-trees')?.at(-1)).toEqual([[]])
  wrapper.unmount()
})
it('atualiza o resumo após nova carga sem remontar o mapa', async () => {
  const wrapper = render()
  await wrapper.setProps({ trees: [] })
  expect(wrapper.text()).toContain('Nenhuma prioridade com localização')
  wrapper.unmount()
})

it('informa falha de atualização sem declarar ausência de prioridades', async () => {
  const wrapper = render()
  await wrapper.setProps({ trees: [], failed: true })
  expect(wrapper.text()).toContain('Não foi possível atualizar')
  expect(wrapper.text()).not.toContain('Nenhuma prioridade com localização')
  wrapper.unmount()
})
