import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { createVuetify } from 'vuetify'
import { routerKey } from 'vue-router'
import { VBtn } from 'vuetify/components/VBtn'
import { VCol, VContainer, VRow } from 'vuetify/components/VGrid'
import { VForm } from 'vuetify/components/VForm'
import { VIcon } from 'vuetify/components/VIcon'
import { VTextField } from 'vuetify/components/VTextField'
import { VExpandTransition } from 'vuetify/components/transitions'
import RegisterComponent from '../RegisterComponent.vue'

// jsdom lacks ResizeObserver, which Vuetify's loading spinner (VProgressCircular) relies on.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

const vuetify = createVuetify({
  components: {
    VBtn,
    VCol,
    VContainer,
    VExpandTransition,
    VForm,
    VIcon,
    VRow,
    VTextField,
  },
})

describe('RegisterComponent', () => {
  const mountComponent = () => {
    const post = vi.fn().mockResolvedValue({ status: 201 })
    const push = vi.fn()
    const wrapper = mount(RegisterComponent, {
      global: {
        plugins: [vuetify],
        provide: {
          [routerKey as symbol]: { push },
        },
        mocks: {
          $api: { post },
        },
      },
    })

    return { wrapper, post, push }
  }

  it('mantém CPF e telefone mascarados no valor renderizado durante a edição', async () => {
    const { wrapper } = mountComponent()
    const cpfInput = wrapper.get('#cpf-input')
    const phoneInput = wrapper.get('#phone-input')

    await cpfInput.setValue('abc12345678901234')
    expect((cpfInput.element as HTMLInputElement).value).toBe('123.456.789-01')

    await phoneInput.setValue('abc11987654321000')
    expect((phoneInput.element as HTMLInputElement).value).toBe('(11) 98765-4321')

    await phoneInput.setValue('1187654321')
    expect((phoneInput.element as HTMLInputElement).value).toBe('(11) 8765-4321')
  })

  it('envia CPF e telefone normalizados para a API', async () => {
    const { wrapper, post } = mountComponent()
    const cpfInput = wrapper.get('#cpf-input')
    const phoneInput = wrapper.get('#phone-input')

    await cpfInput.setValue('12345678901')
    await phoneInput.setValue('(11) 98765-4321')
    const vm = wrapper.vm as unknown as {
      formData: { name: string; email: string; password: string }
      registrar: () => Promise<void>
    }
    vm.formData.name = 'Usuário Teste'
    vm.formData.email = 'usuario@example.com'
    vm.formData.password = 'senha123'

    await vm.registrar()
    await nextTick()

    expect(post).toHaveBeenCalledWith(
      '/auth/register',
      expect.objectContaining({
        cpf: '12345678901',
        phone: '11987654321',
      }),
    )
  })
})
