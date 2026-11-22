import { expect, test, type Page } from '@playwright/test'

const originalUpdatedAt = '2026-11-17T13:00:00.000Z'
const locationAxisForWidth = (width: number): 'x' | 'y' => (width < 600 ? 'y' : 'x')
type TreeOverrides = Partial<{
  status: string
  effectiveStatus: string
  lastPruneDate: string | null
  vigor: string
}>

function makeTree(status = 'NORMAL', overrides: TreeOverrides = {}) {
  return {
    id: 'tree-1',
    createdById: 'employee-1',
    updatedAt: originalUpdatedAt,
    idSpecies: 'sp-1',
    latitude: -3.7319,
    longitude: -38.5267,
    address: 'Rua antiga, Centro',
    status,
    effectiveStatus: status,
    lastPruneDate: '2026-11-19T15:00:00.000Z',
    vigor: 'GOOD',
    species: {
      id: 'sp-1',
      commonName: 'Ipê-amarelo',
      scientificName: 'Handroanthus albus',
      family: 'Bignoniaceae',
    },
    measurements: [],
    ...overrides,
  }
}

async function openMap(
  page: Page,
  role: 'ADMIN' | 'MANAGER' | 'USER',
  width: number,
  treeAuthor = 'employee-1',
  treeStatus = 'NORMAL',
  theme: 'light' | 'dark' = 'light',
  includeSecondTree = false,
  treeOverrides: TreeOverrides = {},
) {
  const base = test.info().project.use.baseURL as string
  const uiOrigin = new URL(base).origin
  let storedTree = { ...makeTree(treeStatus, treeOverrides), createdById: treeAuthor }
  const secondTree = {
    ...makeTree('TO_PRUNE', { lastPruneDate: '2026-11-18T15:00:00.000Z' }),
    id: 'tree-2',
    createdById: treeAuthor,
    latitude: -3.7344,
    species: {
      id: 'sp-2',
      commonName: 'Oitizeiro',
      scientificName: 'Licania tomentosa',
      family: 'Chrysobalanaceae',
    },
  }
  const visibleTrees = () => (includeSecondTree ? [storedTree, secondTree] : [storedTree])
  const patchPayloads: Record<string, unknown>[] = []
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.setViewportSize({ width, height: width < 600 ? 844 : 900 })
  await page.context().grantPermissions(['geolocation'])
  await page.context().setGeolocation({ latitude: -3.7289, longitude: -38.5267 })
  await page.addInitScript((preference) => {
    localStorage.setItem('accessToken', 'playwright-test-token')
    localStorage.setItem('maptree:theme-preference', preference)
  }, theme)
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === uiOrigin ? route.continue() : route.abort(),
  )
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname === '/api/users/me/profile') {
      return route.fulfill({
        status: 200,
        json: {
          id: role === 'MANAGER' ? 'manager-1' : role === 'ADMIN' ? 'admin-1' : 'employee-1',
          name: 'Conta de teste',
          email: 'map@example.test',
          role,
          isActive: true,
          organization: { id: 'company-1', name: 'Empresa de teste' },
        },
      })
    }
    if (url.pathname === '/api/trees/tree-1' && request.method() === 'GET') {
      return route.fulfill({ status: 200, json: storedTree })
    }
    if (url.pathname === '/api/trees/tree-2' && request.method() === 'GET') {
      return route.fulfill({ status: 200, json: secondTree })
    }
    if (url.pathname === '/api/trees/tree-1/location' && request.method() === 'PATCH') {
      patchPayloads.push(request.postDataJSON() as Record<string, unknown>)
      storedTree = {
        ...storedTree,
        ...patchPayloads.at(-1),
        updatedAt: '2026-11-17T14:00:00.000Z',
      }
      return route.fulfill({ status: 200, json: storedTree })
    }
    if (url.pathname === '/api/trees/nearby' || url.pathname === '/api/trees/bounds') {
      return route.fulfill({ status: 200, json: visibleTrees() })
    }
    if (url.pathname === '/api/trees' && request.method() === 'GET') {
      return route.fulfill({ status: 200, json: visibleTrees() })
    }
    if (url.pathname.endsWith('/location-history')) {
      return route.fulfill({ status: 200, json: [] })
    }
    return route.fulfill({ status: 200, json: [] })
  })

  const mapPath =
    role === 'MANAGER' ? '/manager/map' : role === 'ADMIN' ? '/admin/map' : '/user/mapUser'
  await page.goto(mapPath)
  await expect(page.locator('#pruning-map-container')).toBeVisible()
  await expect(page.locator('.locating-overlay')).toBeHidden()
  await expect(page.locator('.tree-icon-marker')).toBeVisible({ timeout: 15_000 })
  return { pageErrors, patchPayloads, readStoredTree: () => storedTree }
}

