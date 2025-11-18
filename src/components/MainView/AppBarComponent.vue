<template>
  <!-- DESKTOP -->
  <v-app-bar color="white" flat v-if="!isMobile">

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
        <v-icon size="24" :color="isActive(item.to) ? green : 'black'">
          {{ item.icon }}
        </v-icon>

        {{ item.title }}
      </v-btn>
    </v-toolbar-items>

    <v-spacer />

    <!-- Perfil -->
    <v-btn style="margin-right: 10px; color: black; margin-top: 10px;">
      <img
        src="@/assets/Logomaptreeverde.png"
        alt="Perfil"
        style="width: 40px; height: 40px; border-radius: 50%;"
      />
    </v-btn>

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

export default {
  name: 'AppBarComponent',
  setup() {
    const route = useRoute()
    const router = useRouter()

    const drawer = ref(false)
    const isMobile = ref(false)
    const green = '#C1E328'

    // 🔥 MENUS BASEADOS NAS SUAS ROTAS
    const menus = {
      admin: [
        { title: 'Painel', icon: 'mdi-view-dashboard', to: '/admin' },
        { title: 'Empresas', icon: 'mdi-domain', to: '/admin/empresas' },
        { title: 'Gestores', icon: 'mdi-account-group', to: '/admin/gestores' },
      ],

      gestor: [
        { title: 'Painel', icon: 'mdi-view-dashboard', to: '/gestor' },
        { title: 'Funcionários', icon: 'mdi-account-group', to: '/gestor/funcionarios' },
        { title: 'Relatórios', icon: 'mdi-file-chart', to: '/gestor/relatorios' },
        { title: 'Podas', icon: 'mdi-leaf'}
      ],

      user: [
        { title: 'Painel', icon: 'mdi-view-dashboard', to: '/' },
        { title: 'Podas', icon: 'mdi-content-cut', to: '/podas' },
        { title: 'Relatórios', icon: 'mdi-file-chart', to: '/relatorios' }
      ],

      guest: [
        { title: 'Login', icon: 'mdi-login', to: '/login' },
        { title: 'Criar Conta', icon: 'mdi-account-plus', to: '/cadastro' }
      ]
    }

    // 🔥 DETECTAR MENU APENAS PELA ROTA → SEM ROLE
    const currentMenu = computed(() => {
      const path = route.path

      if (path.startsWith('/admin')) return menus.admin
      if (path.startsWith('/gestor')) return menus.gestor

      // Usuário comum
      if (path === '/' || path.startsWith('/podas') || path.startsWith('/relatorios')) {
        return menus.user
      }

      // Visitante
      if (
        path.startsWith('/login') ||
        path.startsWith('/cadastro') ||
        path.startsWith('/recovery')
      ) {
        return menus.guest
      }

      return menus.guest
    })

    const isActive = (path: string) => route.path === path

    const goTo = (path: string) => {
      router.push(path)
      drawer.value = false
    }

    const checkMobile = () => {
      isMobile.value = window.innerWidth < 960
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
