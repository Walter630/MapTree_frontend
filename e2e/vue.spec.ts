import { test, expect } from '@playwright/test'

test('a página inicial exige login sem sessão', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login\/?$/)
  await expect(page.getByPlaceholder('Digite seu email')).toBeVisible()
})
