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
it('mostra só prioridades válidas e seleciona o mesmo registro usado pela lista', async () => {
  const wrapper = render()
  await flushPromises()
  expect(wrapper.text()).toContain('1 árvore(s) precisam de atenção em 1 setor(es)')
  const marker = wrapper.get('[title="Oiticica"]')
  await marker.trigger('click')
  expect(wrapper.emitted('select-trees')?.[0]).toEqual([['p']])
  wrapper.unmount()
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
