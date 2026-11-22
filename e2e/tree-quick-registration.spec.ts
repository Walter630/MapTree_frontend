import { expect, test } from '@playwright/test'

test('cadastro rápido mantém a tentativa após falha e preserva a espécie', async ({ page }) => {
  const base = test.info().project.use.baseURL as string
  const uiOrigin = new URL(base).origin
  let treeAttempts = 0
  const idempotencyKeys: string[] = []

  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => localStorage.setItem('accessToken', 'playwright-test-token'))
  await page.route('**/*', (route) => {
    return new URL(route.request().url()).origin === uiOrigin ? route.continue() : route.abort()
  })
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname === '/api/users/me/profile') {
      return route.fulfill({
        status: 200,
        json: {
          id: '507f1f77bcf86cd799439001',
          name: 'Operadora de teste',
          email: 'operator@example.test',
          role: 'USER',
          isActive: true,
          organizationId: '507f1f77bcf86cd799439011',
        },
      })
    }
    if (url.pathname === '/api/organizations/507f1f77bcf86cd799439011') {
      return route.fulfill({
        status: 200,
        json: {
          municipalityName: 'Município de teste',
          municipalityUf: 'CE',
          municipalityGeometry: {
            type: 'Polygon',
            coordinates: [[
              [-170, -80],
              [170, -80],
              [170, 80],
              [-170, 80],
              [-170, -80],
            ]],
          },
        },
      })
    }
    if (url.pathname === '/api/species' && request.method() === 'GET') {
      return route.fulfill({
        status: 200,
        json: [
          {
            id: '507f1f77bcf86cd799439010',
            commonName: 'Ipê',
            scientificName: 'Handroanthus',
            family: 'Bignoniaceae',
          },
        ],
      })
    }
    if (url.pathname === '/api/trees/nearby' || url.pathname === '/api/trees/bounds') {
      return route.fulfill({ status: 200, json: [] })
    }
    if (url.pathname === '/api/regions' || url.pathname === '/api/trees/cities') {
      return route.fulfill({ status: 200, json: [] })
    }
    if (url.pathname === '/api/trees' && request.method() === 'POST') {
      idempotencyKeys.push(request.headers()['idempotency-key'] || '')
      treeAttempts += 1
      if (treeAttempts === 1) {
        return route.fulfill({ status: 503, json: { message: 'temporary failure' } })
      }
      return route.fulfill({
        status: 201,
        json: { id: '507f1f77bcf86cd799439099', soilStatus: 'PENDING' },
      })
    }
    return route.fulfill({ status: 200, json: [] })
  })

  await page.goto('/user/mapUser')
  await page.getByRole('button', { name: 'Cadastrar árvore pelo mapa' }).click()
  await expect(page.getByTestId('quick-tree-boundary-status')).toContainText('Município de teste / CE')
  const speciesPicker = page.getByRole('combobox', { name: 'Espécie da árvore *' })
  await speciesPicker.fill('Ipê')
  await page.getByRole('option', { name: /Ipê/ }).click()
  await page.getByRole('button', { name: 'Escolher espécie' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()

  const map = page.locator('#pruning-map-container')
  await map.click({ position: { x: 36, y: 470 } })
  await expect(page.getByRole('button', { name: 'Salvar e continuar' })).toBeEnabled()
  await page.getByRole('button', { name: 'Salvar e continuar' }).click()
  await expect(page.getByRole('alert')).toContainText('Não foi possível confirmar o cadastro')
  await expect(page.getByRole('button', { name: 'Salvar e continuar' })).toBeEnabled()

  await page.getByRole('button', { name: 'Salvar e continuar' }).click()
  await expect(page.getByText(/Árvore cadastrada · Ipê\. Solo em processamento\./)).toBeVisible()
  expect(idempotencyKeys).toHaveLength(2)
  expect(idempotencyKeys[0]).toBeTruthy()
  expect(idempotencyKeys[1]).toBe(idempotencyKeys[0])
  await expect(page.getByText(/Espécie: Ipê/)).toBeVisible()
  await expect(page.getByText(/Toque no ponto da árvore/)).toBeVisible()
})
