import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { createVuetify } from 'vuetify'
import { routerKey } from 'vue-router'
import { VAvatar } from 'vuetify/components/VAvatar'
import { VBtn } from 'vuetify/components/VBtn'
import { VCard, VCardItem, VCardSubtitle, VCardTitle } from 'vuetify/components/VCard'
import { VCol, VContainer, VRow } from 'vuetify/components/VGrid'
import { VDivider } from 'vuetify/components/VDivider'
import { VForm } from 'vuetify/components/VForm'
import { VIcon } from 'vuetify/components/VIcon'
import { VTextField } from 'vuetify/components/VTextField'
import RegisterEmployee from '../RegisterEmployee.vue'

const vuetify = createVuetify({
  components: {
    VAvatar,
    VBtn,
    VCard,
    VCardItem,
    VCardSubtitle,
    VCardTitle,
    VCol,
    VContainer,
    VDivider,
    VForm,
    VIcon,
    VRow,
    VTextField,
  },
})

describe('RegisterEmployee', () => {
  const mountComponent = () => {
    const post = vi.fn().mockResolvedValue({ status: 201 })
    const push = vi.fn()
    const wrapper = mount(RegisterEmployee, {
      global: {
        plugins: [vuetify],
        provide: {
          [routerKey as symbol]: { push, back: vi.fn() },
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

    await cpfInput.setValue('987.654.321-00')
    expect((cpfInput.element as HTMLInputElement).value).toBe('987.654.321-00')

    await phoneInput.setValue('abc11987654321000')
    expect((phoneInput.element as HTMLInputElement).value).toBe('(11) 98765-4321')

    await phoneInput.setValue('1187654321')
    expect((phoneInput.element as HTMLInputElement).value).toBe('(11) 8765-4321')
  })

  it('envia CPF e telefone normalizados para a API', async () => {
    const { wrapper, post, push } = mountComponent()
    const cpfInput = wrapper.get('#cpf-input')
    const phoneInput = wrapper.get('#phone-input')

    await cpfInput.setValue('12345678901')
    await phoneInput.setValue('(11) 98765-4321')
    const vm = wrapper.vm as unknown as {
      formData: { name: string; email: string; password: string }
      registrar: () => Promise<void>
    }
    vm.formData.name = 'Funcionário Teste'
    vm.formData.email = 'funcionario@example.com'
    vm.formData.password = 'senha123'

    await vm.registrar()
    await nextTick()

    expect(post).toHaveBeenCalledWith('/users', {
      name: 'Funcionário Teste',
      email: 'funcionario@example.com',
      phone: '11987654321',
      password: 'senha123',
      cpf: '12345678901',
      role: 'USER',
      isActive: true,
    })
    expect(push).toHaveBeenCalledWith('/manager/employees')
  })

  it('cancela o cadastro e volta para a lista de funcionários', () => {
    const { wrapper, push } = mountComponent()
    const vm = wrapper.vm as unknown as { cancelForm: () => void }

    vm.cancelForm()

    expect(push).toHaveBeenCalledWith('/manager/employees')
  })
})
