import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const get = vi.fn()
vi.mock('@/plugins/apiConnect', () => ({
  apiConnect: { get: (...args: unknown[]) => get(...args) },
}))

import ReportsPage from '../ReportsPage.vue'

globalThis.ResizeObserver =
  globalThis.ResizeObserver ||
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

const TestDialog = defineComponent({
  props: { modelValue: Boolean },
  setup(props, { slots }) {
    return () =>
      props.modelValue ? h('div', { 'data-test': 'report-dialog' }, slots.default?.()) : null
  },
})

const TestTable = defineComponent({
  props: { items: { type: Array, default: () => [] } },
  setup(props, { slots }) {
    return () =>
      h(
        'div',
        { 'data-test': 'report-table' },
        (props.items as Array<{ idTree: string }>).map((item) =>
          h('div', { key: item.idTree }, [
            slots['item.tree']?.({ item }),
            slots['item.actions']?.({ item }),
          ]),
        ),
      )
  },
})

const report = {
  idTree: 'tree-report-01',
  date: '2025-03-14',
  type: 'LIGHT',
  observations: 'Retirada de galhos secos.',
  user: { name: 'Ana Silva' },
  tree: {
    latitude: 0,
    longitude: -46.123456,
    vigor: 'GOOD',
    species: { commonName: 'Ipê-amarelo', scientificName: 'Handroanthus albus' },
  },
}

function mountPage() {
  return mount(ReportsPage, {
    global: {
      plugins: [createVuetify({ components, directives })],
      stubs: {
        PageHeader: true,
        VDataTable: TestTable,
        VDialog: TestDialog,
        VSnackbar: true,
        VProgressCircular: true,
      },
    },
  })
}

describe('ReportsPage details', () => {
  beforeEach(() => {
    get.mockReset()
    get.mockResolvedValue({ data: [report] })
  })

  it('abre os detalhes completos do relatório da linha selecionada', async () => {
    const wrapper = mountPage()
    await flushPromises()
    await wrapper.get('[data-test="report-table"] button').trigger('click')
    await flushPromises()

    const dialog = wrapper.get('[data-test="report-dialog"]')
    expect(dialog.text()).toContain('Ipê-amarelo')
    expect(dialog.text()).toContain('Handroanthus albus')
    expect(dialog.text()).toContain('Ana Silva')
    expect(dialog.text()).toContain('Retirada de galhos secos.')
    expect(dialog.text()).toContain('0.0000, -46.1235')
  })

  it('exibe fallbacks para dados opcionais ausentes', async () => {
    get.mockResolvedValue({
      data: [{ idTree: 'tree-empty', date: 'invalid-date', type: 'OTHER', tree: null }],
    })
    const wrapper = mountPage()
    await flushPromises()
    await wrapper.get('[data-test="report-table"] button').trigger('click')
    await flushPromises()

    const dialog = wrapper.get('[data-test="report-dialog"]')
    expect(dialog.text()).toContain('Árvore sem identificação')
    expect(dialog.text()).toContain('Data inválida')
    expect(dialog.text()).toContain('Localização não informada')
    expect(dialog.text()).toContain('Nenhuma observação foi registrada nesta intervenção.')
  })
})
