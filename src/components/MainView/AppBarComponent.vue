<template>
  <!-- ===== Desktop AppBar ===== -->
  <v-app-bar v-if="!isMobile" color="white" flat height="68" class="appbar-desktop">
    <div class="appbar-content">
      <button type="button" class="logo-container" aria-label="Ir para o painel inicial" @click="goToHome()">
        <img :src="logoSrc" alt="Logo MapTree" class="logo-img" @error="onLogoError" />
      </button>

      <nav class="desktop-nav" aria-label="Navegação principal">
        <v-tooltip v-for="item in currentMenu" :key="item.to" location="bottom">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              variant="text"
              class="nav-item text-none"
              :class="{ 'nav-item--active': isActive(item.to) }"
              :color="isActive(item.to) ? 'green-darken-2' : 'grey-darken-2'"
              :aria-current="isActive(item.to) ? 'page' : undefined"
              @click="goTo(item.to)"
            >
              <v-icon size="21" class="nav-icon-3d" :color="isActive(item.to) ? green : 'grey-darken-2'">{{ item.icon }}</v-icon>
              <span class="nav-label">{{ item.title }}</span>
            </v-btn>
          </template>
          <span>{{ item.title }}</span>
        </v-tooltip>
      </nav>

      <div class="appbar-actions">
        <v-tooltip text="Notificações" location="bottom">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              icon
              variant="text"
              :color="isNotificationActive ? green : 'grey-darken-2'"
              aria-label="Abrir notificações"
              @click="goToNotification()"
            >
              <v-icon class="nav-icon-3d">mdi-bell-outline</v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <v-menu min-width="230px">
          <template #activator="{ props }">
            <v-btn v-bind="props" variant="text" class="user-menu-trigger text-none" aria-label="Abrir menu do usuário">
              <v-avatar size="36" class="user-avatar">
                <img src="@/assets/Logomaptreeverde.png" alt="" class="avatar-img" />
              </v-avatar>
              <span class="user-name">{{ user?.name || 'Usuário' }}</span>
              <v-icon size="18">mdi-chevron-down</v-icon>
            </v-btn>
          </template>

          <v-card>
            <v-card-text class="text-center pa-4">
              <v-avatar size="44" class="user-avatar mb-2">
                <img src="@/assets/Logomaptreeverde.png" alt="" class="avatar-img" />
              </v-avatar>
              <p class="text-subtitle-2 font-weight-bold mb-0">{{ user?.name || 'Usuário' }}</p>
              <p class="text-caption mt-1 mb-3">{{ user?.email }}</p>
              <v-divider class="mb-2" />
              <v-btn block variant="text" prepend-icon="mdi-account-edit" class="text-none" @click="editAccount">Editar perfil</v-btn>
              <v-btn block variant="text" color="error" prepend-icon="mdi-logout" class="text-none" @click="logout">Sair da conta</v-btn>
            </v-card-text>
          </v-card>
        </v-menu>
      </div>
    </div>
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
    { title: 'Cadastrar árvore', icon: 'mdi-tree', to: '/admin/trees/new' },
    { title: 'Mapa', icon: 'mdi-map', to: '/admin/map' },
  ],
  MANAGER: [
    { title: 'Painel', icon: 'mdi-view-dashboard', to: '/manager' },
    { title: 'Funcionários', icon: 'mdi-account-group', to: '/manager/employees' },
    { title: 'Cadastrar árvore', icon: 'mdi-tree', to: '/manager/trees/new' },
    { title: 'Rotas diárias', icon: 'mdi-map-marker-path', to: '/manager/routes/daily' },
    { title: 'Relatórios', icon: 'mdi-file-chart', to: '/manager/reports' },
    { title: 'Mapa', icon: 'mdi-map', to: '/manager/map' },
  ],
  USER: [
    { title: 'Painel', icon: 'mdi-view-dashboard', to: '/user' },
    { title: 'Podas', icon: 'mdi-content-cut', to: '/user/podas' },
    { title: 'Rota do dia', icon: 'mdi-map-marker-path', to: '/user/routes/daily' },
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

    isNotificationActive(): boolean {
      return this.$route.path.endsWith('/notifications')
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
      const homePaths = ['/admin', '/manager', '/user']
      if (homePaths.includes(path)) return this.$route.path === path
      return this.$route.path === path || this.$route.path.startsWith(`${path}/`)
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
      this.store.setIsMobile(window.innerWidth < 1040)
    },

    async logout(): Promise<void> {
      try {
        await this.$api.logout()
      } finally {
        this.store.logout()
        await this.$router.push('/login')
      }
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
  border-bottom: 1px solid #e8edda !important;
  box-shadow: 0 2px 14px rgba(31, 55, 23, 0.06) !important;
  z-index: 1200;
}

.appbar-content {
  width: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 22px;
}

.desktop-nav {
  min-width: 0;
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  overflow-x: auto;
  scrollbar-width: none;
}
.desktop-nav::-webkit-scrollbar { display: none; }
.nav-item {
  min-width: 0;
  border-radius: 10px;
  padding: 0 10px;
  white-space: nowrap;
}
.nav-item--active {
  background: #f2f8dc;
  font-weight: 700;
}
.nav-icon-3d {
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.16));
  transition: filter 0.2s ease, transform 0.2s ease;
}
.nav-icon-3d:hover { filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.22)); transform: translateY(-1px); }
.appbar-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 0 0 auto;
}
.logo-container {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  width: 146px;
  height: 52px;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
}
.logo-img { max-width: 146px; max-height: 46px; object-fit: contain; filter: saturate(1.2) brightness(1.03); transition: transform 0.2s; }
.logo-img:hover { transform: scale(1.03); }
.user-menu-trigger { display: flex; align-items: center; gap: 7px; padding: 4px 8px; border-radius: 10px; }
.user-menu-trigger:hover { background: #f6f8f0; }
.user-avatar { background-color: #c1e328; }
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.user-name { max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.88rem; color: #1f2933; }

.mobile-drawer { z-index: 1400 !important; }
.appbar-mobile { z-index: 1200 !important; border-bottom: 1px solid #e8edda !important; }
.logo-mobile { display: flex; align-items: center; cursor: pointer; }

@media (max-width: 1280px) {
  .appbar-content { padding: 0 14px; gap: 8px; }
  .desktop-nav { justify-content: flex-start; }
  .nav-label { display: none; }
  .nav-item { padding: 0 9px; }
  .logo-container { width: 125px; }
  .logo-img { max-width: 125px; }
  .user-name { max-width: 100px; }
}

@media (max-width: 420px) {
  .appbar-mobile :deep(.v-toolbar__content) { padding: 0 8px; }
  .logo-mobile img { max-width: 140px; height: 30px !important; object-fit: contain; }
}
</style>

