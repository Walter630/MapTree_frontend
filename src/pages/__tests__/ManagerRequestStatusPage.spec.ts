import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn(), logout: vi.fn() }))
vi.mock('@/plugins/apiConnect', () => ({ apiConnect: api }))

import ManagerRequestStatusPage from '../ManagerRequestStatusPage.vue'

const pendingRequest = {
  id: 'request-1',
  status: 'PENDING',
  version: 1,
  revision: 1,
  requestedOrganizationName: 'Empresa Verde',
  municipalityName: 'Tabuleiro do Norte',
  municipalityUf: 'CE',
  createdAt: '2026-11-18T12:00:00.000Z',
  updatedAt: '2026-11-18T12:00:00.000Z',
  applicant: { id: 'user-1', name: 'Joana Silva', email: 'joana@example.test', phone: '88988888888' },
}

async function mountPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  })
  await router.push('/')
  await router.isReady()
  return mount(ManagerRequestStatusPage, { global: { plugins: [router] } })
}

describe('ManagerRequestStatusPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.get.mockResolvedValue({ data: pendingRequest })
  })

  it('carrega estado e dados da solicitação do endpoint autenticado', async () => {
    const wrapper = await mountPage()
    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/users/me/manager-request')
    expect(wrapper.text()).toContain('Em análise')
    expect(wrapper.text()).toContain('Empresa Verde')
    expect(wrapper.text()).toContain('Tabuleiro do Norte / CE')
    expect(wrapper.text()).toContain('A equipe MapTree está analisando')
  })

  it('mostra a correção somente após rejeição e preserva a justificativa', async () => {
    api.get.mockResolvedValue({
      data: { ...pendingRequest, status: 'REJECTED', rejectionReason: 'Confirme os dados da empresa.' },
    })
    const wrapper = await mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('Confirme os dados da empresa.')
    expect(wrapper.text()).toContain('Corrigir e reenviar')
    expect(wrapper.find('form').exists()).toBe(true)
  })
})
