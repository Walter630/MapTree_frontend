/**
 * plugins/vuetify.ts
 *
 * Configuração do Vuetify — tema, componentes e diretivas.
 */

import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { VPie } from 'vuetify/labs/VPie'
import { readThemePreference, resolveVuetifyTheme } from '@/utils/themePreference'

const initialTheme = resolveVuetifyTheme(readThemePreference())
if (typeof document !== 'undefined')
  document.documentElement.dataset.theme = initialTheme === 'maptreeDark' ? 'dark' : 'light'

export default createVuetify({
  components: { ...components, VPie },
  directives,
  theme: {
    defaultTheme: initialTheme,
    variations: {
      colors: ['green'],
      lighten: 5,
      darken: 5,
    },
    themes: {
      maptreeLight: {
        dark: false,
        colors: {
          background: '#F6F6F6',
          surface: '#FFFFFF',
          primary: '#005657',
          secondary: '#007F43',
          accent: '#B5E440',
          success: '#007F43',
          warning: '#A85B00',
          error: '#B42318',
          info: '#5C95E2',
          // Variante de interface ligeiramente mais escura para texto branco legível.
          green: '#007F43',
          'on-background': '#343434',
          'on-surface': '#343434',
          'on-primary': '#FFFFFF',
          'on-secondary': '#FFFFFF',
          'on-accent': '#00281A',
          'on-success': '#FFFFFF',
          'on-warning': '#FFFFFF',
          'on-error': '#FFFFFF',
          'on-info': '#00281A',
          'on-green': '#FFFFFF',
          'surface-variant': '#EAF1EC',
          outline: '#64736A',
        },
      },
      maptreeDark: {
        dark: true,
        colors: {
          background: '#101214',
          surface: '#191C20',
          'surface-variant': '#22262B',
          primary: '#71D4B3',
          secondary: '#75D397',
          accent: '#D2E986',
          success: '#176C3C',
          warning: '#8C4B00',
          error: '#9F3029',
          info: '#245B8F',
          green: '#176C3C',
          'on-background': '#EAF3EC',
          'on-surface': '#EAF3EC',
          'on-primary': '#00281A',
          'on-secondary': '#00281A',
          'on-accent': '#00281A',
          'on-success': '#FFFFFF',
          'on-warning': '#FFFFFF',
          'on-error': '#FFFFFF',
          'on-info': '#FFFFFF',
          'on-green': '#FFFFFF',
          outline: '#718279',
        },
      },
    },
  },
})
