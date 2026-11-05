import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { expect, it } from 'vitest'
import SpeciesCatalogCard from '../SpeciesCatalogCard.vue'

// jsdom não fornece a API de medição usada pela paginação do Vuetify.
globalThis.ResizeObserver =
  globalThis.ResizeObserver ||
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

const species = [
  { id: '1', commonName: 'Oiticica', scientificName: 'Licania rigida', _count: { Tree: 6 } },
  { id: '2', commonName: 'Ipê-Amarelo', scientificName: 'Handroanthus albus', _count: { Tree: 0 } },
  ...['A', 'B', 'C'].map((name) => ({
    id: name,
    commonName: name,
    scientificName: 'Species ' + name,
  })),
]
async function render(props = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
  })
  await router.push('/')
  const wrapper = mount(SpeciesCatalogCard, {
    props: { species, mapPath: '/user/mapUser', ...props },
    global: { plugins: [router, createVuetify({ components, directives })] },
  })
  return { wrapper, router }
}

it('abre o mapa com a espécie escolhida e mantém zero e ausência de contagem distintos', async () => {
  const { wrapper, router } = await render()
  expect(wrapper.text()).toContain('0árvores')
  expect(wrapper.text()).toContain('Sem contagem')
  const link = wrapper.get('[aria-label="Ver Ipê-Amarelo no mapa de calor"]')
  await link.trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.query).toEqual({ camada: 'calor', especie: 'Ipê-Amarelo' })
  wrapper.unmount()
})

it('limita mil espécies a cinco linhas e busca em todo o catálogo', async () => {
  const manySpecies = Array.from({ length: 1000 }, (_, index) => ({
    id: String(index),
    commonName: 'Espécie ' + index,
    scientificName: 'Scientific ' + index,
  }))
  const { wrapper } = await render({ species: manySpecies })
  expect(wrapper.findAll('.catalog-species')).toHaveLength(5)
  await wrapper.get('[aria-label="Next page"]').trigger('click')
  expect(wrapper.get('.catalog-species').text()).not.toContain('Espécie 0')
  await wrapper.get('input').setValue('Scientific 999')
  expect(wrapper.findAll('.catalog-species')).toHaveLength(1)
  expect(wrapper.get('.catalog-species').text()).toContain('Espécie 999')
  await wrapper.get('input').setValue('Inexistente')
  expect(wrapper.text()).toContain('Nenhuma espécie encontrada.')
  wrapper.unmount()
})

it('mostra carregamento e oferece tentativa em caso de erro', async () => {
  const { wrapper } = await render({ loading: true })
  expect(wrapper.text()).toContain('Carregando catálogo')
  expect(wrapper.findAll('.catalog-species')).toHaveLength(0)
  await wrapper.setProps({ loading: false, failed: true })
  await wrapper.get('button').trigger('click')
  expect(wrapper.emitted('retry')).toHaveLength(1)
  wrapper.unmount()
})
