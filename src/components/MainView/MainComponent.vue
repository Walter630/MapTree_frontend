<script setup lang="ts">
import { useRouter } from 'vue-router'

import { useAppStore } from '@/stores/app.ts'
const router = useRouter()
const store = useAppStore()

async function logout () {
  router.push('/login')
}

</script>

<template>
  <v-btn @click="logout()">Botão</v-btn>
</template>

<style scoped>

</style>
