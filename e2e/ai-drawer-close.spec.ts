import { expect, test } from '@playwright/test'

test('fechar a análise de IA durante o carregamento não deixa o painel preso', async ({ page }) => {
  const base = test.info().project.use.baseURL as string
  const uiOrigin = new URL(base).origin
  let releaseTreeDetails!: () => void
  const treeDetailsCanResolve = new Promise<void>((resolve) => {
    releaseTreeDetails = resolve
  })

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
          id: '507f1f77bcf86cd799439001',
          name: 'Operadora de teste',
          email: 'operator@example.test',
          role: 'USER',
          isActive: true,
        },
      })
    }

    if (url.pathname === '/api/trees' && request.method() === 'GET') {
      return route.fulfill({
        status: 200,
        json: [
          {
            id: 'ai-drawer-test-tree',
            latitude: -3.7319,
            longitude: -38.5267,
            status: 'NORMAL',
            species: { commonName: 'Ipê', scientificName: 'Handroanthus' },
          },
        ],
      })
    }

    if (url.pathname === '/api/trees/ai-drawer-test-tree' && request.method() === 'GET') {
      await treeDetailsCanResolve
      return route.fulfill({
        status: 200,
        json: {
          id: 'ai-drawer-test-tree',
          status: 'NORMAL',
          species: { commonName: 'Ipê' },
          measurements: [],
        },
      })
    }

    if (url.pathname === '/api/trees/nearby' || url.pathname === '/api/trees/bounds') {
      return route.fulfill({ status: 200, json: [] })
    }

    if (url.pathname === '/api/regions' || url.pathname === '/api/trees/cities') {
      return route.fulfill({ status: 200, json: [] })
    }

    return route.fulfill({ status: 200, json: [] })
  })

  try {
    await page.goto('/user/mapUser')
    await expect(page.locator('.ai-drawer')).toHaveCount(0)
    const treeMarker = page.locator('.tree-icon-marker').first()
    await expect(treeMarker).toBeVisible()
    await treeMarker.click()
    const openAiButton = page.locator('#btn-ai-ai-drawer-test-tree')
    await expect(openAiButton).toBeVisible()
    await expect(page.locator('.ai-drawer')).toHaveCount(0)
    await openAiButton.click()

    await expect(page.getByText('Carregando análise de IA...')).toBeVisible()
    await page.getByRole('button', { name: 'Fechar análise da árvore' }).click()
    await expect(page.getByText('Carregando análise de IA...')).toBeHidden()

    releaseTreeDetails()
    await expect(page.locator('.ai-drawer')).toHaveCount(0)
    await expect(page.getByText('Nenhuma análise de IA disponível para esta árvore.')).toBeHidden()
  } finally {
    releaseTreeDetails()
  }
})
