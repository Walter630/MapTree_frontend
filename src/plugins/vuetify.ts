// src/plugins/vuetify.ts
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

// Ícones do Material Design
import '@mdi/font/css/materialdesignicons.css'
import { VPie } from 'vuetify/labs/VPie'

export default createVuetify({
  components: {
    ...components,
    VPie,
  },
  directives,
  theme: {
    defaultTheme: 'light',
  },
})
