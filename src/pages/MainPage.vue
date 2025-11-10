<script setup lang="ts">
import AppBarComponent from '@/components/MainView/AppBarComponent.vue'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

const isMobile = ref(false)
const route = useRoute()

function checkMobile() {
  isMobile.value = window.innerWidth < 768
}

// executa ao montar e desmontar
onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})
onUnmounted(() => window.removeEventListener('resize', checkMobile))

// 🔹 Computed: mostra AppBar apenas quando NÃO estiver em login/cadastro
const showAppBar = computed(() => {
  const hiddenRoutes = ['/login', '/cadastro', '/recovery', '/reset', '/editPerfil', '/mensageEmail', '/resetSenha', '/recovery-code']
  return !hiddenRoutes.includes(route.path)
})
</script>

<template>
  <!-- Só mostra o AppBar se não estiver em login/cadastro -->
  <AppBarComponent v-if="showAppBar"  />

  <v-main :style="isMobile ? 'padding-bottom: 10px !important;' : ''">
    <router-view />
  </v-main>
</template>

<style scoped></style>
