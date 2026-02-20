/**
 * plugins/index.ts
 *
 * Registra todos os plugins do Vue (Vuetify, Router, Pinia, API, etc.)
 * Incluído automaticamente em `./src/main.ts`
 */

import type { App } from 'vue'
import router from '../router'
import pinia from '../stores'
import vuetify from './vuetify'
import apiConnect from './apiConnect'
import { useAppStore } from '@/stores/app'

export function registerPlugins(app: App) {
  app
    .use(vuetify)
    .use(router)
    .use(pinia)
    .use(apiConnect)
    .use((vueAppInstance) => {
      vueAppInstance.config.globalProperties.$isMobile = () => vuetify.display.mobile.value
      vueAppInstance.config.globalProperties.$store = useAppStore()
    })

  app.provide('store', useAppStore())
}
