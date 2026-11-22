import { expect, test, type Page } from '@playwright/test'

async function openManagerDashboard(page: Page, organization?: string) {
  const base = test.info().project.use.baseURL as string
  const uiOrigin = new URL(base).origin
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.addInitScript(() => localStorage.setItem('accessToken', 'playwright-test-token'))
  await page.route('**/*', (route) => {
    return new URL(route.request().url()).origin === uiOrigin ? route.continue() : route.abort()
  })
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/users/me/profile') {
      return route.fulfill({
        status: 200,
        json: {
          id: 'manager-1',
          name: 'Gestor de teste',
          email: 'manager@example.test',
          role: 'MANAGER',
          isActive: true,
          ...(organization ? { organization: { id: 'company-1', name: organization } } : {}),
        },
      })
    }
    return route.fulfill({ status: 200, json: [] })
  })
  await page.goto('/manager')
  await expect(page.getByRole('heading', { name: 'Olá, Gestor de teste!' })).toBeVisible()
}

test('mostra o nome da empresa no painel do gestor', async ({ page }) => {
  await openManagerDashboard(page, 'Prefeitura de Tabuleiro do Norte')
  await expect(page.getByTestId('manager-company')).toContainText(
    'Prefeitura de Tabuleiro do Norte',
  )
})

test('informa quando o gestor ainda não tem empresa vinculada', async ({ page }) => {
  await openManagerDashboard(page)
  await expect(page.getByTestId('manager-company')).toContainText('Nenhuma empresa vinculada')
})
