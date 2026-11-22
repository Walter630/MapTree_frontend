import { expect, test } from '@playwright/test'

test('mostra o progresso junto à ação durante o salvamento de uma árvore', async ({ page }) => {
  const base = test.info().project.use.baseURL as string
  const appOrigin = new URL(base).origin
  let releaseTreeSave!: () => void
  const treeSave = new Promise<void>((resolve) => {
    releaseTreeSave = resolve
  })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => localStorage.setItem('accessToken', 'playwright-test-token'))
  await page.route('**/*', (route) => {
    const target = new URL(route.request().url())
    return target.origin === appOrigin ? route.continue() : route.abort()
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
        },
      })
    }
    if (url.pathname === '/api/species' && request.method() === 'GET') {
      return route.fulfill({ status: 200, json: [{ id: 'species-1', commonName: 'Ipê' }] })
    }
    if (url.pathname === '/api/trees' && request.method() === 'POST') {
      await treeSave
      return route.fulfill({ status: 201, json: { id: 'tree-1' } })
    }
    return route.fulfill({ status: 200, json: [] })
  })

  await page.goto('/user/trees/new')
  await page.getByRole('combobox', { name: /Espécie/ }).fill('Ipê')
  await page.getByRole('option', { name: /Ipê/ }).click()
  await page.getByLabel(/Latitude/).fill('-3.73191')
  await page.getByLabel(/Longitude/).fill('-38.52671')

  await page.getByRole('button', { name: 'Salvar árvore' }).click()
  const progress = page.getByTestId('tree-saving-progress')
  await expect(progress).toBeVisible()
  await expect(progress).toContainText('Salvando árvore')
  await expect(progress).toContainText('0%')
  await expect(page.getByTestId('tree-saving-overlay')).toHaveCount(0)

  releaseTreeSave()
  await expect(page.getByText('Árvore cadastrada com sucesso.')).toBeVisible()
})
