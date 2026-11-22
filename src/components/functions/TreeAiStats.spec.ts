import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { describe, expect, it } from 'vitest'
import { TreeStatus, Vigor } from '@/plugins/apiConnect'
import TreeAiStats from './TreeAiStats.vue'

const vuetify = createVuetify({ components, directives })

function mountSummary(
  overrides: Partial<{
    data: Record<string, unknown>
    predictionState: 'loading' | 'available' | 'unavailable' | 'error'
    errorMessage: string
  }> = {},
) {
  return mount(TreeAiStats, {
    props: {
      data: {
        id: 'tree-1',
        commonName: 'Ipê-amarelo',
        status: TreeStatus.TO_PRUNE,
        effectiveStatus: TreeStatus.TO_PRUNE,
        lastPruneDate: '2026-11-19',
        aiPrediction: null,
        vigor: Vigor.GOOD,
        ...overrides.data,
      },
      predictionState: overrides.predictionState ?? 'unavailable',
      errorMessage: overrides.errorMessage ?? '',
    },
    global: { plugins: [vuetify] },
  })
}

describe('card único de análise da árvore', () => {
  it('reúne poda necessária, última poda, vigor e previsão ausente no mesmo card', () => {
    const wrapper = mountSummary()

    expect(wrapper.findAll('.tree-ai-card')).toHaveLength(1)
    expect(wrapper.text()).toContain('Poda necessária')
    expect(wrapper.text()).toContain('19/11/2026')
    expect(wrapper.text()).toContain('Vigor da árvore')
    expect(wrapper.text()).toContain('Bom')
    expect(wrapper.text()).toContain('Previsão indisponível.')
    expect(wrapper.text()).not.toContain('Classificação registrada:')
    expect(wrapper.find('.technical-details-toggle').exists()).toBe(false)
    wrapper.unmount()
  })

  it('mostra a classificação registrada somente quando difere do risco operacional', () => {
    const wrapper = mountSummary({
      data: { effectiveStatus: TreeStatus.CRITICAL },
    })

    expect(wrapper.text()).toContain('Crítico')
    expect(wrapper.text()).toContain('Classificação registrada: Poda necessária')
    wrapper.unmount()
  })

  it.each([null, '', 'data inválida', '2026-02-30'])('trata a data %s como não informada', (date) => {
    const wrapper = mountSummary({ data: { lastPruneDate: date } })

    expect(wrapper.text()).toContain('Data não informada')
    wrapper.unmount()
  })

  it('formata timestamps no fuso de São Paulo', () => {
    const wrapper = mountSummary({ data: { lastPruneDate: '2026-11-20T01:30:00.000Z' } })

    expect(wrapper.text()).toContain('19/11/2026')
    wrapper.unmount()
  })

  it('mostra o carregamento na seção da previsão sem ocultar o resumo', () => {
    const wrapper = mountSummary({ predictionState: 'loading' })

    expect(wrapper.get('[role="status"]').text()).toContain('Consultando previsão...')
    expect(wrapper.text()).toContain('Poda necessária')
    expect(wrapper.text()).toContain('19/11/2026')
    wrapper.unmount()
  })

  it('mantém risco e data em erro e permite tentar novamente', async () => {
    const wrapper = mountSummary({
      predictionState: 'error',
      errorMessage: 'A previsão não respondeu.',
    })

    expect(wrapper.text()).toContain('A previsão não respondeu.')
    expect(wrapper.text()).toContain('Poda necessária')
    expect(wrapper.text()).toContain('19/11/2026')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
    wrapper.unmount()
  })

  it('oferece detalhes técnicos com uma previsão válida e expande o conteúdo', async () => {
    const wrapper = mountSummary({
      predictionState: 'available',
      data: {
        aiPrediction: {
          estimated_height_m: 4,
          wire_height_m: 7,
          will_reach_wire: false,
          days_to_wire: 1200,
          months_to_wire: 40,
          risk_status: 'NORMAL',
          alert: null,
          canopy: { shape: 'WIDE', ratio_width_height: 0.8 },
          fibonacci_info: { growth_modifier: 0.6 },
        },
      },
    })
    const button = wrapper.get('button.technical-details-toggle')

    expect(button.text()).toContain('Ver detalhes técnicos')
    await button.trigger('click')
    expect(wrapper.find('.technical-details').exists()).toBe(true)
    wrapper.unmount()
  })
})
