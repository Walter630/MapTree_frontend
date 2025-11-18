import { registerPlugins } from '@/plugins'

// src/main.ts
import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)

registerPlugins(app)

app.mount('#app')
