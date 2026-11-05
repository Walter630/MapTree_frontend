import { test, expect, type Page } from '@playwright/test'

const email = process.env.E2E_EMAIL
const password = process.env.E2E_PASSWORD
const apiOrigin = process.env.E2E_API_URL ? new URL(process.env.E2E_API_URL).origin : undefined
const endpoint = (url: string, path: string) => {
  const parsed = new URL(url)
  return (
    parsed.pathname.replace(/\/$/, '').endsWith(path) && (!apiOrigin || parsed.origin === apiOrigin)
  )
}

async function login(page: Page) {
  if (!email || !password)
    throw new Error('Configure E2E_EMAIL e E2E_PASSWORD com uma conta de teste antes de executar.')
  await page.goto('/login')
  await page.getByPlaceholder('Digite seu email').fill(email)
  await page.getByPlaceholder('Digite sua senha').fill(password)
  const responsePromise = page.waitForResponse(
    (response) => response.request().method() === 'POST' && endpoint(response.url(), '/auth/login'),
  )
  await page.getByRole('button', { name: 'entrar', exact: true }).click()
  const response = await responsePromise
  expect(response.status(), 'O login da conta de teste deve ser aceito').toBe(201)
  await expect(page).toHaveURL(/\/(user|manager|admin)\/?$/)
  return new URL(response.url())
}

async function reloadAuthenticated(page: Page) {
  const profilePromise = page.waitForResponse(
    (response) => endpoint(response.url(), '/users/me/profile') && response.status() === 200,
  )
  await page.reload()
  await profilePromise
  await expect(page).toHaveURL(/\/(user|manager|admin)\/?$/)
}

async function invalidateAccessToken(page: Page) {
  // Força um 401 do backend real, sem esperar o prazo de expiração.
  // Apenas o estado isolado deste navegador de teste é alterado.
  await page.evaluate(() => localStorage.setItem('accessToken', 'invalid-session-test-token'))
}

test('a página de login fica disponível no ambiente escolhido', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByPlaceholder('Digite seu email')).toBeVisible()
  await expect(page.getByPlaceholder('Digite sua senha')).toBeVisible()
  await expect(page.getByRole('button', { name: 'entrar', exact: true })).toBeVisible()
})

test.describe('Sessão autenticada no navegador real', () => {
  test.beforeEach(() => {
    // Falhar explicitamente em vez de apresentar testes ignorados como validação.
    expect(
      Boolean(email && password),
      'Defina E2E_EMAIL e E2E_PASSWORD para uma conta de teste existente',
    ).toBe(true)
  })

  test('login guarda cookie HttpOnly e mantém o usuário após recarregar', async ({
    page,
    context,
  }) => {
    const api = await login(page)
    const refresh = (await context.cookies(api.href)).find(
      (cookie) => cookie.name === 'refreshToken',
    )
    expect(Boolean(refresh), 'O navegador deve aceitar o cookie de refresh').toBe(true)
    expect(refresh?.httpOnly).toBe(true)
    expect(
      Boolean(refresh?.secure || api.protocol !== 'https:'),
      'Cookies de produção HTTPS devem ser Secure',
    ).toBe(true)
    await reloadAuthenticated(page)
    await expect
      .poll(() => page.evaluate(() => Boolean(localStorage.getItem('accessToken'))))
      .toBe(true)
  })

  test('renova o acesso enviando o cookie e repete a chamada protegida', async ({ page }) => {
    await login(page)
    await invalidateAccessToken(page)
    const refreshPromise = page.waitForResponse((response) =>
      endpoint(response.url(), '/auth/refresh'),
    )
    await page.reload()
    const response = await refreshPromise
    const headers = await response.request().allHeaders()
    expect(
      headers.cookie?.includes('refreshToken='),
      'O navegador deve enviar o cookie ao backend',
    ).toBe(true)
    expect(response.status(), 'O backend deve renovar a sessão').toBe(201)
    await expect(page).toHaveURL(/\/(user|manager|admin)\/?$/)
    await expect
      .poll(() =>
        page.evaluate(() => {
          const token = localStorage.getItem('accessToken')
          return Boolean(token && token !== 'invalid-session-test-token')
        }),
      )
      .toBe(true)
    // Recarregar novamente exige que o token renovado funcione na API real.
    await reloadAuthenticated(page)
  })

  test('volta ao login quando o refresh não existe, sem manter sessão inválida', async ({
    page,
    context,
  }) => {
    await login(page)
    await context.clearCookies({ name: 'refreshToken' })
    await invalidateAccessToken(page)
    const refreshPromise = page.waitForResponse((response) =>
      endpoint(response.url(), '/auth/refresh'),
    )
    await page.reload()
    expect((await refreshPromise).status()).toBe(401)
    await expect(page).toHaveURL(/\/login\/?$/)
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('accessToken') === null))
      .toBe(true)
  })

  test('logout remove cookie e token e bloqueia a reabertura do painel', async ({
    page,
    context,
  }) => {
    const api = await login(page)
    const protectedURL = page.url()
    const logoutPromise = page.waitForResponse((response) =>
      endpoint(response.url(), '/auth/logout'),
    )
    await page.goto('/logout')
    expect((await logoutPromise).status()).toBe(201)
    await expect(page).toHaveURL(/\/login\/?$/)
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('accessToken') === null))
      .toBe(true)
    expect((await context.cookies(api.href)).some((cookie) => cookie.name === 'refreshToken')).toBe(
      false,
    )
    await page.goto(protectedURL)
    await expect(page).toHaveURL(/\/login\/?$/)
  })
})
