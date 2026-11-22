import { beforeEach, describe, expect, it } from 'vitest'
import {
  readThemePreference,
  resolveVuetifyTheme,
  THEME_PREFERENCE_STORAGE_KEY,
} from './themePreference'

describe('preferência de tema', () => {
  beforeEach(() => window.localStorage.clear())

  it('inicia no claro quando a preferência está ausente ou é legada', () => {
    expect(readThemePreference()).toBe('light')
    window.localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, 'system')
    expect(readThemePreference()).toBe('light')
  })

  it('lembra as escolhas Claro e Escuro no navegador', () => {
    window.localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, 'dark')
    expect(readThemePreference()).toBe('dark')
    expect(resolveVuetifyTheme('light')).toBe('maptreeLight')
    expect(resolveVuetifyTheme('dark')).toBe('maptreeDark')
  })
})
