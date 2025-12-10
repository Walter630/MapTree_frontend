<template>
  <v-container class="pa-8">
    <v-row align="center" justify="space-between" class="mb-8">
      <v-col cols="12" md="6">
        <p class="text-caption text-grey-darken-1 mb-1">Meu Painel</p>
        <p class="text-h6 font-weight-regular mb-0">
          Olá, {{ user?.name || 'Usuário' }}, Aqui Está o Resumo de Suas Operações.
        </p>
      </v-col>

      <v-col cols="12" md="6" class="d-flex justify-end">
        <div style="width: 400px; max-width: 100%">
          <v-text-field
            v-model="search"
            placeholder="Pesquisar"
            density="comfortable"
            variant="outlined"
            prepend-inner-icon="mdi-magnify"
            hide-details
            class="search-input"
          />
        </div>
        <v-btn color="black" variant="flat" size="large" @click="performSearch"> BUSCAR </v-btn>
      </v-col>
    </v-row>

    <!-- Cards de Resumo -->
    <v-row style="margin-top: 25px" class="d-flex" justify="start">
      <v-col cols="12" md="3">
        <v-card class="cardResumo">
          <div class="cardHeader">
            <span>Árvores</span>
            <v-icon>mdi-domain</v-icon>
          </div>
          <p class="cardNumero">{{ countTrees }}</p>
          <p class="cardInfo">+3 este mês</p>
        </v-card>
      </v-col>

      <v-col cols="12" md="3">
        <v-card class="cardResumo">
          <div class="cardHeader">
            <span>Podas</span>
            <v-icon>mdi-account-group</v-icon>
          </div>
          <p class="cardNumero">{{ countPrunings }}</p>
          <p class="cardInfo">+7 este mês</p>
        </v-card>
      </v-col>

      <v-col cols="12" md="3">
        <v-card class="cardResumo">
          <div class="cardHeader">
            <span>Areas Críticas</span>
            <v-icon>mdi-sprout</v-icon>
          </div>
          <p class="cardNumero">156</p>
          <p class="cardInfo">Catalogadas</p>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card class="cardResumo">
          <div class="cardHeader">
            <span>Espécies</span>
            <v-icon>mdi-sprout</v-icon>
          </div>
          <p class="cardNumero">{{ countSpecies }}</p>
          <p class="cardInfo">Catalogadas</p>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mb-6 mt-10" dense>
      <v-col cols="12" md="5" lg="5">
        <v-card
          class="pa-4"
          flat
          style="border: 1px solid #cdcdcd; background-color: #f6f6f6; border-radius: 12px"
        >
          <p class="text-subtitle-1 font-weight-bold mb-3 d-flex align-center">
            <v-icon class="mr-2">mdi-map-marker-alert-outline</v-icon>
            Região em risco
          </p>

          <PruningMap
            ref="pruningMapRef"
            style="height: 270px; border-radius: 8px; overflow: hidden"
          />
          <v-btn icon @click="goToMap">
            <v-icon>mdi-map</v-icon>
          </v-btn>
        </v-card>
      </v-col>

      <v-col cols="12" md="3" lg="3">
        <v-card
          class="pa-4"
          flat
          style="border: 1px solid #cdcdcd; background-color: white; border-radius: 12px"
        >
          <p class="text-subtitle-1 font-weight-bold mb-3 d-flex align-center">
            <v-icon class="mr-2">mdi-chart-bar</v-icon>
            Podas por mês
          </p>
          <v-skeleton-loader height="270" type="image" class="rounded-lg"></v-skeleton-loader>
        </v-card>
      </v-col>

      <v-col cols="12" md="4" lg="4">
        <v-card
          class="pa-4"
          flat
          style="border: 1px solid #cdcdcd; background-color: white; border-radius: 12px"
        >
          <p class="text-subtitle-1 font-weight-bold mb-3 d-flex align-center">
            <v-icon class="mr-2">mdi-alert-outline</v-icon>
            Árvores em risco
          </p>

          <v-card
            v-for="tree in treesFiltradas"
            :key="tree.id"
            class="pa-3 mb-2 rounded-lg alert-card"
            :style="{
              backgroundColor: tree.status === 'TO_PRUNE' || 'em_progresso' ? '#FBE0E3' : '#FBE0E3',
            }"
            flat
          >
            <p class="text-subtitle-2 font-weight-medium mb-1">
              {{ tree.status }}
            </p>
            <p class="text-subtitle-2 font-weight-medium mb-1"></p>

            <p class="text-caption text-grey-darken-1 mb-1">
              {{ tree.lat }}
            </p>
            <p class="text-caption text-grey-darken-1 mb-1">
              {{ tree.lng }}
            </p>

            <p class="text-caption font-weight-medium" style="color: #c80c34">Poda urgente</p>
          </v-card>
        </v-card>
      </v-col>
    </v-row>

    <v-row dense>
      <v-col cols="12" md="6">
        <v-card
          flat
          class="pa-4"
          style="border: 1px solid #cdcdcd; background-color: #f6f6f6; border-radius: 12px"
        >
          <p class="text-subtitle-1 font-weight-bold mb-3 d-flex align-center">
            <v-icon class="mr-2">mdi-leaf-maple</v-icon>
            Espécies por localidade
          </p>

