import { expect, test, type Page, type Route } from '@playwright/test'

type Profile = 'ADMIN' | 'MANAGER' | 'USER'

function registrationPath(profile: Profile) {
  if (profile === 'ADMIN') return '/admin/podas/nova'
  if (profile === 'MANAGER') return '/manager/podas/nova'
  return '/user/podas/nova'
}

function listPath(profile: Profile) {
  if (profile === 'ADMIN') return '/admin/podas'
  if (profile === 'MANAGER') return '/manager/podas'
  return '/user/podas'
}

async function setUpPruningFlow(page: Page, profile: Profile) {
  const base = test.info().project.use.baseURL as string
  const uiOrigin = new URL(base).origin
  const apiOrigin = 'http://localhost:4000'
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  const tree = {
    id: 'tree-pruning-1',
    createdById: 'employee-test',
    latitude: -3.7319,
    longitude: -38.5267,
    address: 'Rua de teste, Centro',
    status: 'NORMAL',
    species: { commonName: 'Ipê-amarelo', scientificName: 'Handroanthus albus' },
  }
  let persistedPruning: Record<string, unknown> | null = null
  let stopCompleted = false
  const requests: Array<{ method: string; path: string; body?: Record<string, unknown> }> = []

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.addInitScript(() => localStorage.setItem('accessToken', 'playwright-test-token'))
  await page.route('**/*', (route: Route) => {
    const origin = new URL(route.request().url()).origin
    return origin === uiOrigin || origin === apiOrigin ? route.continue() : route.abort()
  })
  await page.route('**/api/**', async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const body = request.method() === 'GET' ? undefined : request.postDataJSON()
    requests.push({ method: request.method(), path: url.pathname, body })

    if (url.pathname === '/api/users/me/profile') {
      return route.fulfill({
        status: 200,
        json: {
          id: profile === 'MANAGER' ? 'manager-test' : profile === 'ADMIN' ? 'admin-test' : 'employee-test',
          name: 'Conta de teste',
          email: 'pruning@example.test',
          role: profile,
          isActive: true,
          organization: { id: 'company-test', name: 'Empresa de teste' },
        },
      })
    }
    if (url.pathname === '/api/trees' && request.method() === 'GET') {
      return route.fulfill({ status: 200, json: [tree] })
    }
    if (url.pathname === '/api/scheduling' && request.method() === 'GET') {
      if (url.searchParams.get('date') === today) {
        return route.fulfill({ status: 200, json: [] })
      }
    }
    if (url.pathname === '/api/pruning' && request.method() === 'POST') {
      persistedPruning = {
        id: 'pruning-test-1',
        ...body,
        idTree: tree.id,
        tree,
      }
      return route.fulfill({ status: 201, json: persistedPruning })
    }
    if (url.pathname === '/api/pruning' && request.method() === 'GET') {
      return route.fulfill({ status: 200, json: persistedPruning ? [persistedPruning] : [] })
    }
    if (url.pathname.startsWith('/api/scheduling/') && request.method() === 'POST') {
      stopCompleted = true
      persistedPruning = {
        id: 'pruning-test-1',
        idTree: tree.id,
        scheduleId: 'schedule-test-1',
        type: body?.type,
        date: body?.date,
        observations: body?.observations,
        tree,
        schedule: {
          id: 'schedule-test-1',
          plannedDate: `${today}T12:00:00.000Z`,
          status: 'COMPLETED',
          routeOrder: 1,
        },
      }
      return route.fulfill({ status: 201, json: persistedPruning })
    }
    return route.fulfill({ status: 200, json: [] })
  })

  return {
    today,
    requests,
    readPruning: () => persistedPruning,
    stopWasCompleted: () => stopCompleted,
  }
}

for (const profile of ['MANAGER', 'USER', 'ADMIN'] as const) {
  test(`registra poda, recarrega histórico e abre lista para ${profile}`, async ({ page }) => {
    const state = await setUpPruningFlow(page, profile)
    await page.goto(registrationPath(profile))
    await expect(page.getByText('Informações da Poda', { exact: true })).toBeVisible()

    await page.getByPlaceholder('Busque por espécie ou identificador').fill('Ipê')
    await page.getByRole('option', { name: /Ipê-amarelo/ }).click()
    await page.locator('.v-select').click()
    await page.getByRole('option', { name: /Leve - Limpeza básica/ }).click()
    await page.locator('input[type="date"]').fill(state.today)
    await page.getByPlaceholder('Descreva detalhes sobre a poda realizada...').fill('Vistoria de campo')

    const saveResponse = page.waitForResponse(
      (response) => response.url().endsWith('/api/pruning') && response.request().method() === 'POST',
    )
    await page.getByRole('button', { name: 'Registrar Poda' }).click()
    expect((await saveResponse).status()).toBe(201)
    await expect(page.getByRole('heading', { name: 'Poda registrada!' })).toBeVisible()

    const record = state.readPruning()
    expect(record).toMatchObject({
      idTree: 'tree-pruning-1',
      type: 'LIGHT',
      observations: 'Vistoria de campo',
    })
    expect(new Date(String(record?.date)).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })).toBe(state.today)

    await page.getByRole('button', { name: /Ver Lista de Podas/i }).click()
    await expect(page).toHaveURL(new RegExp(`${listPath(profile)}$`))
    await expect(page.getByRole('heading', { name: 'Histórico de Podas' })).toBeVisible()
    await expect(page.getByText('Ipê-amarelo')).toBeVisible()
    await expect(page.getByText('Leve - Limpeza básica')).toBeVisible()
    await page.reload()
    await expect(page.getByText('Ipê-amarelo')).toBeVisible()
    expect(state.requests.some(({ path, method }) => path === '/api/pruning' && method === 'GET')).toBe(true)
  })
}

test('confirma poda vinculada a parada e não cria poda avulsa em paralelo', async ({ page }) => {
  const state = await setUpPruningFlow(page, 'USER')
  await page.route('**/api/scheduling**', async (route: Route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/scheduling' && route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        json: [
          {
            id: 'schedule-test-1',
            treeId: 'tree-pruning-1',
            type: 'PRUNING',
            status: 'PENDING',
            plannedDate: `${state.today}T12:00:00.000Z`,
            routeOrder: 1,
            tree: {
              id: 'tree-pruning-1',
              species: { commonName: 'Ipê-amarelo' },
              latitude: -3.7319,
              longitude: -38.5267,
            },
          },
        ],
      })
    }
    return route.fallback()
  })

  await page.goto(registrationPath('USER'))
  await page.getByPlaceholder('Busque por espécie ou identificador').fill('Ipê')
  await page.getByRole('option', { name: /Ipê-amarelo/ }).click()
  await page.locator('.v-select').click()
  await page.getByRole('option', { name: /Leve - Limpeza básica/ }).click()
  await page.locator('input[type="date"]').fill(state.today)
  await page.getByRole('button', { name: 'Registrar Poda' }).click()

  await expect(page.getByRole('heading', { name: 'Poda registrada!' })).toBeVisible()
  expect(state.stopWasCompleted()).toBe(true)
  expect(state.requests.some(({ path, method }) => path === '/api/pruning' && method === 'POST')).toBe(false)
  expect(state.requests.some(({ path, method }) => path === '/api/scheduling/schedule-test-1/complete' && method === 'POST')).toBe(true)
})
