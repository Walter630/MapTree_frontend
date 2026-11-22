import { expect, test } from '@playwright/test'
import { landingDocumentFixture } from './fixtures/landingDocument'

test('landing pública apresenta o fluxo e funciona em temas e larguras diferentes', async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000)
  const base = testInfo.project.use.baseURL as string
  const uiOrigin = new URL(base).origin
  const requests: string[] = []

  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => {
    if (!localStorage.getItem('maptree:theme-preference')) {
      localStorage.setItem('maptree:theme-preference', 'dark')
    }
  })
  page.on('request', (request) => requests.push(request.url()))
  await page.route('**/*', (route) => {
    if (new URL(route.request().url()).origin === uiOrigin) return route.continue()
    return route.abort()
  })
  await page.route('**/api/landing/published', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ version: 1, revisionId: 'initial', content: landingDocumentFixture }),
    }),
  )

  const mobileHeroResponse = page.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith('/landing/maptree-hero-mobile.webp'),
  )
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Gestão de árvores para planejar podas preventivas.',
  )
  await expect(page.locator('.hero-product-preview img')).toHaveAttribute(
    'src',
    /dashboard-campo\.svg$/,
  )
  await expect(page.getByRole('link', { name: 'Conhecer funcionalidades' })).toHaveAttribute(
    'href',
    '#funcionalidades',
  )
  await expect(page.locator('.landing-header .brand')).toBeVisible()
  const mobileMenuButton = page.getByRole('button', { name: 'Abrir menu de navegação' })
  await expect(mobileMenuButton).toBeVisible()
  const mobileNavLinks = page.locator('.landing-nav > a:not(.header-login)')
  await expect(mobileNavLinks).toHaveCount(4)
  for (const link of await mobileNavLinks.all()) await expect(link).toBeHidden()
  await mobileMenuButton.click()
  await expect(page.getByRole('button', { name: 'Fechar menu de navegação' })).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  for (const link of await mobileNavLinks.all()) await expect(link).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Abrir menu de navegação' })).toBeFocused()
  for (const link of await mobileNavLinks.all()) await expect(link).toBeHidden()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('#perguntas-frequentes details[open]')).toHaveCount(1)
  await expect(page.getByText('Em desenvolvimento', { exact: true })).toBeVisible()

  const mobileHero = await mobileHeroResponse
  expect((await mobileHero.body()).byteLength).toBeLessThan(180_000)
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    'MapTree | Gestão de árvores para planejar podas preventivas',
  )
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    /maptree-hero-desktop\.webp$/,
  )

  const progress = page.getByRole('progressbar', { name: 'Progresso da rota demonstrativa' })
  await page.locator('#produto').scrollIntoViewIfNeeded()
  await expect(progress).toHaveAttribute('aria-valuenow', '1')
  await expect(page.getByTestId('route-stop-1')).toContainText('Oiticica')
  await expect(page.getByTestId('route-stop-1')).toContainText('Concluída')
  await expect(page.getByTestId('route-stop-2')).toContainText('Ipê-amarelo')
  await expect(page.getByTestId('route-stop-2')).toContainText('Próxima')
  await expect(page.getByTestId('route-stop-3')).toContainText('Mangueira')
  await expect(page.locator('.map-stop--complete')).toHaveCount(1)
  await expect(page.locator('.map-stop--next')).toHaveCount(1)

  await page.getByRole('button', { name: /Simular poda/ }).click()
  await expect(progress).toHaveAttribute('aria-valuenow', '2')
  await expect(page.getByTestId('route-stop-2')).toContainText('Concluída')
  await expect(page.getByTestId('route-stop-3')).toContainText('Próxima')
  await page.getByRole('button', { name: /Simular poda/ }).click()
  await expect(progress).toHaveAttribute('aria-valuenow', '3')
  await expect(page.getByRole('button', { name: 'Reiniciar demonstração' })).toBeVisible()
  await page.getByRole('button', { name: 'Reiniciar demonstração' }).click()
  await expect(progress).toHaveAttribute('aria-valuenow', '1')

  const secondQuestion = page.getByText('Como funcionam as rotas por data?')
  await secondQuestion.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#perguntas-frequentes details').nth(1)).toHaveAttribute('open', '')

  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 844 })
    const widthCheck = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }))
    expect(widthCheck.document, `Sem rolagem horizontal em ${width}px`).toBeLessThanOrEqual(
      widthCheck.viewport,
    )
    const footerRows = await page.evaluate(() => {
      const navigation = document.querySelector('.footer-nav')!.getBoundingClientRect()
      const pendingLinks = document.querySelector('.footer-pending-links')!.getBoundingClientRect()
      const footer = document.querySelector('.landing-footer')!.getBoundingClientRect()
      return {
        navigationBottom: navigation.bottom,
        pendingLinksTop: pendingLinks.top,
        trailingSpace: document.documentElement.scrollHeight - footer.bottom - window.scrollY,
      }
    })
    expect(footerRows.pendingLinksTop).toBeGreaterThanOrEqual(footerRows.navigationBottom)
    expect(footerRows.trailingSpace).toBeLessThanOrEqual(24)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Solicitar acesso' }).first()).toHaveAttribute(
      'href',
      '/cadastro',
    )
    await page.evaluate(() => localStorage.setItem('maptree:theme-preference', 'light'))
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    const lightWidth = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }))
    expect(lightWidth.document, `Tema claro sem rolagem horizontal em ${width}px`).toBeLessThanOrEqual(
      lightWidth.viewport,
    )
    await page.evaluate(() => localStorage.setItem('maptree:theme-preference', 'dark'))
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  }

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.locator('#produto').scrollIntoViewIfNeeded()
  await expect(page.locator('.map-route')).toHaveClass(/map-route--drawn/)
  const transitionMs = await page
    .locator('.scroll-reveal')
    .first()
    .evaluate((element) => Number.parseFloat(getComputedStyle(element).transitionDuration) * 1000)
  expect(transitionMs).toBeLessThan(10)

  for (const theme of ['light', 'dark'] as const) {
    await page.evaluate((preference) => localStorage.setItem('maptree:theme-preference', preference), theme)
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto('/')
      await page.evaluate(async () => {
        const step = Math.max(500, Math.floor(window.innerHeight * 0.75))
        for (let top = 0; top < document.documentElement.scrollHeight; top += step) {
          window.scrollTo(0, top)
          await new Promise((resolve) => window.setTimeout(resolve, 80))
        }
        window.scrollTo(0, 0)
        await new Promise((resolve) => window.setTimeout(resolve, 150))
      })
      await page.screenshot({
        path: testInfo.outputPath(`landing-${theme}-${width}.png`),
        fullPage: true,
        animations: 'disabled',
      })
    }
  }

  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')
  const headerNavigation = page.getByRole('navigation', { name: 'Navegação da página' })
  await headerNavigation.getByRole('link', { name: 'Funcionalidades' }).click()
  await expect(page).toHaveURL(/#funcionalidades$/)
  await headerNavigation.getByRole('link', { name: 'Como funciona' }).click()
  await expect(page).toHaveURL(/#como-funciona$/)
  await headerNavigation.getByRole('link', { name: 'Sobre' }).click()
  await expect(page).toHaveURL(/#sobre$/)
  await expect(page.locator('#funcionalidades .feature-card')).toHaveCount(6)
  await headerNavigation.getByRole('link', { name: 'Solicitar acesso' }).click()
  await expect(page).toHaveURL(/\/cadastro$/)
  await expect(page.getByRole('heading', { name: 'Bem-vindo(a)!' })).toBeVisible()
  await page.goto('/')
  await headerNavigation.getByRole('link', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/login$/)

  const apiRequests = requests.filter((url) => /\/api\//.test(url))
  expect(apiRequests.length).toBeGreaterThan(0)
  expect(apiRequests.every((url) => /\/api\/landing\/published(?:\?|$)/.test(url))).toBe(true)
  expect(requests.some((url) => /leaflet|chart\.js|chartjs|routing-machine/i.test(url))).toBe(false)
})
