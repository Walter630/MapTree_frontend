<script lang="ts">
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app.ts'
import { ref } from 'vue'
export default {
  name: 'MainComponent',
  data () {
    return {
      search: ref(''),
      router: useRouter(),
      store: useAppStore(),
    }
  },
  methods: {
    clearSearch () {
      this.search = ''
    },
  },
}
</script>

<template>
  <v-container style="margin: 30px; padding: 20px;">
    <v-row align="center" justify="space-between">
      <!-- Texto -->
      <v-col cols="12" md="8">
        <div>
          <p style="color: #667085; font-size: 24px; font-weight: bold; margin: 0;">Meu Painel</p>
          <p style="margin: 0;">Olá, administrador, aqui está o resumo de suas operações.</p>
        </div>
      </v-col>

      <!-- Barra de pesquisa -->
      <v-col cols="12" md="4" class="d-flex justify-end">
        <v-text-field
          placeholder="Buscar"
          hide-details
          density="compact"
          variant="outlined"
          style="width: 473px; height: 56px; align-items: center;"
          prepend-inner-icon="mdi-magnify"
        >
          <template #append-inner>
            <v-icon @click="clearSearch">mdi-close-circle</v-icon>
            <v-btn style="background-color: black; color: white;">Buscar</v-btn>
          </template>
        </v-text-field>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12" md="10" style="margin: 20px; display: flex; flex-direction: row; justify-content: space-between;  ">
        <v-card style="width: 264px; margin: 0 auto; height: 174px;">
          <v-card-title style="display: flex; justify-content: space-between; " >Empresas<v-icon>mdi-domain</v-icon></v-card-title>
          <v-card-text style="display: flex; flex-direction: column; justify-content: space-between; ">
            <p style="margin-top: 60px; height: 20px; width: 41px; text-decoration-color: black" class="text-h5">90</p>
            <p style="margin-top: 10px;">+ 3 este mes</p>
          </v-card-text>


        </v-card>
        <v-card  style="width: 264px; margin: 0 auto; height: 174px;">
          <v-card-title style="display: flex; justify-content: space-between">Gestores<v-icon>mdi-account-group</v-icon></v-card-title>
          <v-card-text>
            <p style="margin-top: 60px; height: 20px; width: 41px; text-decoration-color: black" class="text-h5">90</p>
            <p style="margin-top: 10px;">+ 3 este mes</p>
          </v-card-text>
        </v-card>

        <v-card style="width: 264px; margin: 0 auto; height: 174px;">
          <v-card-title style="display: flex; justify-content: space-between">Especies <v-icon>mdi-sprout</v-icon></v-card-title>
          <v-card-text>
            <p style="margin-top: 60px; height: 20px; width: 41px; text-decoration-color: black" class="text-h5">90</p>
            <p style="margin-top: 10px;">+ 3 este mes</p>
          </v-card-text>
        </v-card>

      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
</style>
