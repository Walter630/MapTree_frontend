import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { apiConnect } from './apiConnect'

const originalAdapter = apiConnect.api.defaults.adapter
function ok(config: InternalAxiosRequestConfig) {
  return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config }
}
function fail(config: InternalAxiosRequestConfig, status: number): never {
  throw new AxiosError('Request failed', String(status), config, undefined, {
    ...ok(config),
    status,
  })
}
beforeEach(() => {
  localStorage.clear()
  apiConnect.setToken('old-token')
  window.history.replaceState({}, '', '/login')
})
afterEach(() => {
  apiConnect.api.defaults.adapter = originalAdapter
  localStorage.clear()
  vi.restoreAllMocks()
})

it.each([{ accessToken: 'new-token' }, 'new-token'])(
  'renova após 401, salva o token e repete a chamada com o contrato %j',
  async (data) => {
    const refresh = vi.spyOn(axios, 'post').mockResolvedValue({ data })
    const attempts: string[] = []
    apiConnect.api.defaults.adapter = async (config) => {
      attempts.push(String(config.headers.Authorization))
      if (attempts.length === 1) fail(config, 401)
      return ok(config)
    }
    const response = await apiConnect.get('/trees')
    expect(response.status).toBe(200)
    expect(attempts).toEqual(['Bearer old-token', 'Bearer new-token'])
    expect(refresh).toHaveBeenCalledOnce()
    expect(refresh).toHaveBeenCalledWith(
      expect.stringContaining('/auth/refresh'),
      {},
      expect.objectContaining({ withCredentials: true }),
    )
    expect(apiConnect.getToken().accessToken).toBe('new-token')
  },
)

it('reúne duas chamadas com 401 em uma renovação e libera ambas com o token novo', async () => {
  let finish!: (value: unknown) => void
  const refresh = vi.spyOn(axios, 'post').mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  const retried: string[] = []
  apiConnect.api.defaults.adapter = async (config) => {
    if (config.headers.Authorization === 'Bearer old-token') fail(config, 401)
    retried.push(config.url!)
    return ok(config)
  }
  const one = apiConnect.get('/trees')
  const two = apiConnect.get('/species')
  await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce())
  finish({ data: { accessToken: 'new-token' } })
  await Promise.all([one, two])
  expect(retried.sort()).toEqual(['/species', '/trees'])
  expect(refresh).toHaveBeenCalledOnce()
})

it('limpa a sessão e rejeita as chamadas em fila se o refresh falhar', async () => {
  let rejectRefresh!: (reason: Error) => void
  const refresh = vi.spyOn(axios, 'post').mockImplementation(
    () =>
      new Promise((_resolve, reject) => {
        rejectRefresh = reject
      }),
  )
  const unauthorized = vi.fn()
  window.addEventListener('auth:unauthorized', unauthorized)
  apiConnect.api.defaults.adapter = async (config) => fail(config, 401)
  try {
    const results = Promise.allSettled([apiConnect.get('/trees'), apiConnect.get('/species')])
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce())
    rejectRefresh(Object.assign(new Error('Refresh expirado'), { response: { status: 401 } }))
    expect((await results).every((result) => result.status === 'rejected')).toBe(true)
    expect(apiConnect.isAuthenticated()).toBe(false)
    expect(unauthorized).toHaveBeenCalledOnce()
  } finally {
    window.removeEventListener('auth:unauthorized', unauthorized)
  }
})

it.each([403, 500])('não renova nem apaga a sessão por erro HTTP %s', async (status) => {
  const refresh = vi.spyOn(axios, 'post')
  apiConnect.api.defaults.adapter = async (config) => fail(config, status)
  await expect(apiConnect.get('/trees')).rejects.toMatchObject({ response: { status } })
  expect(refresh).not.toHaveBeenCalled()
  expect(apiConnect.getToken().accessToken).toBe('old-token')
})

it('não entra em loop se a chamada repetida continuar retornando 401', async () => {
  const refresh = vi.spyOn(axios, 'post').mockResolvedValue({ data: { accessToken: 'new-token' } })
  apiConnect.api.defaults.adapter = async (config) => fail(config, 401)
  await expect(apiConnect.get('/trees')).rejects.toMatchObject({ response: { status: 401 } })
  expect(refresh).toHaveBeenCalledOnce()
})

it('erro de senha no login não tenta renovar a sessão', async () => {
  const refresh = vi.spyOn(axios, 'post')
  apiConnect.api.defaults.adapter = async (config) => fail(config, 401)
  await expect(
    apiConnect.api.post('/auth/login', { email: 'test@example.test', password: 'wrong-password' }),
  ).rejects.toMatchObject({ response: { status: 401 } })
  expect(refresh).not.toHaveBeenCalled()
})

it('limita a uma renovação mesmo quando duas chamadas simultâneas continuam com 401', async () => {
  let finish!: (value: unknown) => void
  const refresh = vi
    .spyOn(axios, 'post')
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    .mockResolvedValue({ data: { accessToken: 'still-rejected' } })
  apiConnect.api.defaults.adapter = async (config) => fail(config, 401)
  const results = Promise.allSettled([apiConnect.get('/trees'), apiConnect.get('/species')])
  await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce())
  finish({ data: { accessToken: 'still-rejected' } })
  expect((await results).every((result) => result.status === 'rejected')).toBe(true)
  expect(refresh).toHaveBeenCalledOnce()
})

it.each([undefined, 500, 503])(
  'preserva a sessão se a renovação falha temporariamente: %s',
  async (status) => {
    const temporaryError = Object.assign(
      new Error('Falha temporária'),
      status ? { response: { status } } : {},
    )
    const refresh = vi.spyOn(axios, 'post').mockRejectedValue(temporaryError)
    const unauthorized = vi.fn()
    window.addEventListener('auth:unauthorized', unauthorized)
    apiConnect.api.defaults.adapter = async (config) => fail(config, 401)
    try {
      await expect(apiConnect.get('/trees')).rejects.toBe(temporaryError)
      expect(refresh).toHaveBeenCalledOnce()
      expect(apiConnect.getToken().accessToken).toBe('old-token')
      expect(unauthorized).not.toHaveBeenCalled()
    } finally {
      window.removeEventListener('auth:unauthorized', unauthorized)
    }
  },
)
