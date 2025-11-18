<template>
  <v-container class="pa-6" style="margin-top: 20px;">

    <!-- Cabeçalho -->
    <v-row align="center" justify="space-between" class="mb-8">

      <!-- Título + subtítulo -->
      <v-col cols="12" md="6">
        <p class="text-grey-darken-1" style="font-size: 22px; font-weight: 600; margin: 0;">
          Meu Painel
        </p>
        <p style="margin: 0; font-size: 14px; color: #444;">
          Olá, Gestor Silva, aqui está o resumo de suas operações.
        </p>
      </v-col>

      <!-- Barra de busca -->
      <v-col cols="12" md="6" class="d-flex justify-end">
        <div style="display: flex; width: 100%; max-width: 460px;">
          <v-text-field
            v-model="search"
            placeholder="Buscar"
            hide-details
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-magnify"
            class="mr-1"
          >
            <template #append-inner>
              <v-icon v-if="search" @click="clearSearch" class="mr-1">mdi-close-circle</v-icon>
            </template>
          </v-text-field>

          <v-btn
            style="
              background-color: black;
              color: white;
              height: 56px;
              padding: 0 24px;
              font-size: 14px;
              font-weight: bold;
            "
          >
            Buscar
          </v-btn>
        </div>
      </v-col>

    </v-row>

    <!-- Cards -->
    <v-row class="mt-4" justify="space-between">

      <!-- Card: Árvores cadastradas -->
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4 elevation-0" style="border: 1px solid #e0e0e0; border-radius: 12px;">
          <div class="d-flex justify-space-between align-center mb-2">
            <span style="font-weight: 600;">Árvores Cadastradas</span>
            <v-icon>mdi-tree</v-icon>
          </div>

          <p class="text-h4 font-weight-bold mt-6 mb-1">90</p>
          <p style="color: #777;">+3 este mês</p>
        </v-card>
      </v-col>

      <!-- Card: Podas agendadas -->
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4 elevation-0" style="border: 1px solid #e0e0e0; border-radius: 12px;">
          <div class="d-flex justify-space-between align-center mb-2">
            <span style="font-weight: 600;">Podas Agendadas</span>
            <v-icon>mdi-content-cut</v-icon>
          </div>

          <p class="text-h4 font-weight-bold mt-6 mb-1">240</p>
          <p style="color: #777;">+7 este mês</p>
        </v-card>
      </v-col>

      <!-- Card: Áreas críticas -->
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4 elevation-0" style="border: 1px solid #e0e0e0; border-radius: 12px;">
          <div class="d-flex justify-space-between align-center mb-2">
            <span style="font-weight: 600;">Áreas Críticas</span>
            <v-icon>mdi-alert-circle-outline</v-icon>
          </div>

          <p class="text-h4 font-weight-bold mt-6 mb-1">156</p>
          <p style="color: #777;">3 requerem atenção imediata</p>
        </v-card>
      </v-col>

      <!-- Card: Espécies -->
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4 elevation-0" style="border: 1px solid #e0e0e0; border-radius: 12px;">
          <div class="d-flex justify-space-between align-center mb-2">
            <span style="font-weight: 600;">Espécies</span>
            <v-icon>mdi-sprout</v-icon>
          </div>

          <p class="text-h4 font-weight-bold mt-6 mb-1">156</p>
          <p style="color: #777;">Catalogadas</p>
        </v-card>
      </v-col>

    </v-row>

  </v-container>
</template>

<script lang="ts">
import { ref } from 'vue'
export default {
  name: 'MainComponent',
  data () {
    return {
      search: ref(''),
      isMobile: ref(false),
    }
  },
  methods: {
    clearSearch () {
      this.search = ''
    },
    checkMobile () {
      this.isMobile = window.innerWidth < 960
    },
  },
}
</script>
