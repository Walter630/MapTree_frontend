/**
 * plugins/index.ts
 *
 * Automatically included in `./src/main.ts`
 */

// Types
import type { App } from 'vue'
import router from '../router'
import pinia from '../stores'

// Plugins
import vuetify from './vuetify'
import apiConnect from './apiConnect'

export function registerPlugins (app: App) {
  app
    .use(vuetify)
    .use(router)
    .use(pinia)
    .use(apiConnect)
    .use(vueAppInstance => {
      vueAppInstance.config.globalProperties.$isMobile = () => vuetify.display.mobile.value
    })
}
