<template>
  <v-app-bar color="white" flat >
    <img src="@/assets/LogomaptreeHeaderpng.png" alt="Logo" style="width: 150px; height: 52px; margin-left: 25px; margin-top: 10px;">
    <v-spacer></v-spacer>
    <v-toolbar-items class="d-flex justify-center " style="margin-top: 10px;">
      <!-- Painel -->
      <v-btn
        variant="text"
        style="margin-right: 10px;"
        @click="goTo('/')"
      >
        <v-icon :color="isActive('/') ? green : 'black'">
          mdi-view-dashboard
        </v-icon>
        Painel
      </v-btn>

      <!-- Empresas -->
      <v-btn
        variant="text"
        style="margin-right: 10px;"
        :color="isActive('/empresas') ? 'black' : 'grey-darken-2'"
        @click="goTo('/empresas')"
      >
        <v-icon :color="isActive('/empresas') ? green : 'black'">
          mdi-domain
        </v-icon>
        Empresas
      </v-btn>

      <!-- Gestores -->
      <v-btn
        variant="text"
        style="margin-right: 10px;"
        :color="isActive('/gestores') ? 'black' : 'grey-darken-2'"
        @click="goTo('/gestores')"
      >
        <v-icon :color="isActive('/gestores') ? green : 'black'">
          mdi-account-group
        </v-icon>
        Gestores
      </v-btn>
    </v-toolbar-items>

    <v-spacer />

    <!-- Perfil -->
    <v-btn style="margin-right: 10px; color: black; border-radius: 50%; margin-top: 10px;">
      <img src="@/assets/Logomaptreeverde.png" alt="Perfil" style="width: 40px; height: 40px; border-radius: 50%;">
    </v-btn>

  </v-app-bar>

  <v-app-bar  flat v-if="isMobile">
    <v-btn icon @click="drawer = !drawer">
      <v-icon>mdi-menu</v-icon>
      <template v-slot:activator="{ props }">
        <v-btn v-bind="props">Open</v-btn>
      </template>

    </v-btn>
    <v-navigation-drawer v-model="drawer" temporary>
      <v-list>
        <v-list-item
          v-for="item in items"
          :key="item.title"
          :to="item.to"
          link
        >
          <v-list-item-icon>
            <v-icon :icon="item.icon"></v-icon>
          </v-list-item-icon>
          <v-list-item-title>{{ item.title }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
  </v-app-bar>
</template>

<script  lang="ts">
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app.ts'
import { ref } from 'vue'

export default {
  name: 'AppBarComponent',
  data() {
    return {
      drawer: ref(false),
      items: [
        { title: 'Painel', icon: 'mdi-view-dashboard', to: '/' },
        { title: 'Empresas', icon: 'mdi-domain', to: '/empresas' },
        { title: 'Gestores', icon: 'mdi-account-group', to: '/gestores' },
      ],
      green: '#C1E328',
      roles: [
        'admin',
        'manager',
        'user',
      ]
    }
  },
  computed: {
    isMobile() {
      return window.innerWidth < 768
    },
    isRoles() {
      const store = useAppStore()
      const userRole = store.userRole
      return this.roles.includes(userRole)
    },

  },
  methods: {
    goTo(path) {
      this.$router.push(path)
    },
    isActive(path) {
      return this.$route.path === path
    },

  },
  watch: {
    isMobile() {
      this.drawer = false
    },
    isRoles() {
      this.roles = [
        'admin',
        'manager',
        'user',
      ]
    }
  },

}
</script>
