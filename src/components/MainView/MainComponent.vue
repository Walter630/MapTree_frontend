<template>
  <v-container class="pa-8">
    <!-- ===== Cabeçalho ===== -->
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
        <v-btn color="black" variant="flat" size="large" @click="performSearch">BUSCAR</v-btn>
      </v-col>
    </v-row>

    <!-- ===== Cards de Resumo ===== -->
    <v-row class="mt-6 d-flex" justify="start">
      <v-col cols="12" md="3">
        <v-card class="card-resumo">
          <div class="card-header"><span>Árvores</span><v-icon>mdi-tree</v-icon></div>
          <p class="card-numero">{{ countTrees }}</p>
          <p class="card-info">+3 este mês</p>
        </v-card>
      </v-col>

      <v-col cols="12" md="3">
        <v-card class="card-resumo">
          <div class="card-header"><span>Podas</span><v-icon>mdi-content-cut</v-icon></div>
          <p class="card-numero">{{ countPrunings }}</p>
          <p class="card-info">+7 este mês</p>
        </v-card>
      </v-col>

      <v-col cols="12" md="3">
        <v-card class="card-resumo">
          <div class="card-header"><span>Áreas Críticas</span><v-icon>mdi-alert</v-icon></div>
          <p class="card-numero">156</p>
          <p class="card-info">Catalogadas</p>
        </v-card>
      </v-col>

      <v-col cols="12" md="3">
        <v-card class="card-resumo">
          <div class="card-header"><span>Espécies</span><v-icon>mdi-sprout</v-icon></div>
          <p class="card-numero">{{ countSpecies }}</p>
          <p class="card-info">Catalogadas</p>
        </v-card>
      </v-col>
    </v-row>

    <!-- ===== Seção: Mapa + Gráfico + Alertas ===== -->
    <v-row class="mb-6 mt-10" dense>
      <!-- Mapa de Risco -->
      <v-col cols="12" md="5">
        <v-card class="pa-4 section-card" flat>
          <p class="section-title">
            <v-icon class="mr-2">mdi-map-marker-alert-outline</v-icon>
            Região em risco
          </p>
          <PruningMap ref="pruningMapRef" style="height: 270px; border-radius: 8px; overflow: hidden" />
          <v-btn icon @click="goToMap"><v-icon>mdi-map</v-icon></v-btn>
        </v-card>
      </v-col>

      <!-- Podas por mês -->
      <v-col cols="12" md="3">
        <v-card class="pa-4 section-card-white" flat>
          <p class="section-title">
            <v-icon class="mr-2">mdi-chart-bar</v-icon>
            Podas por mês
          </p>
          <v-skeleton-loader height="270" type="image" class="rounded-lg" />
        </v-card>
      </v-col>

      <!-- Árvores em risco -->
      <v-col cols="12" md="4">
        <v-card class="pa-4 section-card-white" flat>
          <p class="section-title">
            <v-icon class="mr-2">mdi-alert-outline</v-icon>
            Árvores em risco
          </p>

          <v-card
            v-for="tree in treesFiltradas"
            :key="tree.id"
            class="pa-3 mb-2 rounded-lg alert-card"
            flat
          >
            <p class="text-subtitle-2 font-weight-medium mb-1">{{ tree.status }}</p>
            <p class="text-caption text-grey-darken-1 mb-1">Lat: {{ tree.lat }}</p>
            <p class="text-caption text-grey-darken-1 mb-1">Lng: {{ tree.lng }}</p>
            <p class="text-caption font-weight-medium text-danger">Poda urgente</p>
          </v-card>
        </v-card>
      </v-col>
    </v-row>

    <!-- ===== Seção: Espécies + Relatórios ===== -->
    <v-row dense>


      <!-- Últimos Relatórios de Poda -->
      <v-col cols="12" md="6">
        <v-card class="pa-4 section-card" style="box-shadow: none">
          <p class="text-subtitle-1 font-weight-bold mb-4">Últimos Relatórios de Poda</p>

          <v-table class="report-table">
            <thead>
              <tr>
                <th class="text-left text-caption text-grey-darken-1 font-weight-medium py-3">Localização</th>
                <th class="text-left text-caption text-grey-darken-1 font-weight-medium py-3">Status</th>
                <th class="text-left text-caption text-grey-darken-1 font-weight-medium py-3">Árvore</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="report in prunings" :key="report.idTree">
                <td class="py-3 text-body-2">{{ report.observations }}</td>
                <td class="py-3">
                  <v-chip
                    :color="pruningColors[report.type]"
                    text-color="white"
                    size="small"
                    class="type-chip"
                  >
                    {{ report.type }}
                  </v-chip>
                </td>
                <td class="py-3 text-body-2">
                  {{ report.tree?.species?.commonName ?? 'Árvore não identificada' }}
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import PruningMap from '@/components/functions/MapsView/PruningMap.vue'
import SpeciesMap from '@/components/functions/MapsView/SpeciesMap.vue'
import { useAuth } from '@/hooks/useAuth'

