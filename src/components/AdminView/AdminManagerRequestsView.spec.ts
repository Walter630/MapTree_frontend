import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@/plugins/apiConnect', () => ({ apiConnect: api }))

import AdminManagerRequestsView from './AdminManagerRequestsView.vue'

const requestItem = {
  id: 'request-1',
  status: 'PENDING',
  version: 1,
  revision: 1,
  requestedOrganizationName: 'Empresa Verde',
  municipalityName: 'Tabuleiro do Norte',
  municipalityUf: 'CE',
  createdAt: '2026-11-18T12:00:00.000Z',
  updatedAt: '2026-11-18T12:00:00.000Z',
  applicant: { id: 'user-1', name: 'Joana Silva', email: 'joana@example.test' },
}

describe('AdminManagerRequestsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.get.mockImplementation((url: string) => Promise.resolve({
      data: url === '/admin/manager-requests'
        ? { data: [requestItem], page: 1, limit: 50, total: 1, pages: 1 }
        : [],
    }))
  })

  it('lista solicitações pendentes e carrega empresas para a decisão administrativa', async () => {
    const wrapper = mount(AdminManagerRequestsView)
    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/admin/manager-requests', expect.objectContaining({
      params: expect.objectContaining({ status: 'PENDING', limit: 50 }),
    }))
    expect(api.get).toHaveBeenCalledWith('/organizations', { params: { page: 1, limit: 100 } })
    expect(wrapper.text()).toContain('Solicitações de gestores')
    expect(wrapper.text()).toContain('Joana Silva')
    expect(wrapper.text()).toContain('Empresa Verde')
  })
})
