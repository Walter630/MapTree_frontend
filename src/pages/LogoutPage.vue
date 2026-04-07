<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { apiConnect } from '@/plugins/apiConnect'

const router = useRouter()

onMounted(() => {
  apiConnect.logout()
  router.push('/login')
})
</script>

<template>
  <v-container class="fill-height d-flex align-center justify-center">
    <v-progress-circular indeterminate color="primary" size="48" />
  </v-container>
</template>
