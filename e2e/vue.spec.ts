import { test, expect } from '@playwright/test'

test('a página inicial apresenta o MapTree sem exigir sessão', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Árvores perto da fiação merecem acompanhamento inteligente.',
  )
  await page.getByRole('link', { name: 'Entrar no MapTree' }).first().click()
  await expect(page).toHaveURL(/\/login\/?$/)
  await expect(page.getByPlaceholder('Digite seu email')).toBeVisible()
})

test('rota desconhecida apresenta 404 sem redirecionar para a landing', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (request) => requests.push(request.url()))

  await page.goto('/rota-que-nao-existe')

  await expect(page.getByRole('heading', { name: 'Esta página não existe.' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Voltar ao início' })).toHaveAttribute('href', '/')
  await expect(page).toHaveURL(/\/rota-que-nao-existe$/)
  expect(requests.some((url) => /\/api\//.test(url))).toBe(false)
})
