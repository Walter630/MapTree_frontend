<template>
  <v-app-bar color="white" flat >
    <img src="@/assets/LogomaptreeHeaderpng.png" alt="Logo" style="width: 150px; height: 52px; margin-left: 25px; margin-top: 10px;">
    <v-spacer></v-spacer>
    <v-toolbar-items class="d-flex justify-center " style="margin-top: 10px;">
      <!-- Painel -->
      <v-btn
        variant="text"
        style="margin-right: 10px;"
        :color="isActive('/') ? 'black' : '#C1E328'"
        @click="goTo('/')"
      >
        <v-icon :color="isActive('/') ? '#C1E328' : 'black'">
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
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router'
import { ref } from 'vue'

const router = useRouter()
const route = useRoute()
const green = ref('#C1E328')

// Função para navegação
function goTo(path) {
  router.push(path)
}

// Verifica se a rota atual é a ativa
function isActive(path) {
  return route.path === path
}
</script>
