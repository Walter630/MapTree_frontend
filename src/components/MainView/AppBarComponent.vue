<template>
  <v-app-bar color="white" flat v-if="!isMobile" style="margin: 1px 0 1px 0">
    <img
      src="@/assets/LogomaptreeHeaderpng.png"
      alt="Logo"
      style="width: 150px; height: 52px; margin-left: 25px; margin-top: 10px"
      @click="goTo('/')"
    />

    <v-spacer />

    <v-toolbar-items class="d-flex justify-center" style="margin-top: 10px">
      <v-btn
        v-for="item in currentMenu"
        :key="item.to"
        variant="text"
        style="margin-right: 10px"
        :color="isActive(item.to) ? 'black' : 'grey-darken-2'"
        @click="goTo(item.to)"
      >
        <v-icon size="24" style="margin-right: 5px" :color="isActive(item.to) ? green : 'black'">
          {{ item.icon }}
        </v-icon>

        {{ item.title }}
      </v-btn>
    </v-toolbar-items>

    <v-spacer />
    <v-btn
      icon
      :color="isActive('/gestor/notifications') ? green : 'black'"
      style="background-color: #d9d9d9; margin-right: 20px; height: 45px; width: 45px"
      @click="goTo('/gestor/notifications')"
    >
      <v-icon>mdi-bell-outline</v-icon>
    </v-btn>

    <v-menu min-width="200px">
      <template v-slot:activator="{ props }">
        <div
          v-bind="props"
          style="display: flex; align-items: center; cursor: pointer; gap: 10px; padding: 5px 10px"
        >
          <v-avatar
            size="40"
            style="background-color: #c1e328; align-items: center; justify-content: center"
          >
            <img
              src="@/assets/Logomaptreeverde.png"
              alt="Perfil"
              style="
                width: 40px;
                height: 40px;
                border-radius: 50%;
                align-items: center;
                justify-content: center;
              "
            />
          </v-avatar>

          <span style="font-size: 16px; color: black">
            {{ user?.name || 'Usuário' }}
          </span>

          <v-icon size="20">mdi-menu-down</v-icon>
        </div>
      </template>
      <v-card>
        <v-card-text>

          <div class="mx-auto text-center">
            <v-avatar
              size="40"
              style="background-color: #c1e328; align-items: center; justify-content: center"
            >
              <img
                src="@/assets/Logomaptreeverde.png"
                alt="Perfil"
                style="
                  width: 40px;
                  height: 40px;
                  border-radius: 50%;
                  align-items: center;
                  justify-content: center;
                "
              />
            </v-avatar>
            <h3>{{ user?.name }}</h3>
            <p class="text-caption mt-1">
              {{ user?.email }}
            </p>
            <v-divider class="my-3"></v-divider>
            <v-btn variant="text" rounded @click="editAccount"> Edit Account </v-btn>
            <v-divider class="my-3"></v-divider>
            <v-btn variant="text" rounded @click="logout"> Disconnect </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-menu>
  </v-app-bar>

  <v-app-bar flat v-else>
    <v-btn icon @click="drawer = !drawer">
      <v-icon>mdi-menu</v-icon>
    </v-btn>

    <v-navigation-drawer v-model="drawer" temporary>
      <v-list>
        <v-list-item v-for="item in currentMenu" :key="item.to" @click="goTo(item.to)">
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
import { useAppStore } from '@/stores/app'

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

export default {
  name: 'AppBarComponent',

  // Configuração da Options API
  data() {
    return {
      drawer: false,
      green: '#C1E328',
      user: null as User | null,

      // Definição dos menus
      menus: {
        ADMIN: [
          { title: 'Painel', icon: 'mdi-view-dashboard', to: '/admin' },
          { title: 'Empresas', icon: 'mdi-domain', to: '/admin/companies' },
          { title: 'Gestores', icon: 'mdi-account-group', to: '/admin/managers' },
        ] as MenuItem[], // Tipagem para o array
        MANAGER: [
          { title: 'Painel', icon: 'mdi-view-dashboard', to: '/manager' },
          { title: 'Funcionários', icon: 'mdi-account-group', to: '/manager/employees' },
          { title: 'Relatórios', icon: 'mdi-file-chart', to: '/manager/reports' },
        ] as MenuItem[],
        USER: [
          { title: 'Painel', icon: 'mdi-view-dashboard', to: '/user' },
          { title: 'Podas', icon: 'mdi-content-cut' },
          { title: 'Relatórios', icon: 'mdi-file-chart' },
          { title: 'Mapa', icon: 'mdi-map', to: '/user/mapUser' },
        ] as MenuItem[],
        USER_CREDENCIADO: [
          { title: 'Painel', icon: 'mdi-view-dashboard', to: '/credenciado' },
          { title: 'Rotas', icon: 'mdi-map', to: '/credenciado/rotas' },
          { title: 'Podas', icon: 'mdi-leaf', to: '/credenciado/podas' },
        ] as MenuItem[],
        GUEST: [
          { title: 'Login', icon: 'mdi-login', to: '/login' },
          { title: 'Criar Conta', icon: 'mdi-account-plus', to: '/register' },
        ] as MenuItem[],
      },
    }
  },

  computed: {
    store() {
      return useAppStore()
    },

    currentMenu(): MenuItem[] {
      const role = this.store.user?.role

      console.log(role)
      return this.menus[role as keyof typeof this.menus] ?? this.menus.ADMIN
    },

    // Verifica se o componente está em modo mobile (baseado na store)
    isMobile(): boolean {
      return this.store.isMobile
    },
  },

  watch: {
    // Observa a mudança de rota para fechar o drawer no mobile
    '$route.path'() {
      this.drawer = false
    },
  },

  methods: {
    isActive(path: string): boolean {
      return this.$route.path === path
    },

    getUser() {
      this.$api
        .get('/users/me/profile')
        .then((response) => {
          if (response.data) {
            this.user = response.data as User
          }
        })
        .catch((error) => {
          console.error('Error fetching user profile:', error)
        })
    },

    // Navega para a rota e fecha o drawer (se aberto)
    goTo(path: string): void {
      this.$router.push(path)
      this.drawer = false
    },

    // Verifica o tamanho da tela para definir se é mobile
    checkMobile(): void {
      this.store.setIsMobile(window.innerWidth < 960)
    },

    // Lida com o logout
    logout(): void {
      // Acessa o plugin $api injetado globalmente
      this.$api.logout()
      this.$router.push('/login')
    },

    // Navega para a edição da conta
    editAccount(): void {
      this.$router.push('/edit-account')
    },
  },

  // Lifecycle hook para configurar o listener de redimensionamento
  mounted() {
    this.checkMobile()
    window.addEventListener('resize', this.checkMobile)
    this.getUser()
  },

  // Lifecycle hook para limpar o listener de redimensionamento
  beforeUnmount() {
    window.removeEventListener('resize', this.checkMobile)
  },
}
</script>
