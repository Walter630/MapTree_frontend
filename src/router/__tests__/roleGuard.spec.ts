import { apiConnect } from '@/plugins/apiConnect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Cobre o guard de rota por role (beforeEach em src/router/index.ts):
 * um usuário com role 'USER' que tenta acessar uma rota com meta.role
 * ADMIN/MANAGER deve ser redirecionado para /user (a home da própria role),
 * SEM ser deslogado.
 *
 * Observação de arquitetura: este guard é apenas UX. A autorização real é feita
 * no backend (guards JWT). Ver .agents/tasks/security-notes.md.
 */

// Store Pinia mockada: usuário já carregado como USER, então o guard não tenta
// buscar o perfil via API.
const mockStore = {
  user: { role: 'USER' } as { role: string } | null,
  setUser: vi.fn(),
  logout: vi.fn(),
}

vi.mock('@/stores/app', () => ({
  useAppStore: () => mockStore,
}))

// apiConnect mockado: autenticado (há token), get nunca deve ser chamado neste
// cenário porque o store já tem o usuário.
vi.mock('@/plugins/apiConnect', () => ({
  apiConnect: {
    isAuthenticated: vi.fn(() => true),
    get: vi.fn(),
  },
}))

describe('router role guard', () => {
  beforeEach(() => {
    mockStore.user = { role: 'USER' }
    mockStore.logout.mockClear()
    vi.mocked(apiConnect.isAuthenticated).mockReturnValue(true)
    vi.resetModules()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('redireciona um USER para /user ao tentar acessar uma rota de ADMIN', async () => {
    const { default: router } = await import('../index')
    await router.push('/admin/managers')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/user')
    expect(mockStore.logout).not.toHaveBeenCalled()
  })

  it('redireciona um USER para /user ao tentar acessar uma rota de MANAGER', async () => {
    const { default: router } = await import('../index')
    await router.push('/manager/employees')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/user')
    expect(mockStore.logout).not.toHaveBeenCalled()
  })

  it('permite que um USER acesse a própria rota de USER', async () => {
    const { default: router } = await import('../index')
    await router.push('/user/reports')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/user/reports')
    expect(mockStore.logout).not.toHaveBeenCalled()
  })

  it.each([
    '/admin',
    '/manager/routes/daily',
    '/user/podas',
    '/edit-account',
    '/nova-pagina',
    '/dashboard-previews',
  ])('exige sessão em %s', async (path) => {
    vi.mocked(apiConnect.isAuthenticated).mockReturnValue(false)
    const { default: router } = await import('../index')
    await router.push(path)
    expect(router.currentRoute.value.path).toBe('/login')
  })
  it('falha fechada quando não consegue validar o perfil da sessão', async () => {
    mockStore.user = null
    vi.mocked(apiConnect.get).mockRejectedValue(new Error('offline'))
    const { default: router } = await import('../index')
    await router.push('/admin')
    expect(router.currentRoute.value.path).toBe('/login')
    expect(mockStore.logout).not.toHaveBeenCalled()
  })
})
