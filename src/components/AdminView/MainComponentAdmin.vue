<script lang="ts">
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app.ts'
import { ref } from 'vue'

export default {
  name: 'MainComponent',
  data() {
    return {
      search: ref(''),
      router: useRouter(),
      store: useAppStore(),
      empresas: [
        {
          nome: 'EcoEnergia Sul',
          gestor: 'Carlos Silva',
          data: '2024-11-08',
          status: 'Ativa',
          cor: '#A4F5A1'
        },
        {
          nome: 'Verde Luz Nordeste',
          gestor: 'Ana Santos',
          data: '2024-11-07',
          status: 'Ativa',
          cor: '#A4F5A1'
        },
        {
          nome: 'PowerTree Centro',
          gestor: 'João Costa',
          data: '2024-11-09',
          status: 'Pendente',
          cor: '#FFFDA1'
        }
      ]
    }
  },
  methods: {
    clearSearch() {
      this.search = ''
    }
  }
}
</script>

<template>
  <v-container style="margin: 30px; padding: 20px;">
    <v-row align="center" justify="space-between">
      <!-- Texto -->
      <v-col cols="12" md="8">
        <div>
          <p style="color: #667085; font-size: 14px; font-weight: bold; margin: 0; margin-bottom: 10px;"
             class="text-medium-emphasis">Meu Painel</p>
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

    <!-- Cards de resumo -->
    <v-row>
      <v-col cols="12" md="7" style="margin: 20px; display: flex; flex-direction: row; gap: 30px;">
        <v-card style="width: 264px; height: 174px; background-color: #CDCDCD; border-radius: 10px; box-shadow: none; border: 1px solid #000000;">
          <v-card-title style="display: flex; justify-content: space-between;">Empresas<v-icon>mdi-domain</v-icon></v-card-title>
          <v-card-text>
            <p style="margin-top: 60px;" class="text-h5">90</p>
            <p style="margin-top: 10px;">+ 3 este mês</p>
          </v-card-text>
        </v-card>

        <v-card style="width: 264px; height: 174px; background-color: #CDCDCD; border-radius: 10px; box-shadow: none; border: 1px solid #000000;">
          <v-card-title style="display: flex; justify-content: space-between;">Gestores<v-icon>mdi-account-group</v-icon></v-card-title>
          <v-card-text>
            <p style="margin-top: 60px;" class="text-h5">90</p>
            <p style="margin-top: 10px;">+ 3 este mês</p>
          </v-card-text>
        </v-card>

        <v-card style="width: 264px; height: 174px; background-color: #CDCDCD; border-radius: 10px; box-shadow: none; border: 1px solid #000000;">
          <v-card-title style="display: flex; justify-content: space-between;">Espécies<v-icon>mdi-sprout</v-icon></v-card-title>
          <v-card-text>
            <p style="margin-top: 60px;" class="text-h5">90</p>
            <p style="margin-top: 10px;">+ 3 este mês</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Segunda linha de cards -->
    <v-row>
      <v-col cols="12" md="6">
        <v-card style="width: 573px; height: 370px; background-color: #CDCDCD; border-radius: 10px; box-shadow: none; border: 1px solid #000000; padding: 20px;">
          <h5 style="font-weight: 600; font-size: 16px; margin-bottom: 20px;">Distribuição de Planos</h5>
          <v-card-text class="card-center">Nenhuma ação realizada</v-card-text>
        </v-card>
      </v-col>

      <!-- Novo card: Empresas Cadastradas Recentemente -->
      <v-col cols="12" md="6">
        <v-card style="width: 573px; min-height: 370px; background-color: #FFFFFF; border-radius: 10px; box-shadow: none; border: 1px solid #000000; padding: 20px;">
          <h5 style="font-weight: 600; font-size: 16px; margin-bottom: 20px;">Empresas Cadastradas Recentemente</h5>

          <v-row style="font-weight: bold; font-size: 14px; color: #555;">
            <v-col cols="4">Empresa</v-col>
            <v-col cols="4">Gestor</v-col>
            <v-col cols="4">Status</v-col>
          </v-row>



          <div v-for="(empresa, index) in empresas" :key="index" style="margin-top: 15px;">
            <v-row align="center">
              <v-col cols="4">
                <div>{{ empresa.nome }}</div>
                <div style="font-size: 12px; color: #777;">{{ empresa.data }}</div>
              </v-col>
              <v-col cols="4">{{ empresa.gestor }}</v-col>
              <v-col cols="4">
                <span
                  :style="{
                    backgroundColor: empresa.cor,
                    borderRadius: '12px',
                    padding: '4px 12px',
                    fontSize: '13px'
                  }"
                >
                  {{ empresa.status }}
                </span>
              </v-col>
            </v-row>

            <v-divider v-if="index < empresas.length - 1" style="margin-top: 5px;"></v-divider>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.card-center {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
}
</style>
