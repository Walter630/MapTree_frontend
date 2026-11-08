import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminDashboard from './MainComponentAdmin.vue'
import { apiConnect } from '@/plugins/apiConnect'

vi.mock('@/plugins/apiConnect', () => ({ apiConnect: { get: vi.fn(), post: vi.fn() } }))
vi.mock('@/stores/app', () => ({ useAppStore: () => ({ user: { name: 'Ana Administradora' } }) }))
const organizations = [
  {
    id: 'older',
    name: 'Empresa Antiga',
    taxId: '123',
    isActive: true,
    createdAt: '2025-01-01T12:00:00Z',
    manager: { id: 'manager', name: 'Maria' },
  },
  {
    id: 'newer',
    name: 'Empresa Nova',
    taxId: '456',
    isActive: false,
    createdAt: '2026-11-01T12:00:00Z',
    manager: null,
  },
]
const get = vi.mocked(apiConnect.get)
function mountDashboard() {
  return shallowMount(AdminDashboard, {
    global: {
      renderStubDefaultSlot: true,
      stubs: {
        ...Object.fromEntries(
          [
            'VContainer',
            'VIcon',
            'VBtn',
            'VAlert',
            'VSkeletonLoader',
            'VSelect',
            'VChip',
            'VPagination',
            'VProgressLinear',
            'VCardText',
            'VSpacer',
            'VCardActions',
            'VCard',
            'VDialog',
            'VSnackbar',
          ].map((name) => [name, true]),
        ),
        RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
        VTextField: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template:
            '<input aria-label="Buscar empresa" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
      },
    },
  })
}
beforeEach(() => {
  vi.resetAllMocks()
  get.mockImplementation(
    async (url) =>
      ({
        data:
          url === '/organizations' ? organizations : url === '/users' ? [{ id: 'manager' }] : [],
      }) as Awaited<ReturnType<typeof apiConnect.get>>,
  )
})

describe('Painel administrativo', () => {
  it('consulta apenas gestores, conta todas as páginas e ordena empresas por data real', async () => {
    get.mockImplementation(
      async (url, config) =>
        ({
          data:
            url === '/organizations'
              ? organizations
              : url === '/users'
                ? [{ id: 'manager' }]
                : url === '/species'
                  ? (config as { params?: { page?: number } } | undefined)?.params?.page === 1
                    ? Array.from({ length: 500 }, (_, id) => ({ id }))
                    : [{ id: 501 }]
                  : [],
        }) as Awaited<ReturnType<typeof apiConnect.get>>,
    )
    const wrapper = mountDashboard()
    await flushPromises()
    expect(get).toHaveBeenCalledWith('/users', { params: { role: 'MANAGER' } })
    expect(get).toHaveBeenCalledWith('/species', { params: { page: 2, limit: 500 } })
    expect(wrapper.findAll('.kpi-value').map((item) => item.text())).toEqual(['2', '1', '0', '501'])
    const rows = wrapper.findAll('tbody tr')
    expect(rows[0]!.text()).toContain('Empresa Nova')
    expect(rows[0]!.text()).toContain('01/11/2026')
    expect(rows[1]!.text()).toContain('Empresa Antiga')
    wrapper.unmount()
  })
  it('busca por empresa e gestor e distingue lista vazia de resultado não encontrado', async () => {
    const wrapper = mountDashboard()
    await flushPromises()
    await wrapper.get('input').setValue('Maria')
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    expect(wrapper.get('tbody').text()).toContain('Empresa Antiga')
    await wrapper.get('input').setValue('inexistente')
    expect(wrapper.text()).toContain('Nenhuma empresa encontrada')
    expect(wrapper.text()).not.toContain('Sua primeira empresa começa aqui')
    wrapper.unmount()
  })
  it('mantém dados disponíveis quando uma consulta falha sem apresentar falha como zero', async () => {
    get.mockImplementation(async (url) => {
      if (url === '/users') throw new Error('API indisponível')
      return { data: url === '/organizations' ? organizations : [] } as Awaited<
        ReturnType<typeof apiConnect.get>
      >
    })
    const wrapper = mountDashboard()
    await flushPromises()
    expect(wrapper.text()).toContain('Não foi possível carregar: gestores')
    expect(wrapper.findAll('.kpi-value').map((item) => item.text())).toEqual(['2', '—', '0', '0'])
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    expect(apiConnect.post).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
