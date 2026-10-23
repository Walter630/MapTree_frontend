<template>
  <v-app>
    <router-view />
    <!-- Vercel Web Analytics (coleta estatísticas de visitas em produção) -->
    <Analytics />
  </v-app>
</template>

<script lang="ts" setup>
import { Analytics } from '@vercel/analytics/vue'
</script>
