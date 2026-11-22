import { expect, test } from '@playwright/test'

test('página estática de indisponibilidade usa somente recursos locais', async ({ page }) => {
  const base = test.info().project.use.baseURL as string
  const uiOrigin = new URL(base).origin
  const requests: string[] = []
  page.on('request', (request) => requests.push(request.url()))
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === uiOrigin ? route.continue() : route.abort(),
  )

  await page.goto('/503.html')

  await expect(page).toHaveTitle('MapTree temporariamente indisponível')
  await expect(page.getByRole('heading', { name: 'Estamos trabalhando para voltar.' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible()
  expect(requests.every((url) => new URL(url).origin === uiOrigin)).toBe(true)
})
