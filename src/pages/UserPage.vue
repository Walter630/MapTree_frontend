<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'UserPage',
})
</script>

<template>
  <v-main class="user-main">
    <router-view />
  </v-main>
</template>

<style scoped>
.user-main {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}
</style>