/* ===================================
   TIPOS
=================================== */

interface Tree {
  id: string
  age: Date
  lat: number
  lng: number
  status: 'TO_PRUNE' | 'UNDER_OBSERVATION' | 'NORMAL' | 'PRUNED'
  species: Species
}

interface User {
  id: string | number
  name: string
  email?: string
  role?: string
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

interface Species {
  id: string
  commonName: string
  scientificName: string
  family: string
  description: string
  trees: Tree[]
}

/* ===================================
   CONSTANTES
=================================== */

const PRUNING_COLORS: Record<string, string> = {
  LIGHT: '#AFCDFF',
  MODERATE: '#FDFD98',
  HEAVY: '#B3E8A3',
}

/* ===================================
   COMPONENTE
=================================== */

export default defineComponent({
  name: 'UserHomeView',

  components: { SpeciesMap, PruningMap },

  data() {
    return {
      search: '',
      user: null as User | null,
      trees: null as Tree[] | null,
      species: null as Species[] | null,
      treesFiltradas: [] as Tree[],
      prunings: [] as Pruning[],

      // Contadores
      countTrees: 0,
      countPrunings: 0,
      countSpecies: 0,

      // Cores dos tipos de poda
      pruningColors: PRUNING_COLORS,
    }
  },

  mounted() {
    this.getUser()
    this.getTrees()
    this.getSpecies()
    this.getPrunings()
  },

  methods: {
    performSearch() {
      console.log('Pesquisando:', this.search)
    },

    goToMap() {
      this.$router.push('/user/mapUser')
    },

    /* ---------- Chamadas API ---------- */

    getSpecies() {
      this.$api
        .get<Species[]>('/species')
        .then((response) => {
          this.species = response.data
          this.countSpecies = this.species.length
        })
        .catch((error: unknown) => console.error('Erro ao buscar espécies:', error))
    },

    getPrunings() {
      this.$api
        .get<Pruning[]>('/pruning')
        .then((response) => {
          this.prunings = response.data
          this.countPrunings = this.prunings.length
        })
        .catch((error: unknown) => console.error('Erro ao buscar podas:', error))
    },

    getTrees() {
      this.$api
        .get<Tree[]>('/trees')
        .then((response) => {
          this.trees = response.data
          this.countTrees = this.trees.length
          this.treesFiltradas = this.trees.filter((t) => t.status === 'TO_PRUNE')
        })
        .catch((error: unknown) => console.error('Erro ao buscar árvores:', error))
    },

    getUser() {
      const auth = useAuth()
      auth
        .getCurrentUser()
        .then((u) => {
          if (u) this.user = u as User
        })
        .catch((error: unknown) => console.error('Erro ao buscar usuário:', error))
    },
  },
})
</script>

<style scoped>
/* ===== Cards de Resumo ===== */
.card-resumo {
  background: #f6f6f6;
  border: 1px solid #cdcdcd;
  height: 150px;
  border-radius: 8px;
  padding: 15px;
  box-shadow: none;
}

.card-header {
  display: flex;
  justify-content: space-between;
  font-weight: 600;
}

.card-numero {
  font-size: 26px;
  margin-top: 25px;
  font-weight: bold;
}

.card-info {
  margin-top: 5px;
  font-size: 13px;
  color: #777;
}

/* ===== Seções ===== */
.section-card {
  border: 1px solid #cdcdcd;
  background-color: #f6f6f6;
  border-radius: 12px;
}

.section-card-white {
  border: 1px solid #cdcdcd;
  background-color: white;
  border-radius: 12px;
}

.section-title {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
}

/* ===== Alertas ===== */
.alert-card {
  border: 1px solid #cdcdcd;
  background-color: #fbe0e3;
  box-shadow: none;
}

.text-danger {
  color: #c80c34;
}

/* ===== Tabela de Relatórios ===== */
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

.type-chip {
  border-radius: 8px;
  border: 1px solid #cdcdcd;
  box-shadow: none;
}

/* ===== Busca ===== */
.search-input :deep(.v-field__append-inner) {
  align-items: center;
  padding-top: 0;
  padding-bottom: 0;
  margin-left: 0;
}
</style>