test('map ocupa a altura total da viewport sem faixa vazia embaixo', async ({ page }) => {
  await openMap(page, 'USER', 1280)
  await page.setViewportSize({ width: 1916, height: 193 })

  const bounds = await page.locator('.full-map-page').evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return {
      top: Math.round(rect.top),
      bottom: Math.round(rect.bottom),
      viewportHeight: window.innerHeight,
    }
  })

  expect(bounds.top).toBe(0)
  expect(bounds.bottom).toBe(bounds.viewportHeight)
})

async function startDragAndReview(page: Page) {
  await clickTreeMarker(page)
  await page.getByRole('button', { name: 'Editar localização' }).click()
  const marker = page.locator('.tree-location-edit-marker')
  await expect(marker).toBeVisible()
  const box = await marker.boundingBox()
  if (!box) throw new Error('Marcador de edição sem posição no navegador')
  const startX = box.x + box.width / 2
  const startY = box.y + box.height / 2
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + 28, startY - 18, { steps: 5 })
  await page.mouse.up()
  await expect(page.getByText('Revisar nova localização', { exact: true })).toBeVisible()
}

async function clickTreeMarker(page: Page) {
  await page.locator('.tree-icon-marker').evaluate((marker) => (marker as HTMLElement).click())
}

for (const role of ['ADMIN', 'MANAGER', 'USER'] as const) {
  test(`clique e teclado abrem a análise do marcador para ${role}`, async ({ page }) => {
    await openMap(page, role, 1280)
    const marker = page.locator('.tree-icon-marker').first()

    await marker.click()
    await expect(page.getByRole('heading', { name: 'Análise da árvore' })).toBeVisible()
    await expect(page.getByText('Identificação: #tree-1')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Rota', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Ver IA', exact: true })).toHaveCount(0)

    await page.getByRole('button', { name: 'Fechar análise da árvore' }).click()
    await marker.focus()
    await marker.press('Enter')
    await expect(page.getByRole('heading', { name: 'Análise da árvore' })).toBeVisible()
    await expect(page.getByText('Ipê-amarelo')).toBeVisible()
  })
}

test('toque abre análise em tela móvel e apresenta classificação sem previsão', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  })
  const page = await context.newPage()
  try {
    await openMap(page, 'USER', 390)
    await page.locator('.tree-icon-marker').first().tap()
    await expect(page.getByRole('heading', { name: 'Análise da árvore' })).toBeVisible()
    await expect(page.getByText('Previsão indisponível')).toBeVisible()
    await expect(page.getByText('Risco operacional')).toBeVisible()
  } finally {
    await context.close()
  }
})

test('falha da consulta é diferente de previsão ausente', async ({ page }) => {
  await openMap(page, 'USER', 1280)
  await page.route('**/api/trees/tree-1/ai-prediction', (route) =>
    route.fulfill({ status: 503, json: { message: 'Consulta indisponível' } }),
  )

  await clickTreeMarker(page)
  await expect(
    page.getByText('Não foi possível consultar a previsão.', { exact: false }),
  ).toBeVisible()
  await expect(page.getByText('Nenhuma análise de IA disponível')).toHaveCount(0)
})

test('classificação registrada de poda aparece quando a previsão está ausente', async ({ page }) => {
  await openMap(page, 'USER', 1280, 'employee-1', 'TO_PRUNE')
  await clickTreeMarker(page)

  await expect(page.locator('.tree-ai-card').getByText('Poda necessária', { exact: true })).toBeVisible()
  await expect(page.locator('.tree-ai-card').getByText('19/11/2026', { exact: true })).toBeVisible()
  await expect(page.locator('.tree-ai-card').getByText('Bom', { exact: true })).toBeVisible()
  await expect(page.getByText('Previsão indisponível')).toBeVisible()
  await expect(page.locator('.tree-analysis-overview')).toHaveCount(0)
  await expect(page.locator('.tree-ai-card').getByRole('button', { name: 'Ver detalhes técnicos' })).toHaveCount(0)
})

