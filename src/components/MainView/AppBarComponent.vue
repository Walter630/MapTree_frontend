<template>
  <!-- ===== Desktop AppBar ===== -->
  <v-app-bar v-if="!isMobile" color="white" flat class="appbar-desktop">
    <!-- Logo -->
    <div class="logo-container" @click="goToHome()">
      <img
        :src="logoSrc"
        alt="Logo MapTree"
        class="logo-img"
        @error="onLogoError"
      />
    </div>

    <v-spacer />

    <!-- Menu de Navegação -->
    <v-toolbar-items class="d-flex align-center">
      <v-btn
        v-for="item in currentMenu"
        :key="item.to"
        variant="text"
        class="mr-2"
        :color="isActive(item.to) ? 'black' : 'grey-darken-2'"
        @click="goTo(item.to)"
      >
        <v-icon size="24" class="mr-1" :color="isActive(item.to) ? green : 'black'">
          {{ item.icon }}
        </v-icon>
        {{ item.title }}
      </v-btn>
    </v-toolbar-items>

    <v-spacer />

    <!-- Notificações -->
    <v-btn
      icon
      :color="isActive('/notifications') ? green : 'black'"
      class="notification-btn mr-5"
      @click="goToNotification()"
    >
      <v-icon>mdi-bell-outline</v-icon>
    </v-btn>

    <!-- Menu do Usuário -->
    <v-menu min-width="200px">
      <template v-slot:activator="{ props }">
        <div v-bind="props" class="user-menu-trigger">
          <v-avatar size="40" class="user-avatar">
            <img src="@/assets/Logomaptreeverde.png" alt="Perfil" class="avatar-img" />
          </v-avatar>
          <span class="user-name">{{ user?.name || 'Usuário' }}</span>
          <v-icon size="20">mdi-menu-down</v-icon>
        </div>
      </template>

      <v-card>
        <v-card-text>
          <div class="mx-auto text-center">
            <v-avatar size="40" class="user-avatar">
              <img src="@/assets/Logomaptreeverde.png" alt="Perfil" class="avatar-img" />
            </v-avatar>
            <h3>{{ user?.name }}</h3>
            <p class="text-caption mt-1">{{ user?.email }}</p>
            <v-divider class="my-3" />
            <v-btn variant="text" rounded @click="editAccount">Edit Account</v-btn>
            <v-divider class="my-3" />
            <v-btn variant="text" rounded @click="logout">Disconnect</v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-menu>
  </v-app-bar>

  <!-- ===== Mobile AppBar ===== -->
  <template v-else>
    <!-- Navigation Drawer - FORA da AppBar -->
    <v-navigation-drawer
      v-model="drawer"
      location="left"
      temporary
      color="white"
      class="mobile-drawer"
    >
      <!-- Logo no drawer -->
      <div class="pa-4 text-center">
        <img
          src="@/assets/LogomaptreeHeaderpng.png"
          alt="Logo MapTree"
          style="height: 40px; max-width: 100%;"
          @click="goToHome(); drawer = false"
        />
      </div>

      <v-divider />

      <v-list nav density="compact">
        <v-list-item
          v-for="item in currentMenu"
          :key="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
          :active="isActive(item.to)"
          :color="isActive(item.to) ? 'green-darken-1' : undefined"
          @click="goTo(item.to); drawer = false"
          class="mb-1"
        />
      </v-list>

      <template v-slot:append>
        <div class="pa-4">
          <v-btn
            block
            variant="tonal"
            color="grey"
            prepend-icon="mdi-logout"
            @click="logout"
          >
            Sair
          </v-btn>
        </div>
      </template>
    </v-navigation-drawer>

    <!-- AppBar Mobile -->
    <v-app-bar
      color="white"
      flat
      class="appbar-mobile"
      elevation="1"
    >
      <v-btn
        icon
        variant="text"
        @click="drawer = !drawer"
      >
        <v-icon>mdi-menu</v-icon>
      </v-btn>

      <!-- Logo centralizada -->
      <div class="logo-mobile" @click="goToHome()">
        <img
          src="@/assets/LogomaptreeHeaderpng.png"
          alt="MapTree"
          style="height: 32px;"
        />
      </div>

      <v-spacer />

      <!-- Notificações -->
      <v-btn
        icon
        variant="text"
        :color="isActive('/notifications') ? green : 'black'"
        @click="goToNotification()"
      >
        <v-icon>mdi-bell-outline</v-icon>
      </v-btn>
    </v-app-bar>
  </template>
</template>

<script lang="ts">
import { useAppStore } from '@/stores/app'
import { getHomeRouteByRole } from '@/router/helpers/getHomeRoute'
import { getNotificationRoute } from '@/router/helpers/getNotificationRoute'

