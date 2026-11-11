import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TreeSavingOverlay from '../TreeSavingOverlay.vue'

const OVERLAY = '[data-testid="tree-saving-overlay"]'

describe('TreeSavingOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('não aparece nem anuncia nada quando não está salvando', () => {
    const wrapper = mount(TreeSavingOverlay, { props: { visible: false } })
    expect(wrapper.find(OVERLAY).exists()).toBe(false)
    expect(wrapper.get('[role="status"]').text()).toBe('')
  })

  it('mostra a tela de cadastro e anuncia o andamento para leitores de tela', async () => {
    const wrapper = mount(TreeSavingOverlay, { props: { visible: false } })
    await wrapper.setProps({ visible: true })

    const overlay = wrapper.get(OVERLAY)
    expect(overlay.text()).toContain('Cadastrando sua árvore')
    // O visual é decorativo: o anúncio vem da região viva persistente.
    expect(overlay.attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('[role="status"]').attributes('aria-live')).toBe('polite')
    expect(wrapper.get('[role="status"]').text()).toContain('Cadastrando sua árvore')
  })

  it('troca o texto na etapa da medição', async () => {
    const wrapper = mount(TreeSavingOverlay, { props: { visible: true, step: 'tree' } })
    await wrapper.setProps({ step: 'measurement' })

    expect(wrapper.get(OVERLAY).text()).toContain('Registrando a medição')
    expect(wrapper.get(OVERLAY).text()).toContain('altura e largura da copa')
    expect(wrapper.get('[role="status"]').text()).toContain('Registrando a medição')
  })

  it('permanece por um tempo mínimo para não piscar em respostas rápidas', async () => {
    const wrapper = mount(TreeSavingOverlay, { props: { visible: false } })
    await wrapper.setProps({ visible: true })
    vi.advanceTimersByTime(100)

    await wrapper.setProps({ visible: false })
    // O anúncio de andamento para na hora, mas o visual ainda não sumiu.
    expect(wrapper.get('[role="status"]').text()).toBe('')
    expect(wrapper.find(OVERLAY).exists()).toBe(true)

    vi.advanceTimersByTime(599)
    await wrapper.vm.$nextTick()
    expect(wrapper.find(OVERLAY).exists()).toBe(true)

    vi.advanceTimersByTime(2)
    await wrapper.vm.$nextTick()
    expect(wrapper.find(OVERLAY).exists()).toBe(false)
  })

  it('cancela o fechamento pendente se uma nova gravação começar', async () => {
    const wrapper = mount(TreeSavingOverlay, { props: { visible: false } })
    await wrapper.setProps({ visible: true })
    await wrapper.setProps({ visible: false })
    await wrapper.setProps({ visible: true })

    vi.advanceTimersByTime(5000)
    await wrapper.vm.$nextTick()
    expect(wrapper.find(OVERLAY).exists()).toBe(true)
  })

  it('limpa o temporizador ao desmontar', async () => {
    const wrapper = mount(TreeSavingOverlay, { props: { visible: true } })
    await wrapper.setProps({ visible: false })
    wrapper.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
