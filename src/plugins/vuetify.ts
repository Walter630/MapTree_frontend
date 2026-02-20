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
  theme: { defaultTheme: 'light' },
})
