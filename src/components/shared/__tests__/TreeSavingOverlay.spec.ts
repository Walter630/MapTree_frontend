import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TreeSavingOverlay from '../TreeSavingOverlay.vue'

const OVERLAY = '[data-testid="tree-saving-progress"]'
const mountOverlay = (props: { visible: boolean; step?: 'tree' | 'measurement'; progress?: number }) =>
  mount(TreeSavingOverlay, {
    props,
    global: { stubs: { VProgressLinear: { template: '<div data-testid="progress-bar" />' } } },
  })

describe('TreeSavingOverlay', () => {
  it('não aparece quando não está salvando', () => {
    const wrapper = mountOverlay({ visible: false })
    expect(wrapper.find(OVERLAY).exists()).toBe(false)
  })

  it('mostra o progresso confirmado da árvore perto da ação', () => {
    const wrapper = mountOverlay({ visible: true, progress: 50 })
    expect(wrapper.get(OVERLAY).text()).toContain('Salvando árvore')
    expect(wrapper.get(OVERLAY).text()).toContain('50%')
    expect(wrapper.get(OVERLAY).attributes('aria-live')).toBe('polite')
  })

  it('mostra 100% quando a medição foi confirmada', () => {
    const wrapper = mountOverlay({ visible: true, step: 'measurement', progress: 100 })
    expect(wrapper.get(OVERLAY).text()).toContain('Salvando medição')
    expect(wrapper.get(OVERLAY).text()).toContain('100%')
  })
})
