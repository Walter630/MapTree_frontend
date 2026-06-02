<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import AppBarComponent from '@/components/MainView/AppBarComponent.vue'

/* ---------- Responsividade ---------- */

const isMobile = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => window.removeEventListener('resize', checkMobile))

/* ---------- Visibilidade do AppBar ---------- */

const route = useRoute()

const HIDDEN_ROUTES = [
  '/login',
  '/register',
  '/recovery',
  '/recovery-code',
  '/reset-password',
  '/edit-account',
  '/logout',
]

const showAppBar = computed(() => !HIDDEN_ROUTES.includes(route.path))

const MAP_ROUTES = ['/user/mapUser', '/manager/map', '/admin/map']
const isMapPage = computed(() => MAP_ROUTES.some(r => route.path.startsWith(r)))
</script>

<style>
/* Remove padding do v-main para páginas de mapa */
.map-page {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}
</style>

<template>
  <!-- Só mostra o AppBar se não estiver em login/cadastro -->
  <AppBarComponent v-if="showAppBar"  />

  <v-main
    :class="{ 'map-page': isMapPage }"
    :style="isMobile && !isMapPage ? 'padding-bottom: 10px !important;' : ''"
  >
    <router-view />
  </v-main>
</template>

<style scoped></style>