<!--          <PruningMap
            ref="pruningMapRef"
            style="height: 270px; border-radius: 8px; overflow: hidden"
          />-->
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card
          class="pa-4"
          style="
            border: 1px solid #cdcdcd;
            background-color: #f6f6f6;
            border-radius: 12px;
            box-shadow: none;
          "
        >
          <p class="text-subtitle-1 font-weight-bold mb-4">Últimos Relatórios de Poda</p>

          <v-data-table
            :headers="reportHeaders"
            hide-default-footer
            hide-default-header
            class="report-table"
          >
            <thead>
              <tr>
                <th class="text-left text-caption text-grey-darken-1 font-weight-medium py-3">
                  Localização
                </th>
                <th class="text-left text-caption text-grey-darken-1 font-weight-medium py-3">
                  Status
                </th>
                <th class="text-left text-caption text-grey-darken-1 font-weight-medium py-3">
                  Árvore
                </th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="report in species" :key="report.id">
                <td>{{ report.scientificName }}</td>
                <td>{{ report.family }}</td>
                <td>{{ report.trees }}</td>
              </tr>
            </tbody>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
// O import do mapa continua aqui
import PruningMap from '@/components/functions/MapsView/PruningMap.vue'
import DonutChart from '@/components/functions/GraficosView/DonutChart.vue'
import { useAuth } from '@/hooks/useAuth'

export interface Tree {
  id: string
  age: Date
  lat: number
  lng: number
  status: 'TO_PRUNE' | 'UNDER_OBSERVATION' | 'NORMAL' | 'PRUNED'
}

interface User {
  id: string | number
  name: string
  email?: string
  password?: string
  role?: string
}

interface ReportItem {
  localizacao: string
  status: 'Pendente' | 'Em progresso' | 'Concluída'
  acao: string
}

interface Pruning {
  idTree: string
  tree: Tree
  idUser: string
  user: User
  date: Date
  observations: string
  type: 'LIGHT' | 'MODERATE' | 'HEAVY'
}

interface ReportHeader {
  title: string
  key: string
}

