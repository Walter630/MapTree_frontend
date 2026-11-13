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

export default createVuetify({
  components: { ...components, VPie },
  directives,
  theme: {
    defaultTheme: 'maptreeLight',
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
        },
      },
    },
  },
})