test('card mostra dados do marcador antes de os detalhes terminarem de carregar', async ({ page }) => {
  await openMap(page, 'USER', 1280, 'employee-1', 'TO_PRUNE')
  let releaseDetails: (() => void) | undefined
  const detailsPending = new Promise<void>((resolve) => {
    releaseDetails = resolve
  })
  await page.route('**/api/trees/tree-1', async (route) => {
    await detailsPending
    return route.fulfill({ status: 200, json: makeTree('TO_PRUNE') })
  })

  await clickTreeMarker(page)
  const card = page.locator('.tree-ai-card')
  await expect(card.getByText('Poda necessária', { exact: true })).toBeVisible()
  await expect(card.getByText('19/11/2026', { exact: true })).toBeVisible()
  await expect(card.getByText('Bom', { exact: true })).toBeVisible()
  await expect(card.getByText('Consultando previsão...')).toBeVisible()

  releaseDetails?.()
  await expect(card.getByText('Previsão indisponível.')).toBeVisible()
})

test('classificação registrada aparece como texto secundário quando difere do risco', async ({ page }) => {
  await openMap(page, 'USER', 1280, 'employee-1', 'TO_PRUNE', 'light', false, {
    effectiveStatus: 'CRITICAL',
  })
  await clickTreeMarker(page)

  const card = page.locator('.tree-ai-card')
  await expect(card.locator('[aria-label="Risco operacional: Crítico"]')).toBeVisible()
  await expect(card.getByText('Classificação registrada: Poda necessária')).toBeVisible()
})

test('previsão válida permite abrir detalhes técnicos com foco e Enter', async ({ page }) => {
  await openMap(page, 'USER', 1280)
  await page.route('**/api/trees/tree-1/ai-prediction', (route) =>
    route.fulfill({
      status: 200,
      json: {
        estimated_height_m: 4,
        wire_height_m: 7,
        will_reach_wire: false,
        days_to_wire: 1200,
        months_to_wire: 40,
        risk_status: 'NORMAL',
        alert: null,
        canopy: { shape: 'WIDE', ratio_width_height: 0.8 },
        fibonacci_info: { growth_modifier: 0.6 },
      },
    }),
  )

  await clickTreeMarker(page)
  const card = page.locator('.tree-ai-card')
  const detailsButton = card.getByRole('button', { name: 'Ver detalhes técnicos' })
  await expect(detailsButton).toBeVisible()
  await detailsButton.focus()
  await expect(detailsButton).toBeFocused()
  await detailsButton.press('Enter')
  await expect(card.locator('.technical-details')).toBeVisible()
})

test('falha oferece nova tentativa sem ocultar risco nem data', async ({ page }) => {
  await openMap(page, 'USER', 1280, 'employee-1', 'TO_PRUNE')
  let attempts = 0
  await page.route('**/api/trees/tree-1/ai-prediction', (route) => {
    attempts += 1
    if (attempts === 1) {
      return route.fulfill({ status: 503, json: { message: 'Consulta indisponível' } })
    }
    return route.fulfill({
      status: 200,
      json: {
        estimated_height_m: 4,
        wire_height_m: 7,
        risk_status: 'NORMAL',
        canopy: {},
        fibonacci_info: {},
      },
    })
  })

  await clickTreeMarker(page)
  const card = page.locator('.tree-ai-card')
  await expect(card.getByRole('alert')).toContainText('Não foi possível consultar a previsão.')
  await expect(card.getByText('Poda necessária', { exact: true })).toBeVisible()
  await expect(card.getByText('19/11/2026', { exact: true })).toBeVisible()
  await card.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(card.getByRole('button', { name: 'Ver detalhes técnicos' })).toBeVisible()
  expect(attempts).toBe(2)
})

test('fechar durante a consulta descarta a resposta atrasada', async ({ page }) => {
  await openMap(page, 'USER', 1280)
  let releasePrediction: (() => void) | undefined
  const predictionPending = new Promise<void>((resolve) => {
    releasePrediction = resolve
  })
  await page.route('**/api/trees/tree-1/ai-prediction', async (route) => {
    await predictionPending
    return route.fulfill({
      status: 200,
      json: {
        estimated_height_m: 4,
        wire_height_m: 7,
        will_reach_wire: false,
        days_to_wire: 1200,
        months_to_wire: 40,
        risk_status: 'NORMAL',
        alert: null,
        canopy: {},
        fibonacci_info: {},
      },
    })
  })

  await clickTreeMarker(page)
  await expect(page.getByText('Consultando previsão...')).toBeVisible()
  await page.getByRole('button', { name: 'Fechar análise da árvore' }).click()
  releasePrediction?.()
  await expect(page.getByRole('heading', { name: 'Análise da árvore' })).toHaveCount(0)
})

