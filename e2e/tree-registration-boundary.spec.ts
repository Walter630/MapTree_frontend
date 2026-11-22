import { expect, test } from '@playwright/test'

const municipalityGeometry = {
  type: 'Polygon',
  coordinates: [[
    [-39, -4],
    [-38, -4],
    [-38, -3],
    [-39, -3],
    [-39, -4],
  ]],
}

test('cadastro direto limita a localização ao município da empresa', async ({ page }) => {
  const base = test.info().project.use.baseURL as string
  const uiOrigin = new URL(base).origin
  const treeRequests: Record<string, unknown>[] = []

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.addInitScript(() => localStorage.setItem('accessToken', 'playwright-test-token'))
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === uiOrigin ? route.continue() : route.abort(),
  )
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())

    if (url.pathname === '/api/users/me/profile') {
      return route.fulfill({
        status: 200,
        json: {
          id: 'employee-1',
          name: 'Funcionária de teste',
          email: 'employee@example.test',
          role: 'USER',
          organization: { id: 'company-1', name: 'Empresa de teste' },
          isActive: true,
        },
      })
    }
    if (url.pathname === '/api/organizations/company-1') {
      return route.fulfill({
        status: 200,
        json: {
          id: 'company-1',
          municipalityName: 'Fortaleza',
          municipalityUf: 'CE',
          municipalityGeometry,
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
          },
        ],
      })
    }
    if (url.pathname === '/api/trees' && request.method() === 'POST') {
      treeRequests.push(request.postDataJSON() as Record<string, unknown>)
      return route.fulfill({ status: 201, json: { id: 'tree-1' } })
    }
    return route.fulfill({ status: 200, json: [] })
  })

  await page.goto('/user/trees/new')
  await expect(
    page.getByRole('application', { name: 'Mapa para selecionar uma árvore dentro de Fortaleza / CE' }),
  ).toBeVisible()

  await page.getByRole('combobox', { name: 'Espécie *' }).fill('Ipê')
  await page.getByRole('option', { name: /Ipê/ }).click()
  await page.getByLabel('Latitude *').fill('-2.5')
  await page.getByLabel('Longitude *').fill('-38.5')
  await expect(page.getByTestId('municipality-boundary-error')).toContainText(
    'A localização da árvore precisa estar dentro do limite de Fortaleza / CE',
  )
  await expect(page.getByRole('button', { name: 'Salvar árvore' })).toBeDisabled()
  expect(treeRequests).toHaveLength(0)

  await page.getByLabel('Latitude *').fill('-3.7319')
  await expect(page.getByTestId('municipality-boundary-error')).toHaveCount(0)
  await page.getByRole('button', { name: 'Salvar árvore' }).click()
  await expect(page.getByText('Árvore cadastrada com sucesso.', { exact: false })).toBeVisible()
  expect(treeRequests).toHaveLength(1)
  expect(treeRequests[0]).toMatchObject({ latitude: -3.7319, longitude: -38.5 })
})
