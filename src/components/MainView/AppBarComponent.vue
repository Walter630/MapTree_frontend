<template>
  <!-- DESKTOP -->
  <v-app-bar color="white" flat v-if="!isMobile" style="margin: 1px 0">

    <!-- Logo -->
    <img
      src="@/assets/LogomaptreeHeaderpng.png"
      alt="Logo"
      style="width: 150px; height: 52px; margin-left: 25px; margin-top: 10px;"
    />

    <v-spacer />

    <!-- MENU -->
    <v-toolbar-items class="d-flex justify-center" style="margin-top: 10px;">
      <v-btn
        v-for="item in currentMenu"
        :key="item.to"
        variant="text"
        style="margin-right: 10px;"
        :color="isActive(item.to) ? 'black' : 'grey-darken-2'"
        @click="goTo(item.to)"
      >
        <v-icon size="24" style="margin-right: 5px;" :color="isActive(item.to) ? green : 'black'">
          {{ item.icon }}
        </v-icon>

        {{ item.title }}
      </v-btn>
    </v-toolbar-items>

    <v-spacer />
    <v-btn icon :color="isActive('/notifications') ? green : 'black'" style="background-color: #D9D9D9; margin-right: 20px; height: 45px; width: 45px;" @click="goTo('/gestor/notifications')">
      <v-icon>mdi-bell-outline</v-icon>
    </v-btn>

    <!-- Perfil -->
    <v-avatar size="45" color="grey-darken-2" style="margin-right: 20px;" @click="goTo('')">
      <img
        src="@/assets/Logomaptreeverde.png"
        alt="Perfil"
        style="width: 45px; height: 45px; border-radius: 50%;"
      />

    </v-avatar>

  </v-app-bar>

  <!-- MOBILE -->
  <v-app-bar flat v-else>
    <v-btn icon @click="drawer = !drawer">
      <v-icon>mdi-menu</v-icon>
    </v-btn>

    <v-navigation-drawer v-model="drawer" temporary>
      <v-list>
        <v-list-item
          v-for="item in currentMenu"
          :key="item.to"
          @click="goTo(item.to)"
        >
          <v-list-item-icon>
            <v-icon>{{ item.icon }}</v-icon>
          </v-list-item-icon>
          <v-list-item-title>
            {{ item.title }}
          </v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
  </v-app-bar>
</template>
<script lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'

interface MenuItem {
  title: string
  icon: string
  to: string
}

export default {
  name: 'AppBarComponent',

  setup() {
    const store = useAppStore()
    const route = useRoute()
    const router = useRouter()

    const drawer = ref(false)
    const green = '#C1E328'

    // 🔥 MENUS POR ROLE
    const menus: Record<string, MenuItem[]> = {
      ADMIN: [
        { title: 'Painel', icon: 'mdi-view-dashboard', to: '/admin' },
        { title: 'Empresas', icon: 'mdi-domain', to: '/admin/companies' },
        { title: 'Gestores', icon: 'mdi-account-group', to: '/admin/managers' },
      ],

      MANAGER: [
        { title: 'Painel', icon: 'mdi-view-dashboard', to: '/manager' },
        { title: 'Funcionários', icon: 'mdi-account-group', to: '/manager/employees' },
        { title: 'Relatórios', icon: 'mdi-file-chart', to: '/manager/reports' },
      ],

      USER: [
        { title: 'Painel', icon: 'mdi-view-dashboard', to: '/' },
        { title: 'Podas', icon: 'mdi-content-cut', to: '/podas' },
        { title: 'Relatórios', icon: 'mdi-file-chart', to: '/relatorios' }
      ],

      USER_CREDENCIADO: [
        { title: 'Painel', icon: 'mdi-view-dashboard', to: '/credenciado' },
        { title: 'Rotas', icon: 'mdi-map', to: '/credenciado/rotas' },
        { title: 'Podas', icon: 'mdi-leaf', to: '/credenciado/podas' },
      ],

      GUEST: [
        { title: 'Login', icon: 'mdi-login', to: '/login' },
        { title: 'Criar Conta', icon: 'mdi-account-plus', to: '/register' }
      ],
    }

    // 🔥 MENU BASEADO NO USUÁRIO LOGADO
    const currentMenu = computed<MenuItem[]>(() => {
      const role = store.user?.role

      if (!role) return menus.ADMIN

      return menus[role] ?? menus.ADMIN
    })

    const isActive = (path: string) => route.path === path

    const goTo = (path: string) => {
      router.push(path)
      drawer.value = false
    }

    // MOBILE
    const isMobile = computed(() => store.isMobile)

    const checkMobile = () => {
      store.setIsMobile(window.innerWidth < 960)
    }

    onMounted(() => {
      checkMobile()
      window.addEventListener('resize', checkMobile)
    })

    watch(() => route.path, () => {
      drawer.value = false
    })

    return {
      drawer,
      green,
      currentMenu,
      isMobile,
      isActive,
      goTo
    }
  }
}
</script>