test('trocar de árvore durante a consulta descarta a resposta anterior', async ({ page }) => {
  await openMap(page, 'USER', 1280, 'employee-1', 'NORMAL', 'light', true)
  let releaseFirstDetails: (() => void) | undefined
  const firstDetailsPending = new Promise<void>((resolve) => {
    releaseFirstDetails = resolve
  })
  await page.route('**/api/trees/tree-1', async (route) => {
    await firstDetailsPending
    return route.fulfill({ status: 200, json: makeTree('NORMAL') })
  })

  const markers = page.locator('.tree-icon-marker')
  await expect(markers).toHaveCount(2)
  await markers.nth(0).click()
  await expect(page.getByText('Consultando previsão...')).toBeVisible()
  await markers.nth(1).click()
  const drawer = page.locator('.ai-drawer')
  await expect(drawer.getByText('Oitizeiro', { exact: true })).toBeVisible()
  await expect(page.getByText('Poda necessária', { exact: true }).first()).toBeVisible()

  releaseFirstDetails?.()
  await expect(drawer.getByText('Oitizeiro', { exact: true })).toBeVisible()
  await expect(drawer.getByText('Ipê-amarelo', { exact: true })).toHaveCount(0)
})

test('gestor arrasta, revisa endereço e persiste a localização no desktop', async ({ page }) => {
  const { pageErrors, patchPayloads, readStoredTree } = await openMap(page, 'MANAGER', 1280)
  await startDragAndReview(page)
  await page.getByLabel('Endereço associado (revise)').fill('Rua nova, Centro')
  await page.getByRole('button', { name: 'Salvar localização' }).click()

  await expect(page.getByText('Localização da árvore atualizada e registrada no histórico.')).toBeVisible()
  expect(patchPayloads).toHaveLength(1)
  expect(patchPayloads[0]).toMatchObject({
    address: 'Rua nova, Centro',
    expectedUpdatedAt: originalUpdatedAt,
  })
  expect(Number(patchPayloads[0]?.latitude)).not.toBe(-3.7319)
  expect(Number(patchPayloads[0]?.longitude)).not.toBe(-38.5267)
  expect(readStoredTree()).toMatchObject({ address: 'Rua nova, Centro' })
  expect(pageErrors).toEqual([])

  await page.reload()
  await expect(page.locator('.tree-icon-marker')).toBeVisible({ timeout: 15_000 })
  await clickTreeMarker(page)
  await expect(page.getByText('Rua nova, Centro')).toBeVisible()
})

test('funcionário autor consegue rever a posição em viewport móvel', async ({ page }) => {
  const { patchPayloads } = await openMap(page, 'USER', 390)
  await startDragAndReview(page)
  await expect(page.getByRole('button', { name: 'Cancelar' })).toBeVisible()
  await page.getByRole('button', { name: 'Salvar localização' }).click()
  await expect(page.getByText('Localização da árvore atualizada e registrada no histórico.')).toBeVisible()
  expect(patchPayloads).toHaveLength(1)
})

test('cancelar restaura o ponto original e não envia atualização', async ({ page }) => {
  const { patchPayloads } = await openMap(page, 'MANAGER', 1280)
  await startDragAndReview(page)
  await page.getByRole('button', { name: 'Cancelar' }).click()
  await expect(page.getByText('Revisar nova localização', { exact: true })).toHaveCount(0)
  expect(patchPayloads).toHaveLength(0)

  await clickTreeMarker(page)
  await expect(page.getByText('-3.73190, -38.52670', { exact: true })).toBeVisible()
})

test('falha de rede mantém o rascunho para nova tentativa', async ({ page }) => {
  await openMap(page, 'MANAGER', 1280)
  let attempts = 0
  await page.route('**/api/trees/tree-1/location', async (route) => {
    attempts += 1
    if (attempts === 1) {
      return route.fulfill({ status: 503, json: { message: 'Falha temporária simulada' } })
    }
    const payload = route.request().postDataJSON() as Record<string, unknown>
    return route.fulfill({
      status: 200,
      json: {
        ...makeTree(),
        ...payload,
        updatedAt: '2026-11-17T14:00:00.000Z',
      },
    })
  })

  await startDragAndReview(page)
  const draftLatitude = await page.getByLabel('Latitude').inputValue()
  await page.getByRole('button', { name: 'Salvar localização' }).click()
  await expect(page.locator('.v-alert[role="alert"]')).toBeVisible()
  await expect(page.getByLabel('Latitude')).toHaveValue(draftLatitude)

  await page.getByRole('button', { name: 'Salvar localização' }).click()
  await expect(page.getByText('Localização da árvore atualizada e registrada no histórico.')).toBeVisible()
  expect(attempts).toBe(2)
})

