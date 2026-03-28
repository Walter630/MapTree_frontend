// src/main.ts
import { createApp } from 'vue'
import { registerPlugins } from '@/plugins'
import App from './App.vue'

const app = createApp(App)
registerPlugins(app)

app.mount('#app')

// Code made by Walter and suported by Henry;
