import { expect, test } from '@playwright/test'
import { randomInt, randomUUID } from 'node:crypto'

function fixture(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Configure ${name} para executar este teste com dados descartáveis`)
  return value
}

test(
  'cadastro de árvore e filtros de espécie e risco funcionam contra a API',
  { tag: '@mutates' },
  async ({ page }) => {
    const api = fixture('E2E_API_URL')
    const email = fixture('E2E_EMAIL')
    const password = fixture('E2E_PASSWORD')
    const firstSpecies = fixture('E2E_FIRST_SPECIES')
    const secondSpecies = fixture('E2E_SECOND_SPECIES')
    const origin = new URL(api).origin
    const ui = new URL(test.info().project.use.baseURL as string).origin
    await page.route('**/*', (route) => {
      const target = new URL(route.request().url())
      return target.origin === origin || target.origin === ui ? route.continue() : route.abort()
    })

    await page.goto('/login')
    await page.getByPlaceholder('Digite seu email').fill(email)
    await page.getByPlaceholder('Digite sua senha').fill(password)
    await page.getByRole('button', { name: 'entrar', exact: true }).click()
    await expect(page).toHaveURL(/\/user\/?$/)

    await page.goto('/user/trees/new')
    await page.getByRole('combobox', { name: /Espécie/ }).fill(firstSpecies)
    await page.getByRole('option', { name: new RegExp(firstSpecies) }).click()
    await page.getByLabel(/Latitude/).fill('-3.73191')
    await page.getByLabel(/Longitude/).fill('-38.52671')
    await page.getByLabel('Ano aproximado de plantio').fill('2020')
    const saved = page.waitForResponse(
      (response) => response.url() === `${api}/trees` && response.request().method() === 'POST',
    )
    await page.getByRole('button', { name: 'Salvar árvore' }).click()
    const response = await saved
    expect(response.status()).toBe(201)
    const tree = (await response.json()) as {
      id: string
      idSpecies: string
      status: string
      age: string
    }
    expect(tree.status).toBe('NORMAL')
    expect(tree.age).toBe('2020-01-01T00:00:00.000Z')
    await expect(page.getByText('Árvore cadastrada com sucesso.', { exact: false })).toBeVisible()

    const token = await page.evaluate(() => localStorage.getItem('accessToken'))
    expect(token).toBeTruthy()
    const headers = { Authorization: `Bearer ${token}` }
    const recordHeight = (height: number) =>
      page.request.post(`${api}/measurements`, {
        headers,
        data: { treeId: tree.id, height, canopyWidth: 2 },
      })
    expect((await recordHeight(5.5)).status()).toBe(201)
    expect((await recordHeight(-1)).status()).toBe(400)
    const risk = await page.request.get(
      `${api}/trees/map/risk?speciesId=${tree.idSpecies}&status=CRITICAL`,
      { headers },
    )
    expect(risk.status()).toBe(200)
    expect(await risk.json()).toEqual([
      expect.objectContaining({ id: tree.id, status: 'CRITICAL', currentHeight: 5.5 }),
    ])

    await page.goto('/user/mapUser')
    const critical = page.getByRole('button', { name: 'Críticos (1)' })
    await expect(critical).toBeVisible()
    await critical.click()
    await expect(critical).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Ativar mapa de calor e abrir espécies' }).click()
    await page.getByRole('button', { name: `Mostrar concentração de ${firstSpecies}` }).click()
    await expect(
      page.getByText('Árvores da categoria no mapa de calor: 1.', { exact: false }),
    ).toBeVisible()
    await page.getByRole('button', { name: `Mostrar concentração de ${secondSpecies}` }).click()
    await expect(
      page.getByText('Árvores da categoria no mapa de calor: 2.', { exact: false }),
    ).toBeVisible()
  },
)

test(
  'cadastro público cria a conta e permite entrar pelo frontend',
  { tag: '@mutates' },
  async ({ page }) => {
    const api = fixture('E2E_API_URL')
    const password = fixture('E2E_PASSWORD')
    const account = `browser-${randomUUID()}@example.test`
    await page.goto('/register')
    await page.getByPlaceholder('Digite seu nome').fill('Conta de teste do navegador')
    await page.getByPlaceholder('Digite seu CPF').fill(String(randomInt(10000000000, 99999999999)))
    await page.getByPlaceholder('Digite seu telefone').fill('85999999999')
    await page.getByPlaceholder('Digite seu email').fill(account)
    await page.getByPlaceholder('Digite sua senha').fill(password)
    const registration = page.waitForResponse(`${api}/auth/register`)
    await page.getByRole('button', { name: 'Registrar', exact: true }).click()
    expect((await registration).status()).toBe(201)
    await expect(page).toHaveURL(/\/login$/)
    await page.getByPlaceholder('Digite seu email').fill(account)
    await page.getByPlaceholder('Digite sua senha').fill(password)
    await page.getByRole('button', { name: 'entrar', exact: true }).click()
    await expect(page).toHaveURL(/\/user\/?$/)
  },
)

test('as antigas URLs de recuperação exibem que o recurso está indisponível', async ({ page }) => {
  await page.goto('/reset-password')
  await expect(page).toHaveURL(/\/recovery$/)
  await expect(
    page.getByText('A recuperação por e-mail está indisponível.', { exact: false }),
  ).toBeVisible()
})
