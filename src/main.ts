// src/main.ts
import { createApp } from 'vue'
import { registerPlugins } from '@/plugins'
import App from './App.vue'
// Estilos globais da aplicação (classe .page-shell, resets, etc.)
import '@/assets/main.css'

const app = createApp(App)
registerPlugins(app)

app.mount('#app')

// Code made by Walter;
