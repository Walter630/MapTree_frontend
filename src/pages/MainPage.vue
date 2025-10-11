<script setup lang="ts">
import MainComponent from '@/components/MainView/MainComponent.vue'
import { ref } from 'vue'

const isMobile = ref(false)
function checkMobile () {
  isMobile.value = window.innerWidth < 768 ? true : false
}
window.addEventListener('resize', checkMobile)
</script>

<template>
  <v-main :style="isMobile ? 'padding-bottom: 10px !important;' : ''">
    <router-view />
  </v-main>

</template>

<style scoped>

</style>
