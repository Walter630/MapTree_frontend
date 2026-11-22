import { expect, test, type Page } from '@playwright/test'

type ThemePreference = 'light' | 'dark'

const STREET_TILE = `
  <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <rect width="256" height="256" fill="#f3ead5" />
    <path d="M0 54H256M0 174H256M68 0V256M198 0V256" stroke="#fff" stroke-width="18" />
    <path d="M0 54H256M0 174H256M68 0V256M198 0V256" stroke="#d4cbb9" stroke-width="2" />
    <path d="M12 18h34v22H12zm72 52h90v42H84zm130 72h26v18h-26zM18 202h36v34H18z" fill="#a8c58c" />
  </svg>
`

const SATELLITE_TILE = `
  <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <rect width="256" height="256" fill="#385e3c" />
    <path d="M0 0h90l-14 56H0zm158 0h98v66h-74zm-65 90h69v57H80zm102 83h74v83h-90zM0 180h57v76H0z" fill="#537a48" />
    <path d="M0 119c58-13 99 12 145-4s73-48 111-37v28c-41-7-64 26-112 40S54 123 0 147z" fill="#668951" />
    <path d="M35 0l18 36-15 22 28 14-20 28m146-8 18 28-13 25 25 24m-117 3-12 30 17 18" fill="none" stroke="#b2a47d" stroke-width="5" />
  </svg>
`

const TEST_TREE = {
  id: 'theme-toggle-tree',
  latitude: -3.7319,
  longitude: -38.5267,
  status: 'NORMAL',
  species: { commonName: 'Mangueira', scientificName: 'Mangifera indica' },
}

async function openMap(page: Page, width: number, preference: ThemePreference = 'light') {
  const base = test.info().project.use.baseURL as string
  const uiOrigin = new URL(base).origin
  const pageErrors: string[] = []
  const tileRequests: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.setViewportSize({ width, height: 900 })
  await page.addInitScript((theme) => {
    localStorage.setItem('accessToken', 'playwright-test-token')
    localStorage.setItem('maptree:theme-preference', theme)
    const fixturePosition = {
      coords: {
        latitude: -3.7319,
        longitude: -38.5267,
        accuracy: 5,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    }
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (success: (position: typeof fixturePosition) => void) =>
          success(fixturePosition),
        watchPosition: (success: (position: typeof fixturePosition) => void) => {
          success(fixturePosition)
          return 1
        },
        clearWatch: () => undefined,
      },
    })
  }, preference)
  await page.route('**/*', (route) => {
    return new URL(route.request().url()).origin === uiOrigin ? route.continue() : route.abort()
  })
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/users/me/profile') {
      return route.fulfill({
        status: 200,
        json: {
          id: 'test-user',
          name: 'Teste',
          email: 'test@example.test',
          role: 'USER',
          isActive: true,
        },
      })
    }
    if (url.pathname === '/api/trees/nearby' || url.pathname === '/api/trees/bounds') {
      return route.fulfill({ status: 200, json: [TEST_TREE] })
    }
    if (url.pathname === '/api/regions' || url.pathname === '/api/trees/cities') {
      return route.fulfill({ status: 200, json: [] })
    }
    return route.fulfill({ status: 200, json: [] })
  })
  await page.route(
    /https:\/\/(?:[abc]\.tile\.openstreetmap\.org|server\.arcgisonline\.com)\//,
    async (route) => {
      const url = new URL(route.request().url())
      tileRequests.push(url.href)
      return route.fulfill({
        status: 200,
        contentType: 'image/svg+xml',
        body: url.hostname === 'server.arcgisonline.com' ? SATELLITE_TILE : STREET_TILE,
      })
    },
  )

  await page.goto('/user/mapUser')
  await expect(page.locator('#pruning-map-container')).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-theme', preference)
  return { map: page.locator('#pruning-map-container'), pageErrors, tileRequests }
}

async function getMapVisualState(map: ReturnType<Page['locator']>) {
  const tilePane = map.locator('.leaflet-tile-pane')
  const tiles = await tilePane.locator('img.leaflet-tile-loaded').evaluateAll((images) =>
    images
      .map((image) => {
        const tile = image as HTMLImageElement
        return `${tile.currentSrc}|${tile.style.left}|${tile.style.top}|${tile.naturalWidth}x${tile.naturalHeight}`
      })
      .sort(),
  )
  const markers = await map
    .locator('.leaflet-marker-pane [aria-label^="Analisar "]')
    .evaluateAll((elements) => elements.map((element) => element.getAttribute('style')).sort())

  return {
    filter: await tilePane.evaluate((element) => getComputedStyle(element).filter),
    mapPaneStyle: await map.locator('.leaflet-map-pane').getAttribute('style'),
    tiles,
    markers,
  }
}