/* ===================================
   TIPOS
=================================== */

interface MenuItem {
  title: string
  icon: string
  to: string
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

/* ===================================
   MENUS POR ROLE
=================================== */

const MENUS: Record<string, MenuItem[]> = {
  ADMIN: [
    { title: 'Painel', icon: 'mdi-view-dashboard', to: '/admin' },
    { title: 'Empresas', icon: 'mdi-domain', to: '/admin/companies' },
    { title: 'Gestores', icon: 'mdi-account-group', to: '/admin/managers' },
    { title: 'Mapa', icon: 'mdi-map', to: '/admin/map' },
  ],
  MANAGER: [
    { title: 'Painel', icon: 'mdi-view-dashboard', to: '/manager' },
    { title: 'Funcionários', icon: 'mdi-account-group', to: '/manager/employees' },
    { title: 'Relatórios', icon: 'mdi-file-chart', to: '/manager/reports' },
    { title: 'Mapa', icon: 'mdi-map', to: '/manager/map' },
  ],
  USER: [
    { title: 'Painel', icon: 'mdi-view-dashboard', to: '/user' },
    { title: 'Podas', icon: 'mdi-content-cut', to: '/user/podas' },
    { title: 'Relatórios', icon: 'mdi-file-chart', to: '/user/reports' },
    { title: 'Mapa', icon: 'mdi-map', to: '/user/mapUser' },
  ],
  GUEST: [
    { title: 'Login', icon: 'mdi-login', to: '/login' },
    { title: 'Criar Conta', icon: 'mdi-account-plus', to: '/register' },
  ],
}

export default {
  name: 'AppBarComponent',

  data() {
    return {
      drawer: false,
      green: '#C1E328',
      user: null as User | null,
      logoSrc: new URL('@/assets/LogomaptreeHeaderpng.png', import.meta.url).href,
    }
  },

  computed: {
    store() {
      return useAppStore()
    },

    currentMenu(): MenuItem[] {
      const role = this.store.user?.role
      return (MENUS[role as string] ?? MENUS.GUEST) as MenuItem[]
    },

    isMobile(): boolean {
      return this.store.isMobile
    },
  },

  watch: {
    '$route.path'() {
      this.drawer = false
    },
  },

  mounted() {
    this.checkMobile()
    window.addEventListener('resize', this.checkMobile)
    this.getUser()
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.checkMobile)
  },

  methods: {
    isActive(path: string): boolean {
      return this.$route.path === path
    },

    goToHome(): void {
      const role = this.store.user?.role
      const home = getHomeRouteByRole(this.$router, role)
      if (this.$route.path !== home) this.$router.push(home)
    },

    goToNotification(): void {
      const role = this.store.user?.role
      const notification = getNotificationRoute(this.$router, role)
      if (this.$route.path !== notification) this.$router.push(notification)
    },

    getUser() {
      this.$api
        .get<User>('/users/me/profile')
        .then((response) => {
          if (response.data) this.user = response.data as User
        })
        .catch((error: unknown) => {
          console.error('Error fetching user profile:', error)
        })
    },

    goTo(path: string): void {
      if (path) this.$router.push(path)
      this.drawer = false
    },

    checkMobile(): void {
      this.store.setIsMobile(window.innerWidth < 960)
    },

    logout(): void {
      this.$api.logout()
      this.$router.push('/login')
    },

    onLogoError(): void {
      console.error('Erro ao carregar logo do AppBar')
      // Fallback para um ícone ou texto
      this.logoSrc = ''
    },

    editAccount(): void {
      this.$router.push('/edit-account')
    },
  },
}
</script>

<style scoped>
.appbar-desktop {
  border-bottom: 1px solid #f0f0f0 !important;
}

.logo-container {
  height: 100%;
  display: flex;
  align-items: center;
  align-content: center;
  padding-left: 20px;
  cursor: pointer;
}

.logo-img {
  max-width: 160px;
  max-height: 48px;
  object-fit: contain;
  /* Melhora a vivacidade da logo atual enquanto não trocamos */
  filter: saturate(1.4) brightness(1.1);
  transition: transform 0.2s;
}

.logo-img:hover {
  transform: scale(1.05);
}

.notification-btn {
  background-color: #d9d9d9;
  height: 45px;
  width: 45px;
}

.user-menu-trigger {
  display: flex;
  align-items: center;
  cursor: pointer;
  gap: 10px;
  padding: 5px 10px;
}

.user-avatar {
  background-color: #c1e328;
}

.avatar-img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.user-name {
  font-size: 16px;
  color: black;
}
</style>

