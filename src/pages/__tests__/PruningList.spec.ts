import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { routerKey, routeLocationKey } from 'vue-router'

const get = vi.fn()

vi.mock('@/plugins/apiConnect', () => ({
  apiConnect: { get: (...args: unknown[]) => get(...args) },
}))

import PruningList from '../PruningList.vue'

// jsdom não fornece a API observada pelo spinner do Vuetify.
globalThis.ResizeObserver =
  globalThis.ResizeObserver ||
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
// jsdom não implementa o viewport usado pelo posicionamento de overlays Vuetify.
// @ts-expect-error visualViewport não está definido no tipo de jsdom
globalThis.visualViewport = globalThis.visualViewport || {
  addEventListener() {},
  removeEventListener() {},
  width: 0,
  height: 0,
}

const TestDialog = defineComponent({
  props: { modelValue: Boolean },
  emits: ['update:modelValue'],
  setup(props, { slots }) {
    return () => (props.modelValue ? h('div', { 'data-test': 'dialog' }, slots.default?.()) : null)
  },
})

const TestSnackbar = defineComponent({
  props: { modelValue: Boolean },
  setup(props, { slots }) {
    return () =>
      props.modelValue ? h('div', { 'data-test': 'error-snackbar' }, slots.default?.()) : null
  },
})

const TestDataTable = defineComponent({
  props: { items: { type: Array, default: () => [] } },
  setup(props, { slots }) {
    return () =>
      h(
        'div',
        { 'data-test': 'pruning-table' },
        (props.items as Array<{ idTree?: string }>).map((item) =>
          h('div', { key: item.idTree }, [
            slots['item.tree']?.({ item }),
            slots['item.location']?.({ item }),
            slots['item.actions']?.({ item }),
          ]),
        ),
      )
  },
})

const vuetify = createVuetify({ components, directives })
const record = {
  idTree: 'tree-1234',
  type: 'MODERATE',
  date: '2025-03-14',
  observations: 'Remoção de galhos próximos à rede.',
  tree: {
    latitude: 0,
    longitude: -46.123456,
    species: { commonName: 'Ipê-amarelo', scientificName: 'Handroanthus albus' },
  },
}

function mountPage() {
  const router = { push: vi.fn() }
  const wrapper = mount(PruningList, {
    global: {
      plugins: [vuetify],
      provide: {
        [routerKey as symbol]: router,
        [routeLocationKey as symbol]: { path: '/user/podas' },
      },
      stubs: {
        PageHeader: true,
        VDataTable: TestDataTable,
        VDialog: TestDialog,
        VSnackbar: TestSnackbar,
        VProgressCircular: true,
      },
    },
  })
  return { wrapper, router }
}

describe('PruningList', () => {
  beforeEach(() => {
    get.mockReset()
    get.mockResolvedValue({ data: [record] })
  })

  it('abre detalhes do registro selecionado e apresenta os dados da poda', async () => {
    const { wrapper } = mountPage()
    await flushPromises()

    await wrapper.get('[data-test="pruning-table"] button').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-test="dialog"]').text()).toContain('Detalhes da poda')
    expect(wrapper.get('[data-test="dialog"]').text()).toContain('Ipê-amarelo')
    expect(wrapper.get('[data-test="dialog"]').text()).toContain('Handroanthus albus')
    expect(wrapper.get('[data-test="dialog"]').text()).toContain('tree-1234')
    expect(wrapper.get('[data-test="dialog"]').text()).toContain('Moderada')
    expect(wrapper.get('[data-test="dialog"]').text()).toContain(
      'Remoção de galhos próximos à rede.',
    )
    expect(wrapper.get('[data-test="dialog"]').text()).toContain('0.0000, -46.1235')
  })

  it('usa fallbacks seguros para observações, árvore e data inválida', async () => {
    get.mockResolvedValue({
      data: [{ idTree: null, type: null, date: 'data-ruim', observations: '  ', tree: null }],
    })
    const { wrapper } = mountPage()
    await flushPromises()

    await wrapper.get('[data-test="pruning-table"] button').trigger('click')
    await flushPromises()

    const dialog = wrapper.get('[data-test="dialog"]')
    expect(dialog.text()).toContain('Árvore · identificação não informada')
    expect(dialog.text()).toContain('Data inválida')
    expect(dialog.text()).toContain('Localização não informada')
    expect(dialog.text()).toContain('Nenhuma observação foi registrada para esta poda.')
  })

  it('mostra erro da API sem deixar a tela presa no carregamento', async () => {
    get.mockRejectedValue({ response: { data: { message: 'Falha de rede' } } })
    const { wrapper } = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('Falha de rede')
    expect(wrapper.text()).not.toContain('Carregando podas...')
  })
})