for (const width of [1280, 390, 270]) {
  test(`trocar o tema sem recarregar mantém mapa renderizado em ${width}px`, async ({ page }) => {
    const { map, pageErrors, tileRequests } = await openMap(page, width)
    const tilePane = map.locator('.leaflet-tile-pane')
    const treeMarker = map.getByRole('button', {
      name: 'Analisar Mangueira, identificação theme-toggle-tree',
    })
    await expect(tilePane).toBeAttached()
    await expect(treeMarker).toBeVisible()
    await expect.poll(() => tilePane.locator('img.leaflet-tile-loaded').count()).toBeGreaterThan(0)
    await expect
      .poll(() => tileRequests.some((url) => url.includes('tile.openstreetmap.org')))
      .toBe(true)
    await expect(page.getByRole('button', { name: 'Ativar tema escuro' })).toBeVisible()

    const initialTileRequestCount = tileRequests.length
    await map.locator('.leaflet-control-zoom-in').click()
    await expect.poll(() => tileRequests.length).toBeGreaterThan(initialTileRequestCount)
    const streetLightState = await getMapVisualState(map)
    expect(streetLightState.filter).toBe('none')
    expect(streetLightState.tiles.length).toBeGreaterThan(0)
    expect(streetLightState.tiles.every((tile) => tile.includes('tile.openstreetmap.org'))).toBe(
      true,
    )
    expect(streetLightState.markers).toHaveLength(1)

    await page.getByRole('button', { name: 'Ativar tema escuro' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(map).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ativar tema claro' })).toBeVisible()
    expect(await getMapVisualState(map)).toEqual(streetLightState)
    await expect
      .poll(() =>
        page
          .locator('.v-application')
          .evaluate((element) => getComputedStyle(element).backgroundColor),
      )
      .toBe('rgb(16, 18, 20)')
    await expect
      .poll(() => map.evaluate((element) => element.getBoundingClientRect().height))
      .toBeGreaterThan(0)

    await page.getByRole('button', { name: 'Ativar tema claro' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(map).toBeVisible()
    expect(await getMapVisualState(map)).toEqual(streetLightState)

    await page.getByRole('button', { name: 'Mostrar satélite' }).click()
    await expect
      .poll(() => tileRequests.some((url) => url.includes('server.arcgisonline.com')))
      .toBe(true)
    await expect
      .poll(async () => {
        const state = await getMapVisualState(map)
        return (
          state.tiles.length > 0 &&
          state.tiles.every((tile) => tile.includes('server.arcgisonline.com'))
        )
      })
      .toBe(true)
    const satelliteLightState = await getMapVisualState(map)
    expect(satelliteLightState.filter).toBe('none')
    expect(satelliteLightState.markers).toHaveLength(1)
    expect(satelliteLightState.mapPaneStyle).toBe(streetLightState.mapPaneStyle)
    expect(satelliteLightState.markers).toEqual(streetLightState.markers)

    await page.getByRole('button', { name: 'Ativar tema escuro' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    expect(await getMapVisualState(map)).toEqual(satelliteLightState)

    const toolsPanel = page.locator('.map-tools-panel').first()
    const expandButton = page.getByRole('button', { name: 'Expandir mapa' })
    await expect
      .poll(() => toolsPanel.evaluate((element) => getComputedStyle(element).backgroundColor))
      .toBe('rgb(25, 28, 32)')
    await expect
      .poll(() =>
        expandButton.locator('.v-icon').evaluate((element) => getComputedStyle(element).color),
      )
      .toBe('rgb(234, 243, 236)')
    await expandButton.click()
    await expect(page.locator('.map-root')).toHaveClass(/map-expanded/)
    await page.getByRole('button', { name: 'Reduzir mapa' }).click()
    await expect(page.locator('.map-root')).not.toHaveClass(/map-expanded/)

    await page.getByRole('button', { name: /Críticos/ }).click()
    const emptyAlert = map.locator('.map-filter-empty-card')
    await expect(emptyAlert).toBeVisible()
    const darkAlertColor = await emptyAlert.evaluate((element) => getComputedStyle(element).color)
    await page.getByRole('button', { name: 'Ativar tema claro' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(emptyAlert).toBeVisible()
    const lightAlertColor = await emptyAlert.evaluate((element) => getComputedStyle(element).color)
    expect(lightAlertColor).not.toBe(darkAlertColor)
    expect(pageErrors).toEqual([])
  })
}

test('hover da navegação fica legível e não mostra caixa vazia no tema escuro', async ({
  page,
}) => {
  await openMap(page, 1280, 'dark')
  const mapNavigation = page.locator('.desktop-nav .nav-item').last()

  await mapNavigation.hover()
  await expect
    .poll(() => mapNavigation.evaluate((element) => getComputedStyle(element).backgroundColor))
    .toBe('rgb(34, 38, 43)')

  await expect(mapNavigation).toContainText('Mapa')
  await expect(page.locator('.v-tooltip > .v-overlay__content:visible')).toHaveCount(0)
})

test('hover da navegação mantém o rótulo visível e remove a caixa vazia no tema claro', async ({
  page,
}) => {
  await openMap(page, 1280, 'light')
  const addTreeNavigation = page
    .locator('.desktop-nav .nav-item')
    .filter({ hasText: 'Cadastrar árvore' })
  await addTreeNavigation.hover()

  await expect(addTreeNavigation).toContainText('Cadastrar árvore')
  await expect(page.locator('.v-tooltip > .v-overlay__content:visible')).toHaveCount(0)
})