test('envio repetido durante a gravação gera apenas uma atualização', async ({ page }) => {
  const { patchPayloads } = await openMap(page, 'MANAGER', 1280)
  let attempts = 0
  await page.route('**/api/trees/tree-1/location', async (route) => {
    attempts += 1
    await new Promise((resolve) => setTimeout(resolve, 300))
    const payload = route.request().postDataJSON() as Record<string, unknown>
    return route.fulfill({
      status: 200,
      json: { ...makeTree(), ...payload, updatedAt: '2026-11-17T14:00:00.000Z' },
    })
  })

  await startDragAndReview(page)
  const saveButton = page.getByRole('button', { name: 'Salvar localização' })
  await saveButton.click()
  await saveButton.evaluate((button) =>
    button.dispatchEvent(new MouseEvent('click', { bubbles: true })),
  )
  await expect(page.getByText('Localização da árvore atualizada e registrada no histórico.')).toBeVisible()
  expect(attempts).toBe(1)
  expect(patchPayloads).toHaveLength(0)
})

test('conflito de versão pede revisão antes de continuar', async ({ page }) => {
  await openMap(page, 'MANAGER', 1280)
  await page.route('**/api/trees/tree-1/location', (route) =>
    route.fulfill({
      status: 409,
      json: { message: 'Esta árvore foi atualizada por outra pessoa.' },
    }),
  )

  await startDragAndReview(page)
  await page.getByRole('button', { name: 'Salvar localização' }).click()
  await expect(
    page.locator('.v-alert[role="alert"]').filter({ hasText: 'Outra pessoa atualizou esta árvore' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Recarregar versão atual' })).toBeVisible()
})

test('funcionário não recebe edição da localização de árvore de colega', async ({ page }) => {
  const { pageErrors } = await openMap(page, 'USER', 1280, 'employee-2')
  await clickTreeMarker(page)
  await expect(page.getByRole('button', { name: 'Editar localização' })).toHaveCount(0)
  expect(pageErrors).toEqual([])
})

for (const [width, theme] of [
  [1280, 'dark'],
  [390, 'dark'],
] as const) {
  test(`formulário de localização mantém campos e ações acessíveis em ${width}px no tema ${theme}`, async ({ page }) => {
    await openMap(page, 'MANAGER', width, 'employee-1', 'NORMAL', theme)
    await startDragAndReview(page)

    const card = page.locator('.location-review-card')
    await expect(card).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    const latitudeBox = await page.getByLabel('Latitude').boundingBox()
    const longitudeBox = await page.getByLabel('Longitude').boundingBox()
    const latitudePosition = latitudeBox ?? { x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY }
    const longitudePosition = longitudeBox ?? { x: Number.NEGATIVE_INFINITY, y: Number.NEGATIVE_INFINITY }
    const axis = locationAxisForWidth(width)
    expect(longitudePosition[axis]).toBeGreaterThan(latitudePosition[axis])

    const backgroundColor = await card.evaluate((element) => getComputedStyle(element).backgroundColor)
    expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
    await expect(page.getByRole('button', { name: 'Cancelar' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Salvar localização' })).toBeVisible()
    await page.getByRole('button', { name: 'Cancelar' }).focus()
    await expect(page.getByRole('button', { name: 'Cancelar' })).toBeFocused()
  })
}

for (const [width, theme] of [
  [1280, 'light'],
  [1280, 'dark'],
  [390, 'light'],
  [390, 'dark'],
] as const) {
  test(`card único da árvore cabe em ${width}px no tema ${theme}`, async ({ page }) => {
    await openMap(page, 'USER', width, 'employee-1', 'TO_PRUNE', theme)
    await clickTreeMarker(page)

    const card = page.locator('.tree-ai-card')
    await expect(card).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    await expect(card.getByText('Poda necessária', { exact: true })).toBeVisible()
    await expect(card.getByText('19/11/2026', { exact: true })).toBeVisible()
    await expect(card.getByText('Bom', { exact: true })).toBeVisible()
    await expect(card.getByText('Previsão indisponível.')).toBeVisible()

    const layout = await card.evaluate((element) => {
      const style = getComputedStyle(element)
      return {
        background: style.backgroundColor,
        color: style.color,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        right: element.getBoundingClientRect().right,
      }
    })
    expect(layout.background).not.toBe('rgba(0, 0, 0, 0)')
    expect(layout.color).not.toBe(layout.background)
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth)
    expect(layout.right).toBeLessThanOrEqual(width + 1)
  })
}
