import type { InjectionKey, Ref } from 'vue'

export type ThemePreference = 'light' | 'dark'
export type VuetifyThemeName = 'maptreeLight' | 'maptreeDark'

export const THEME_PREFERENCE_STORAGE_KEY = 'maptree:theme-preference'

export interface ThemePreferenceContext {
  preference: Readonly<Ref<ThemePreference>>
  toggle: () => void
}

export const themePreferenceInjectionKey: InjectionKey<ThemePreferenceContext> =
  Symbol('maptree-theme-preference')

export function readThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'light'
  try {
    const preference = window.localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY)
    return preference === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function resolveVuetifyTheme(preference: ThemePreference): VuetifyThemeName {
  return preference === 'dark' ? 'maptreeDark' : 'maptreeLight'
}