interface Species {
  id: string
  commonName: string
  scientificName: string
  family: string
  description: string
  trees: Tree[]
}
export default defineComponent({
  name: 'HomeGestorView',

  // 1. Registro do componente importado
  components: {
    DonutChart,
    PruningMap,
  },

  // 2. Transição do setup() para data()
  data() {
    return {
      search: '' as string,
      isLoading: false as boolean,
      mapExpanded: false as boolean,
      // single logged user (null while loading/not authenticated)
      user: null as User | null,
      trees: null as Tree[] | null,
      species: null as Species[] | null,
      countTrees: 0 as number,
      treesFiltradas: [] as Tree[],
      prunings: [] as Pruning[],
      countPrunings: 0 as number,
      countSpecies: 0 as number,

      // Cabeçalhos dos Relatórios (tipagem ReportHeader[])
      reportHeaders: [
        { title: 'Localização', key: 'localizacao' },
        { title: 'Status', key: 'status' },
        { title: 'Árvore', key: 'acao' },
      ] as ReportHeader[],
    }
  },

  // 3. Transição das funções para methods
  methods: {
    performSearch() {
      // **TODO:** Implementar a lógica de filtragem/busca de dados no backend
      console.log('Pesquisando:', this.search)
    },

    goToMap() {
      this.$router.push('/user/mapUser')
    },

    getSpecies() {
      this.$api
        .get('/species')
        .then((response) => {
          if (response.data) {
            this.species = response.data as Species[]
            this.countSpecies = this.species.length
          }
        })
        .catch((error) => {
          console.error('Erro ao buscar espécies:', error)
        })
    },

    getPrunings() {
      this.$api
        .get('/pruning')
        .then((response) => {
          if (response.data) {
            this.prunings = response.data as Pruning[]
            this.countPrunings = this.prunings.length
          }
        })
        .catch((error) => {
          console.error('Erro ao buscar pruning:', error)
        })
    },

    getTrees() {
      this.$api
        .get('/trees')
        .then((response) => {
          if (response.data) {
            this.trees = response.data as Tree[]
            this.countTrees = this.trees.length
            this.getSpecies()

            // 🚨 FILTRAR APENAS AS ÁRVORES PARA PODA
            this.treesFiltradas = this.trees.filter((tree) => {
              return tree.status === 'TO_PRUNE'
            })
          }
        })
        .catch((error) => {
          console.error('Erro ao buscar árvores:', error)
        })
    },

    getUser() {
      // Use the auth composable to get the current user. This ensures the
      // same auth logic (token refresh, etc.) is used across the app.
      const auth = useAuth()
      auth
        .getCurrentUser()
        .then((u) => {
          if (u) {
            this.user = u as User
          }
        })
        .catch((error) => {
          console.error('Erro ao buscar usuário:', error)
        })
    },

    getStatusColor(status: ReportItem['status']): string {
      switch (status) {
        case 'Pendente':
          return '#AFCDFF' // Azul claro
        case 'Em progresso':
          return '#DCDCDC' // Cinza claro
        case 'Concluída':
          return '#B3E8A3' // Verde claro
        default:
          return '#FFFFFF'
      }
    },
  },

  // 4. Se houver lógica de inicialização, usar mounted()
  mounted() {
    // Preencher usuário logado ao montar
    this.getUser()
    this.getTrees()
    this.getSpecies()
    this.getPrunings()
  },
})
</script>

<style scoped>
.cardResumo {
  background: #f6f6f6;
  border: 1px solid #cdcdcd;
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

.alert-card {
  border: 1px solid #cdcdcd;
  box-shadow: none;
}

.report-table {
  background-color: #f6f6f6 !important;
}

.report-table :deep(td),
.report-table :deep(th) {
  border: none !important;
  padding-left: 0 !important;
  padding-right: 16px !important;
}

.report-table :deep(tr) {
  border-bottom: 1px solid #e0e0e0 !important;
}

.report-table :deep(tr:last-child) {
  border-bottom: none !important;
}

.report-row {
  padding-top: 8px;
  padding-bottom: 8px;
}

.search-button {
  background-color: black !important;
  color: white !important;
  height: 40px;
  border-radius: 8px;
  margin-right: -12px;
}

.search-input :deep(.v-field__append-inner) {
  align-items: center;
  padding-top: 0;
  padding-bottom: 0;
  margin-left: 0;
}

.text-caption {
  line-height: 1.2;
}
</style>
