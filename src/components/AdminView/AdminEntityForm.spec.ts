import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { routerKey } from 'vue-router'
import AdminEntityForm from './AdminEntityForm.vue'
const post = vi.fn()
vi.mock('@/plugins/apiConnect', () => ({
  apiConnect: {
    post: (...args: unknown[]) => post(...args),
    get: vi.fn().mockResolvedValue({ data: [] }),
  },
}))
globalThis.ResizeObserver ||= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
const vuetify = createVuetify({ components, directives })
function mountForm() {
  const push = vi.fn()
  const wrapper = mount(AdminEntityForm, {
    props: { kind: 'manager' },
    global: {
      plugins: [vuetify],
      provide: { [routerKey as symbol]: { push } },
      stubs: { PageHeader: true },
    },
  })
  return { wrapper, push }
}
type FormVm = {
  fields: { name: string; email: string; cpf: string; phone: string; password: string }
  save: () => Promise<void>
}
async function fill(wrapper: ReturnType<typeof mountForm>['wrapper']) {
  const vm = wrapper.vm as unknown as FormVm
  Object.assign(vm.fields, {
    name: 'Teste de cadastro',
    email: 'test@example.test',
    cpf: '529.982.247-25',
    phone: '(85) 99999-0000',
    password: 'valid-test-password',
  })
  await nextTick()
  return vm
}
beforeEach(() => {
  post.mockReset()
})
describe('Cadastro administrativo de gestor', () => {
  it('usa o endpoint administrativo e envia o perfil MANAGER, sem cadastro público', async () => {
    post.mockResolvedValue({ data: { id: 'manager' } })
    const { wrapper, push } = mountForm()
    const vm = await fill(wrapper)
    await vm.save()
    await flushPromises()
    expect(post).toHaveBeenCalledWith(
      '/users',
      expect.objectContaining({ role: 'MANAGER', cpf: '52998224725', phone: '85999990000' }),
    )
    expect(push).toHaveBeenCalledWith('/admin/managers')
    wrapper.unmount()
  })
  it('mantém os campos quando a API rejeita o cadastro e não navega', async () => {
    post.mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { message: 'E-mail já cadastrado.' } },
    })
    const { wrapper, push } = mountForm()
    const vm = await fill(wrapper)
    await vm.save()
    expect(wrapper.text()).toContain('E-mail já cadastrado.')
    expect(vm.fields.name).toBe('Teste de cadastro')
    expect(push).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
