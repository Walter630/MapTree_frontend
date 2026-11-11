import { shallowMount } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'
import LoginComponent from '../LoginComponent.vue'

vi.mock('@/plugins/googleAuth', () => ({ isGoogleAuthEnabled: () => false }))

it('envia a senha no primeiro vínculo Google somente após a confirmação explícita', async () => {
  const user = { id: 'test-user', role: 'USER' }
  const post = vi
    .fn()
    .mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 409, data: { code: 'GOOGLE_LINK_REQUIRED' } },
    })
    .mockResolvedValue({ data: { accessToken: 'test-access', user } })
  const push = vi.fn()
  const setToken = vi.fn()
  const wrapper = shallowMount(LoginComponent, {
    global: {
      mocks: {
        $api: { post, setToken },
        $store: { setUser: vi.fn() },
        $router: { push },
        $route: { query: {} },
      },
      stubs: Object.fromEntries(
        [
          'VContainer',
          'VRow',
          'VCol',
          'VForm',
          'VTextField',
          'VBtn',
          'VIcon',
          'VAlert',
          'VExpandTransition',
        ].map((name) => [name, { template: '<div><slot /></div>' }]),
      ),
    },
  })
  wrapper.vm.password = 'senha-de-teste'
  await wrapper.vm.loginWithGoogle('test-google-id-token')
  expect(post).toHaveBeenNthCalledWith(1, '/auth/google', { credential: 'test-google-id-token' })
  expect(wrapper.vm.password).toBe('')
  expect(wrapper.text()).toContain('Nos próximos acessos, basta entrar com o Google.')
  wrapper.vm.password = 'senha-de-teste'
  await wrapper.vm.login()
  expect(post).toHaveBeenNthCalledWith(2, '/auth/google', {
    credential: 'test-google-id-token',
    password: 'senha-de-teste',
  })
  expect(setToken).toHaveBeenCalledWith('test-access')
  expect(push).toHaveBeenCalledWith('/user')
  expect(wrapper.vm.pendingGoogleCredential).toBe('')

  await wrapper.vm.loginWithGoogle('next-google-id-token')
  expect(post).toHaveBeenNthCalledWith(3, '/auth/google', { credential: 'next-google-id-token' })
  expect(wrapper.vm.pendingGoogleCredential).toBe('')
  wrapper.unmount()
})
