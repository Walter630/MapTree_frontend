<template>
  <v-app>
    <router-view />
    <!-- Vercel Web Analytics: só em produção (evita erros/ruído no console em dev) -->
    <Analytics v-if="isProd" />
  </v-app>
</template>

<script lang="ts" setup>
import { Analytics } from '@vercel/analytics/vue'

const isProd = import.meta.env.PROD
</script>
