import { expect, test, type Page } from '@playwright/test'

const updatedAt = '2026-11-17T13:00:00.000Z'

function treeRecord(createdById: string) {
  return {
    id: 'tree-1',
    createdById,
    updatedAt,
    idSpecies: 'sp-1',
    latitude: -3.7319,
    longitude: -38.5267,
    age: '2018-01-01T00:00:00.000Z',
    status: 'NORMAL',
    vigor: 'GOOD',
    species: {
      id: 'sp-1',
      commonName: 'Ipê-amarelo',
      scientificName: 'Handroanthus albus',
      family: 'Bignoniaceae',
    },
    measurements: [{ height: 4.2, canopyWidth: 3.1, date: updatedAt }],
  }
}

async function openMapWithTree(page: Page, createdById: string) {
  const base = test.info().project.use.baseURL as string
  const uiOrigin = new URL(base).origin
  const tree = treeRecord(createdById)
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.setViewportSize({ width: 1280, height: 900 })
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
          id: 'employee-1',
          name: 'Funcionária de teste',
          email: 'employee@example.test',
          role: 'USER',
          isActive: true,
          organization: { id: 'company-1', name: 'Empresa de teste' },
        },
      })
    }
    if (url.pathname === '/api/trees' && request.method() === 'GET') {
      return route.fulfill({ status: 200, json: [tree] })
    }
    if (
      (url.pathname === '/api/trees/nearby' || url.pathname === '/api/trees/bounds') &&
      request.method() === 'GET'
    ) {
      return route.fulfill({ status: 200, json: [tree] })
    }
    if (url.pathname === '/api/trees/tree-1' && request.method() === 'GET') {
      return route.fulfill({ status: 200, json: tree })
    }
    if (url.pathname === '/api/species' && request.method() === 'GET') {
      return route.fulfill({ status: 200, json: [tree.species] })
    }
    if (url.pathname === '/api/regions' || url.pathname === '/api/trees/cities') {
      return route.fulfill({ status: 200, json: [] })
    }
    return route.fulfill({ status: 200, json: [] })
  })

  await page.goto('/user/mapUser')
  await expect(page.locator('#pruning-map-container')).toBeVisible()
  await expect(page.locator('.tree-icon-marker')).toBeVisible()
  return { pageErrors, tree }
}

test('funcionário edita sua árvore pelo popup sem criar medição nova', async ({ page }) => {
  const { pageErrors, tree } = await openMapWithTree(page, 'employee-1')
  let patchPayload: Record<string, unknown> | undefined
  let measurementsCreated = 0
  await page.route('**/api/trees/tree-1', async (route) => {
    if (route.request().method() === 'PATCH') {
      patchPayload = route.request().postDataJSON() as Record<string, unknown>
      return route.fulfill({
        status: 200,
        json: { ...tree, latitude: -3.732, updatedAt: '2026-11-17T14:00:00.000Z' },
      })
    }
    return route.fulfill({ status: 200, json: tree })
  })
  await page.route('**/api/measurements', async (route) => {
    if (route.request().method() === 'POST') measurementsCreated += 1
    return route.fulfill({ status: 200, json: [] })
  })

  await page.locator('.tree-icon-marker').click()
  await page.getByRole('button', { name: 'Editar árvore' }).click()
  await expect(page).toHaveURL(/\/user\/trees\/tree-1\/edit/)
  await expect(page.getByRole('heading', { name: /Editar árvore/ })).toBeVisible()
  await page.getByLabel('Latitude *').fill('-3.732')
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByText('Árvore atualizada com sucesso.')).toBeVisible()

  expect(patchPayload).toMatchObject({
    idSpecies: 'sp-1',
    latitude: -3.732,
    longitude: -38.5267,
    expectedUpdatedAt: updatedAt,
  })
  expect(measurementsCreated).toBe(0)
  expect(pageErrors).toEqual([])
})

test('funcionário não recebe ação para editar árvore cadastrada por colega', async ({ page }) => {
  const { pageErrors } = await openMapWithTree(page, 'employee-2')
  await page.locator('.tree-icon-marker').click()
  await expect(page.getByRole('button', { name: 'Editar árvore' })).toHaveCount(0)
  expect(pageErrors).toEqual([])
})
