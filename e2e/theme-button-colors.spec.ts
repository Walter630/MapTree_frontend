import { expect, test, type Locator, type Page } from '@playwright/test'

type Theme = 'light' | 'dark'
type Interaction = 'hover' | 'focus' | 'pressed'

const themeButtonLabels: Record<Theme, string> = {
  light: 'Ativar tema escuro',
  dark: 'Ativar tema claro',
}

function contrastRatio(foreground: string, background: string): number | null {
  const luminance = (value: string) => {
    const channels = value.match(/[\d.]+/g)?.slice(0, 3).map(Number)
    if (!channels || channels.length !== 3) return null
    const linear = channels.map((channel) => {
      const normalized = channel / 255
      return normalized <= 0.04045
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!
  }
  const first = luminance(foreground)
  const second = luminance(background)
  if (first === null || second === null) return null
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

async function setup(page: Page, theme: Theme) {
  const base = test.info().project.use.baseURL as string
  const uiOrigin = new URL(base).origin
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.addInitScript((preference) => {
    localStorage.setItem('accessToken', 'playwright-test-token')
    localStorage.setItem('maptree:theme-preference', preference)
  }, theme)
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
          cpf: '00000000000',
          phone: '',
          role: 'USER',
          isActive: true,
        },
      })
    }
    if (url.pathname === '/api/species') {
      return route.fulfill({ status: 200, json: [{ id: 'species-1', commonName: 'Ipê' }] })
    }
    return route.fulfill({ status: 200, json: [] })
  })
  await page.goto('/user/trees/new')
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
}

async function inspectColors(button: Locator) {
  return button.evaluate((element) => {
    const style = getComputedStyle(element)
    const icon = element.querySelector<HTMLElement>('.v-icon')
    return {
      color: style.color,
      background: style.backgroundColor,
      icon: icon ? getComputedStyle(icon).color : style.color,
      variant: [...element.classList].find((name) => name.startsWith('v-btn--variant-')),
    }
  })
}

function assertAccessibleColors(
  theme: Theme,
  interaction: Interaction,
  computed: Awaited<ReturnType<typeof inspectColors>>,
) {
  expect(computed.color).not.toBe('rgba(0, 0, 0, 0)')
  expect(computed.icon).toBe(computed.color)
  if (computed.variant !== 'v-btn--variant-flat' || computed.background === 'rgba(0, 0, 0, 0)')
    return
  const ratio = contrastRatio(computed.color, computed.background)
  expect(
    ratio,
    `${theme} ${interaction}: ${computed.color} sobre ${computed.background}`,
  ).toBeGreaterThanOrEqual(4.5)
}

async function prepareInteraction(page: Page, button: Locator, interaction: Interaction) {
  const actions: Record<Interaction, () => Promise<void>> = {
    hover: () => button.hover(),
    focus: () => button.focus(),
    pressed: async () => {
      const box = (await button.boundingBox())!
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
    },
  }
  await actions[interaction]()
}

async function finishInteraction(page: Page, interaction: Interaction) {
  const actions: Record<Interaction, () => Promise<void>> = {
    hover: async () => undefined,
    focus: async () => undefined,
    pressed: async () => {
      await page.mouse.move(0, 0)
      await page.mouse.up()
    },
  }
  await actions[interaction]()
}

for (const theme of ['light', 'dark'] as const) {
  test(`botões mantêm contraste e ícone alinhado no tema ${theme}`, async ({ page }) => {
    await setup(page, theme)
    const filled = page.getByRole('button', { name: 'Salvar árvore' })
    const outlined = page.getByRole('button', { name: 'Cancelar', exact: true })
    const text = page.getByRole('button', { name: themeButtonLabels[theme] })
    await expect(filled).toBeVisible()

    for (const button of [filled, outlined, text]) {
      for (const interaction of ['hover', 'focus', 'pressed'] as const) {
        await prepareInteraction(page, button, interaction)
        assertAccessibleColors(theme, interaction, await inspectColors(button))
        await finishInteraction(page, interaction)
      }
    }
  })
}
