import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import PruningExecutionDialog from '../PruningExecutionDialog.vue'
const post = vi.fn()
vi.mock('@/plugins/apiConnect', () => ({
  apiConnect: { post: (...args: unknown[]) => post(...args) },
}))
globalThis.ResizeObserver ||= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
const vuetify = createVuetify({ components, directives })
const Dialog = defineComponent({
  props: ['modelValue'],
  setup:
    (props, { slots }) =>
    () =>
      props.modelValue ? h('div', slots.default?.()) : null,
})
function mountForm() {
  return mount(PruningExecutionDialog, {
    props: {
      modelValue: true,
      tree: { id: 'tree-one', species: { commonName: 'Ipê' }, latitude: -3.7, longitude: -38.5 },
      scheduleId: 'stop-one',
      order: 1,
      hasNext: true,
    },
    global: {
      plugins: [vuetify],
      stubs: {
        VDialog: Dialog,
        VSelect: defineComponent({ inheritAttrs: false, setup: () => () => h('div') }),
      },
    },
  })
}
type FormVm = {
  type: string
  date: string
  observations: string
  save: (next: boolean) => Promise<void>
}
async function fill(wrapper: ReturnType<typeof mountForm>) {
  const vm = wrapper.vm as unknown as FormVm
  vm.type = 'LIGHT'
  vm.date = '2026-01-01'
  vm.observations = 'Retirados galhos secos.'
  await nextTick()
  return vm
}
beforeEach(() => {
  post.mockReset()
})
describe('Registro de poda na parada', () => {
  it('mostra a identidade completa e envia o serviço à parada fixa, sem pedir outra árvore', async () => {
    post.mockResolvedValue({ data: { id: 'pruning', idTree: 'tree-one', type: 'LIGHT' } })
    const wrapper = mountForm()
    const vm = await fill(wrapper)
    expect(wrapper.text()).toContain('tree-one')
    expect(wrapper.text()).toContain('-3.700000, -38.500000')
    await vm.save(true)
    expect(post).toHaveBeenCalledWith('/scheduling/stop-one/complete', {
      type: 'LIGHT',
      date: '2026-01-01T12:00:00-03:00',
      observations: 'Retirados galhos secos.',
    })
    expect(wrapper.emitted('saved')?.[0]?.[1]).toBe(true)
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
    wrapper.unmount()
  })
  it('mantém os dados e a janela aberta quando o servidor falha', async () => {
    post.mockRejectedValue({ response: { status: 500 } })
    const wrapper = mountForm()
    const vm = await fill(wrapper)
    await vm.save(false)
    expect(vm.observations).toBe('Retirados galhos secos.')
    expect(vm.type).toBe('LIGHT')
    expect(wrapper.emitted('saved')).toBeUndefined()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    wrapper.unmount()
  })
  it('duplo clique não envia dois registros durante validação ou gravação', async () => {
    let finish!: (value: unknown) => void
    post.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const wrapper = mountForm()
    const vm = await fill(wrapper)
    const first = vm.save(false)
    await vm.save(false)
    await flushPromises()
    expect(post).toHaveBeenCalledTimes(1)
    finish({ data: { id: 'pruning' } })
    await first
    wrapper.unmount()
  })
})
