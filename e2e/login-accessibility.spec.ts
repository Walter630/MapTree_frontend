import { expect, test } from '@playwright/test'

test('campos de login têm rótulos associados e nomes acessíveis', async ({ page }) => {
  await page.goto('/login')

  const email = page.getByLabel('Email')
  const password = page.getByLabel('Senha', { exact: true })
  await expect(email).toBeVisible()
  await expect(password).toBeVisible()

  for (const [fieldId, labelId] of [
    ['login-email', 'login-email-label'],
    ['login-password', 'login-password-label'],
  ]) {
    const field = page.locator(`#${fieldId}`)
    await expect(field).toHaveAttribute('aria-labelledby', labelId)
    await expect(page.locator(`#${labelId}`)).toHaveAttribute('for', fieldId)
  }
})
