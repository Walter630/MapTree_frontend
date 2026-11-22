<template>
  <v-app>
    <router-view />
    <!-- Vercel Web Analytics: só em produção (evita erros/ruído no console em dev) -->
    <Analytics v-if="isProd" />
  </v-app>
</template>

<script lang="ts" setup>
import { computed, provide, ref, watch } from 'vue'
import { Analytics } from '@vercel/analytics/vue'
import vuetify from '@/plugins/vuetify'
import {
  readThemePreference,
  resolveVuetifyTheme,
  THEME_PREFERENCE_STORAGE_KEY,
  themePreferenceInjectionKey,
  type ThemePreference,
} from '@/utils/themePreference'

const isProd = import.meta.env.PROD
const themePreference = ref<ThemePreference>(readThemePreference())
const themeIsDark = computed(() => themePreference.value === 'dark')

function applyTheme(preference: ThemePreference) {
  vuetify.theme.change(resolveVuetifyTheme(preference))
  if (typeof document !== 'undefined') document.documentElement.dataset.theme = preference
}

function toggleTheme() {
  const preference: ThemePreference = themeIsDark.value ? 'light' : 'dark'
  themePreference.value = preference
  try {
    window.localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, preference)
  } catch {
    // Mantém a escolha somente nesta sessão quando o armazenamento estiver bloqueado.
  }
}

watch(themePreference, applyTheme, { immediate: true, flush: 'sync' })
provide(themePreferenceInjectionKey, { preference: themePreference, toggle: toggleTheme })
</script>
