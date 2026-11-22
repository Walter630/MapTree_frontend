import { expect, test } from '@playwright/test'

const treeRecords = [
  {
    id: '507f1f77bcf86cd799439012',
    latitude: -3.73191,
    longitude: -38.52671,
    status: 'TO_PRUNE',
    effectiveStatus: 'TO_PRUNE',
    species: { commonName: 'Cajueiro', scientificName: 'Anacardium occidentale' },
  },
  {
    id: '507f1f77bcf86cd799439013',
    latitude: -3.73291,
    longitude: -38.52771,
    status: 'TO_PRUNE',
    effectiveStatus: 'TO_PRUNE',
    species: { commonName: 'Oitizeiro', scientificName: 'Licania tomentosa' },
  },
]

test('lista mensal, salva duas datas e abre a rota escolhida por link', async ({ page }) => {
  const base = test.info().project.use.baseURL as string
  const uiOrigin = new URL(base).origin
  const apiOrigin = 'http://localhost:4000'
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const firstDate = `${month}-05`
  const secondDate = `${month}-06`
  const stored = new Map<string, Set<string>>()
  const completedBySchedule = new Map<
    string,
    { date: string; type: string; observations: string }
  >()
  const requests: string[] = []
  const mapRequests: string[] = []
  const mapModuleRequests: string[] = []
  const browserErrors: string[] = []
  let failNextRouteRead = false

  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => localStorage.setItem('accessToken', 'playwright-test-token'))
  page.on('request', (request) => {
    if (/leaflet|routing-machine/i.test(request.url())) {
      mapModuleRequests.push(request.url())
    }
    if (/tile\.openstreetmap\.org|router\.project-osrm\.org/.test(request.url())) {
      mapRequests.push(request.url())
    }
  })
  page.on('pageerror', (error) => browserErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text())
  })
  await page.route('**/*', (route) => {
    const origin = new URL(route.request().url()).origin
    return origin === uiOrigin || origin === apiOrigin ? route.continue() : route.abort()
  })
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    requests.push(`${request.method()} ${url.pathname}${url.search}`)

    if (url.pathname === '/api/users/me/profile') {
      return route.fulfill({
        status: 200,
        json: {
          id: '507f1f77bcf86cd799439001',
          name: 'Operadora de teste',
          email: 'operator@example.test',
          cpf: '00000000000',
          phone: '',
          role: 'USER',
          isActive: true,
        },
      })
    }

    if (url.pathname === '/api/scheduling/daily-route' && request.method() === 'GET') {
      const summaries = [...stored.entries()]
        .map(([date, ids]) => {
          const scheduleIds = [...ids].map((_, index) => `schedule-${date}-${index + 1}`)
          return {
            date,
            pendingCount: scheduleIds.filter((id) => !completedBySchedule.has(id)).length,
            completedCount: scheduleIds.filter((id) => completedBySchedule.has(id)).length,
          }
        })
        .filter((summary) => summary.date.startsWith(url.searchParams.get('month') || ''))
      return route.fulfill({ status: 200, json: summaries })
    }

    if (url.pathname === '/api/trees' && request.method() === 'GET') {
      return route.fulfill({ status: 200, json: treeRecords })
    }

    if (url.pathname.startsWith('/api/scheduling/daily-route/') && request.method() === 'PUT') {
      const match = /daily-route\/(\d{4}-\d{2}-\d{2})\/stops\/([^/]+)$/.exec(url.pathname)
      const date = match?.[1]
      const treeId = decodeURIComponent(match?.[2] || '')
      if (!date || !treeId)
        return route.fulfill({ status: 400, json: { message: 'Invalid route' } })
      const ids = stored.get(date) || new Set<string>()
      if (request.postDataJSON()?.selected) ids.add(treeId)
      else ids.delete(treeId)
      stored.set(date, ids)
      return route.fulfill({ status: 200, json: schedulesFor(date) })
    }

    const completionMatch = /^\/api\/scheduling\/([^/]+)\/complete$/.exec(url.pathname)
    if (completionMatch && request.method() === 'POST') {
      const scheduleId = decodeURIComponent(completionMatch[1] || '')
      const stop = [...stored.entries()]
        .flatMap(([date, ids]) =>
          [...ids].map((treeId, index) => ({
            date,
            treeId,
            scheduleId: `schedule-${date}-${index + 1}`,
          })),
        )
        .find((candidate) => candidate.scheduleId === scheduleId)
      if (!stop) return route.fulfill({ status: 404, json: { message: 'Stop not found' } })
      const payload = request.postDataJSON() as {
        date: string
        type: string
        observations: string
      }
      completedBySchedule.set(scheduleId, payload)
      return route.fulfill({
        status: 200,
        json: {
          id: `pruning-${stop.treeId}`,
          idTree: stop.treeId,
          scheduleId,
          ...payload,
          user: { id: 'test-user', name: 'Equipe de teste' },
        },
      })
    }

    if (url.pathname === '/api/scheduling' && request.method() === 'GET') {
      if (failNextRouteRead) {
        failNextRouteRead = false
        return route.fulfill({ status: 503, json: { message: 'Temporary route lookup failure' } })
      }
      const date = url.searchParams.get('date') || ''
      return route.fulfill({ status: 200, json: schedulesFor(date) })
    }

    return route.fulfill({ status: 200, json: [] })
  })

  function schedulesFor(date: string) {
    return [...(stored.get(date) || [])].map((treeId, index) => {
      const tree = treeRecords.find((record) => record.id === treeId)!
      const scheduleId = `schedule-${date}-${index + 1}`
      const pruning = completedBySchedule.get(scheduleId)
      return {
        id: scheduleId,
        treeId,
        type: 'PRUNING',
        status: pruning ? 'COMPLETED' : 'PENDING',
        routeOrder: index + 1,
        tree,
        prunings: pruning
          ? [
              {
                id: `pruning-${treeId}`,
                idTree: treeId,
                scheduleId,
                ...pruning,
              },
            ]
          : [],
      }
    })
  }

  await page.goto('/user/routes/daily')
  await expect(page.getByRole('heading', { name: 'Rotas' })).toBeVisible()
  await expect(page.locator('.route-summary-row')).toHaveCount(0)
  expect(requests.some((item) => item.includes('/api/trees'))).toBe(false)
  expect(requests.some((item) => item.includes('/api/scheduling?'))).toBe(false)

  for (const [date, treeNames] of [
    [firstDate, ['Cajueiro', 'Oitizeiro']],
    [secondDate, ['Oitizeiro']],
  ]) {
    await page.getByRole('button', { name: 'Planejar rota' }).first().click()
    await page.getByLabel('Data da rota').fill(date)
    await page.getByRole('button', { name: 'Continuar' }).click()
    for (const treeName of treeNames) {
      const row = page.locator('.tree-row').filter({ hasText: treeName })
      await expect(row).toBeVisible()
      await row.click()
      await expect(page.locator('.route-stop')).toHaveCount(treeNames.indexOf(treeName) + 1)
    }
    await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  }

  await expect(page.locator('.route-summary-row')).toHaveCount(2)
  const treeRequestCountAfterPlanning = requests.filter((item) =>
    item.includes('/api/trees'),
  ).length
  await page.locator('.route-summary-row').first().click()
  await expect(page).toHaveURL(new RegExp(`date=${secondDate}`))
  await expect(page.locator('.route-stop').filter({ hasText: 'Oitizeiro' })).toHaveCount(1)
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()

  await page.locator('.route-summary-row').nth(1).click()
  await expect(page).toHaveURL(new RegExp(`date=${firstDate}`))
  await expect(page.locator('.route-stop').filter({ hasText: 'Cajueiro' })).toHaveCount(1)
  await expect(page.locator('.route-stop').filter({ hasText: 'Oitizeiro' })).toHaveCount(1)
  expect(mapModuleRequests).toHaveLength(0)
  expect(mapRequests).toHaveLength(0)
  await page.getByRole('button', { name: 'Mapa' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect.poll(() => mapModuleRequests.some((url) => /routing-machine/i.test(url))).toBe(true)
  const mapState = await page.locator('.route-map-dialog-body').evaluate((element) => {
    const map = element.querySelector<HTMLElement>('.leaflet-container')
    return {
      mapWidth: map?.clientWidth,
      mapHeight: map?.clientHeight,
      markerPaneCount: map?.querySelectorAll('.leaflet-marker-pane .leaflet-marker-icon').length,
      childClasses: [...(map?.children || [])].map((child) => (child as HTMLElement).className),
    }
  })
  await expect(
    page.locator('.route-stop-pin'),
    `Map state: ${JSON.stringify(mapState)}. Browser errors: ${browserErrors.join(' | ')}`,
  ).toHaveCount(2)
  await expect
    .poll(() => mapRequests.some((url) => url.includes('tile.openstreetmap.org')))
    .toBe(true)
  await expect
    .poll(() => mapRequests.some((url) => url.includes('router.project-osrm.org')), {
      message: `Map requests: ${mapRequests.join(', ')}. Browser errors: ${browserErrors.join(' | ')}`,
    })
    .toBe(true)
  await expect(page.locator('.route-map-warning')).toContainText('Trajeto pelas ruas indisponível')
  const failedRouteRequestCount = mapRequests.filter((url) =>
    url.includes('router.project-osrm.org'),
  ).length
  await page.locator('.route-map-warning').getByRole('button', { name: 'Tentar novamente' }).click()
  await expect
    .poll(() => mapRequests.filter((url) => url.includes('router.project-osrm.org')).length)
    .toBeGreaterThan(failedRouteRequestCount)
  await page.getByRole('button', { name: 'Voltar para a lista da rota' }).click()
  await expect(page.locator('.route-stop').filter({ hasText: 'Cajueiro' })).toHaveCount(1)
  await expect(page).toHaveURL(new RegExp(`date=${firstDate}`))

  async function registerNextStop() {
    await page.getByRole('button', { name: 'Registrar poda', exact: true }).first().click()
    const pruningType = page.getByLabel('Como foi a poda?')
    await pruningType.focus()
    await pruningType.press('ArrowDown')
    await page.getByRole('option', { name: 'Leve — limpeza básica' }).click()
    await page.getByRole('button', { name: 'Salvar poda', exact: true }).click()
  }

  await registerNextStop()
  await expect(page.locator('.route-stop')).toContainText('Oitizeiro')
  await registerNextStop()
  await expect(page.locator('.route-stop')).toHaveCount(0)
  await page.getByRole('tab', { name: /Concluídas/ }).click()
  await expect(page.locator('.route-stop')).toHaveCount(2)
  await expect(page.getByText('Rota concluída')).toBeVisible()
  await expect(page.locator('.route-stop').filter({ hasText: 'Poda registrada' })).toHaveCount(2)
  await expect(page.locator('.route-stop .route-number')).toHaveText(['1', '2'])

  const emptyDate = `${month}-07`
  await page.goto(`/user/routes/daily?date=${emptyDate}`)
  await expect(page.getByText('Não há paradas pendentes para esta data.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mapa' })).toBeDisabled()

  failNextRouteRead = true
  await page.goto(`/user/routes/daily?date=${secondDate}`)
  await expect(page.getByRole('alert')).toContainText('Não foi possível conferir a rota')
  await page.getByRole('alert').getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.locator('.route-stop')).toContainText('Oitizeiro')
  expect(requests.filter((item) => item.includes('/api/trees'))).toHaveLength(
    treeRequestCountAfterPlanning,
  )
  expect(requests.some((item) => item.includes(`date=${firstDate}&mine=true`))).toBe(true)
  expect(requests.some((item) => item.includes(`date=${secondDate}&mine=true`))).toBe(true)
  expect(
    requests.some(
      (item) => item.includes('/api/scheduling/schedule-') && item.endsWith('/complete'),
    ),
  ).toBe(true)
})
