import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'
import TreeFieldMeasurement from './TreeFieldMeasurement.vue'

const { post } = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock('@/plugins/apiConnect', () => ({ apiConnect: { post } }))

const measurement = {
  id: 'measurement-id',
  treeId: 'tree-id',
  height: 5.2,
  canopyWidth: 2.4,
  date: '2026-11-10T14:00:00Z',
}

function mountMeasurement() {
  return mount(TreeFieldMeasurement, {
    props: { treeId: 'tree-id', wireHeight: 6 },
    global: {
      stubs: {
        VIcon: { template: '<i />' },
        VBtn: { template: '<button><slot /></button>' },
        VForm: { template: '<form><slot /></form>' },
        VTextField: {
          props: ['modelValue', 'label'],
          emits: ['update:modelValue'],
          template: `<input :aria-label="label" :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />`,
        },
      },
    },
  })
}

beforeEach(() => {
  post.mockReset()
})

it('registra medidas com vírgula e apresenta os valores confirmados pela API', async () => {
  post.mockResolvedValue({ data: measurement })
  const wrapper = mountMeasurement()
  expect(wrapper.text()).toContain('Sem medição de campo disponível.')
  expect(wrapper.text()).toMatch(/Referência da fiação:\s*6 m/)
  await wrapper.get('button').trigger('click')
  await wrapper.get('[aria-label="Altura medida da árvore (m)"]').setValue('5,2')
  await wrapper.get('[aria-label="Largura medida da copa (m)"]').setValue('2,4')
  await wrapper.get('form').trigger('submit')
  await flushPromises()

  expect(post).toHaveBeenCalledWith('/measurements', {
    treeId: 'tree-id',
    height: 5.2,
    canopyWidth: 2.4,
  })
  expect(wrapper.emitted('saved')).toEqual([[measurement]])
  await wrapper.setProps({ measurement })
  expect(wrapper.get('[data-testid="measured-height"]').text()).toBe('5,2 m')
  expect(wrapper.get('[data-testid="measured-width"]').text()).toBe('2,4 m')
  expect(wrapper.text()).toContain('Medição de 10/11/2026')
  expect(wrapper.text()).toContain('Registrar nova medição')
  wrapper.unmount()
})

it('mostra traço sem medição e identifica a fiação como referência, ou indisponível', async () => {
  const wrapper = mountMeasurement()
  expect(wrapper.get('[data-testid="measured-height"]').text()).toBe('—')
  expect(wrapper.get('[data-testid="measured-width"]').text()).toBe('—')
  expect(wrapper.text()).toContain('não é uma medição física da fiação')

  await wrapper.setProps({ wireHeight: undefined })
  expect(wrapper.text()).toMatch(/Referência da fiação:\s*indisponível/)
  wrapper.unmount()
})

it('exige a largura da copa junto com a altura e não chama a API', async () => {
  const wrapper = mountMeasurement()
  await wrapper.get('button').trigger('click')
  await wrapper.get('[aria-label="Altura medida da árvore (m)"]').setValue('5')
  await wrapper.get('form').trigger('submit')
  await flushPromises()

  expect(post).not.toHaveBeenCalled()
  expect(wrapper.get('[role="alert"]').text()).toMatch(/largura da copa/i)
  wrapper.unmount()
})

it('rejeita altura inválida e preserva o formulário se a API rejeitar a gravação', async () => {
  post.mockRejectedValue({ response: { status: 401 } })
  const wrapper = mountMeasurement()
  await wrapper.get('button').trigger('click')
  const height = wrapper.get<HTMLInputElement>('[aria-label="Altura medida da árvore (m)"]')
  await height.setValue('-1')
  await wrapper.get('[aria-label="Largura medida da copa (m)"]').setValue('2')
  await wrapper.get('form').trigger('submit')
  expect(post).not.toHaveBeenCalled()

  await height.setValue('4,5')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(height.element.value).toBe('4,5')
  expect(wrapper.get('[role="alert"]').text()).toContain('Sua sessão expirou. Entre novamente.')
  expect(wrapper.emitted('saved')).toBeUndefined()
  wrapper.unmount()
})
