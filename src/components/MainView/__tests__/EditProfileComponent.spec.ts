import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UserRole } from '@/plugins/apiConnect'
import { useAppStore } from '@/stores/app'
import EditProfileComponent from '../EditProfileComponent.vue'

const { get, patch } = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }))
vi.mock('@/plugins/apiConnect', () => ({
  UserRole: { USER: 'USER', MANAGER: 'MANAGER' },
  apiConnect: { get, patch },
}))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))

const user = {
  id: 'profile-id',
  name: 'Nome original',
  email: 'conta@example.test',
  phone: '85999999999',
  cpf: '00000000000',
  role: UserRole.USER,
  organization: { id: 'org-id', name: 'Equipe de campo' },
  isActive: true,
}

async function mountProfile() {
  const pinia = createPinia()
  const wrapper = mount(EditProfileComponent, {
    global: {
      plugins: [pinia],
      stubs: {
        VAvatar: true,
        VBtn: true,
        VCard: { template: '<div><slot /></div>' },
        VChip: true,
        VIcon: true,
        VProgressLinear: true,
        VDivider: true,
        VForm: { template: '<form><slot /></form>' },
        VTextField: {
          props: ['modelValue', 'label'],
          emits: ['update:modelValue'],
          template:
            '<input :aria-label="label" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        VSnackbar: { template: '<div role="status"><slot /></div>' },
      },
    },
  })
  await flushPromises()
  return { wrapper, store: useAppStore(pinia) }
}

describe('Editar perfil', () => {
  beforeEach(() => {
    get.mockReset().mockResolvedValue({ data: user })
    patch.mockReset()
  })

  it('salva pelo PATCH e preserva a organização ausente na resposta de atualização', async () => {
    const { organization, ...fields } = user
    patch.mockResolvedValue({ data: { ...fields, name: 'Nome persistido' } })
    const { wrapper, store } = await mountProfile()

    await wrapper.get('[aria-label="Nome completo"]').setValue(' Nome editado ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(patch).toHaveBeenCalledWith('/users/profile-id', {
      name: 'Nome editado',
      email: user.email,
      phone: user.phone,
      cpf: user.cpf,
    })
    expect(store.user).toMatchObject({ name: 'Nome persistido', organization })
    expect(wrapper.get('[role="status"]').text()).toBe('Perfil atualizado com sucesso.')
    wrapper.unmount()
  })

  it('recarrega o perfil quando a API devolve a contagem de registros alterados', async () => {
    const manager = { ...user, role: UserRole.MANAGER }
    const updated = { ...manager, name: 'Gestor atualizado' }
    get.mockResolvedValueOnce({ data: manager }).mockResolvedValueOnce({ data: updated })
    patch.mockResolvedValue({ data: { count: 1 } })
    const { wrapper, store } = await mountProfile()

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(get).toHaveBeenNthCalledWith(2, '/users/me/profile')
    expect(store.user).toEqual(updated)
    wrapper.unmount()
  })

  it('preserva o formulário quando a API confirma que nenhum perfil foi atualizado', async () => {
    patch.mockResolvedValue({ data: { count: 0 } })
    const { wrapper, store } = await mountProfile()
    const nameField = wrapper.get<HTMLInputElement>('[aria-label="Nome completo"]')
    await nameField.setValue('Nome em edição')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(nameField.element.value).toBe('Nome em edição')
    expect(store.user?.name).toBe(user.name)
    expect(wrapper.get('[role="status"]').text()).toBe(
      'A API não confirmou a atualização do perfil.',
    )
    wrapper.unmount()
  })
})
