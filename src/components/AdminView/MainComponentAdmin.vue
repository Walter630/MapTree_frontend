<script lang="ts">
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app.ts'
import { ref } from 'vue'

export default {
  name: 'MainComponent',
  setup() {
    const search = ref('')
    const router = useRouter()
    const store = useAppStore()


    const empresas = ref([
      {
        nome: 'EcoEnergia Sul',
        gestor: 'Carlos Silva',
        data: '2024-11-08',
        status: 'Ativa',
        cor: '#D5F8D1'
      },
      {
        nome: 'Verde Luz Nordeste',
        gestor: 'Ana Santos',
        data: '2024-11-07',
        status: 'Ativa',
        cor: '#D5F8D1'
      },
      {
        nome: 'PowerTree Centro',
        gestor: 'João Costa',
        data: '2024-11-09',
        status: 'Pendente',
        cor: '#FFF8B3'
      }
    ])

    const clearSearch = () => search.value = ''

    return { search, router, store, empresas, clearSearch }
  }
}
</script>
<template>
  <v-container style="margin-top: 40px;">
    <!-- Cabeçalho -->
    <v-row align="center" justify="space-between" class="mb-6">
      <v-col cols="12" md="7">
        <div class="d-flex align-center mb-6">
          <span class="text-caption text-grey-darken-1">Meu Painel</span>


        </div>
        <p class="title-text">Olá, Administrador!</p>
        <p class="subtitle-text">Aqui está o resumo de suas operações.</p>
      </v-col>

      <v-col cols="12" md="4" class="d-flex justify-end">
        <v-text-field
          v-model="search"
          placeholder="Buscar..."
          hide-details
          density="comfortable"
          variant="outlined"
          style="max-width: 350px;"
          prepend-inner-icon="mdi-magnify"
          clearable
          @click:append="clearSearch"
        />

      </v-col>
    </v-row>

    <!-- Cards de Resumo -->
    <v-row style="margin-top: 25px;" class="d-flex" justify="start" no-gutters>
      <v-col cols="12" md="3" class="mr-4">
        <v-card class="cardResumo">
          <div class="cardHeader">
            <span>Empresas</span>
            <v-icon>mdi-domain</v-icon>
          </div>
          <p class="cardNumero">90</p>
          <p class="cardInfo">+3 este mês</p>
        </v-card>
      </v-col>

      <v-col cols="12" md="3" class="mr-4">
        <v-card class="cardResumo">
          <div class="cardHeader">
            <span>Gestores</span>
            <v-icon>mdi-account-group</v-icon>
          </div>
          <p class="cardNumero">240</p>
          <p class="cardInfo">+7 este mês</p>
        </v-card>
      </v-col>

      <v-col cols="12" md="3">
        <v-card class="cardResumo">
          <div class="cardHeader">
            <span>Espécies</span>
            <v-icon>mdi-sprout</v-icon>
          </div>
          <p class="cardNumero">156</p>
          <p class="cardInfo">Catalogadas</p>
        </v-card>
      </v-col>
    </v-row>

    <!-- Segunda Linha -->
    <v-row style="margin-top: 35px;">
      <!-- Distribuição de Planos -->
      <v-col cols="12" md="6">
        <v-card class="cardBox">
          <h4 class="titleBox">Distribuição de Planos</h4>

          <div class="centerBox">
            Nenhuma Ação Realizada
          </div>
        </v-card>
      </v-col>

      <!-- Empresas Cadastradas -->
      <v-col cols="12" md="6">
        <v-card class="cardBox">
          <h4 class="titleBox">Empresas Cadastradas Recentemente</h4>

          <v-row class="headerTable">
            <v-col cols="4">Empresa</v-col>
            <v-col cols="4">Gestor</v-col>
            <v-col cols="4">Status</v-col>
          </v-row>

          <div
            v-for="(empresa, i) in empresas"
            :key="i"
            class="linhaEmpresa"
          >
            <v-row align="center">
              <v-col cols="4" >
                <div>{{ empresa.nome }}</div>
                <div class="dataEmpresa">{{ empresa.data }}</div>
              </v-col>

              <v-col cols="4">{{ empresa.gestor }}</v-col>

              <v-col cols="4">
                <span
                  class="badgeStatus"
                  :style="{ backgroundColor: empresa.cor }"
                >
                  {{ empresa.status }}
                </span>
              </v-col>
            </v-row>

            <v-divider v-if="i < empresas.length - 1"></v-divider>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.cardResumo {
  background: #f4f4f4;
  border: 1px solid #E5E5E5;
  height: 150px;
  border-radius: 8px;
  padding: 15px;
  box-shadow: none;
}

.cardHeader {
display: flex;
justify-content: space-between;
font-weight: 600;
}

.cardNumero {
font-size: 26px;
margin-top: 25px;
font-weight: bold;
}

.cardInfo {
margin-top: 5px;
font-size: 13px;
color: #777;
}

.cardBox {
background: #f4f4f4;
border: 1px solid #E5E5E5;
border-radius: 8px;
padding: 20px;
min-height: 350px;
}

.titleBox {
font-size: 16px;
font-weight: 600;
margin-bottom: 20px;
}

.centerBox {
display: flex;
align-items: center;
justify-content: center;
height: 220px;
color: #555;
}

.headerTable {
font-weight: bold;
padding-bottom: 5px;
color: #444;
}

.dataEmpresa {
font-size: 12px;
color: #999;
}

.badgeStatus {
padding: 5px 14px;
border-radius: 12px;
font-size: 13px;
display: inline-block;
}
.linhaEmpresa {
padding: 15px 0 2px;
}
</style>
