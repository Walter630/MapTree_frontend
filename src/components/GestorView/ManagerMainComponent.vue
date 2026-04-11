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
          <MiniMap
            ref="miniMapRef"
            filter-status="TO_PRUNE"
            style="height: 270px; border-radius: 8px; overflow: hidden"
          />
          <v-btn icon @click="goToMap"><v-icon>mdi-map</v-icon></v-btn>
        </v-card>
      </v-col>

      <!-- Podas por mês -->
      <v-col cols="12" md="3">
        <v-card class="pa-4 section-card-white" flat>
          <p class="section-title">
            <v-icon class="mr-2" color="success">mdi-chart-line</v-icon>
            Podas por mês
          </p>
          <PruningChart />
        </v-card>
      </v-col>

      <!-- Árvores em risco -->
      <v-col cols="12" md="4">
        <v-card class="pa-4 section-card-white" flat>
          <p class="section-title">
            <v-icon class="mr-2">mdi-alert-outline</v-icon>
            Árvores em risco
          </p>

          <div class="alerts-container">
            <v-card
              v-for="tree in filteredTrees"
              :key="tree.id"
              class="pa-4 mb-3 rounded-xl alert-card-premium pointer-cursor"
              flat
              @click="focusOnTree(tree)"
            >
              <div class="d-flex justify-space-between align-center mb-2">
                <v-chip color="error" size="x-small" variant="flat" class="font-weight-bold">
                  PODA URGENTE
                </v-chip>
                <v-icon color="error" size="20">mdi-alert-decagram</v-icon>
              </div>
              
              <p class="text-subtitle-1 font-weight-bold mb-1">{{ tree.status === 'TO_PRUNE' ? 'Necessita Poda' : tree.status }}</p>
              
              <div class="d-flex align-center text-caption text-grey-darken-1 mb-1">
                <v-icon size="14" class="mr-1">mdi-map-marker</v-icon>
                <span>
                  Lat: {{ (tree.lat || tree.latitude || 0).toFixed(4) }} / 
                  Lng: {{ (tree.lng || tree.longitude || 0).toFixed(4) }}
                </span>
              </div>
              
              <div class="mt-2 d-flex align-center">
                <v-icon size="16" color="warning" class="mr-1">mdi-lightning-bolt</v-icon>
                <span class="text-caption font-weight-medium text-warning">Risco de fiação detectado</span>
              </div>
            </v-card>

            <div v-if="filteredTrees.length === 0" class="text-center py-8">
              <v-icon size="48" color="grey-lighten-2">mdi-check-circle-outline</v-icon>
              <p class="text-body-2 text-grey mt-2">Nenhum alerta crítico pendente</p>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- ===== Seção: Espécies + Relatórios ===== -->
    <v-row dense>
      <!-- Espécies por localidade -->
      <v-col cols="12" md="6">
        <v-card flat class="pa-4 section-card">
          <p class="section-title">
            <v-icon class="mr-2">mdi-leaf-maple</v-icon>
            Espécies por localidade
          </p>
          <!-- TODO: Adicionar mapa de espécies -->
        </v-card>
      </v-col>

      <!-- Últimos Relatórios de Poda -->
      <v-col cols="12" md="6">
        <v-card class="pa-4 section-card" style="box-shadow: none">
          <p class="text-subtitle-1 font-weight-bold mb-4">Últimos Relatórios de Poda</p>

          <v-data-table
            :headers="reportHeaders"
            hide-default-footer
            hide-default-header
            class="report-table"
          >
            <thead>
              <tr>
                <th class="text-left text-caption text-grey-darken-1 font-weight-medium py-3">Localização</th>
                <th class="text-left text-caption text-grey-darken-1 font-weight-medium py-3">Status</th>
                <th class="text-left text-caption text-grey-darken-1 font-weight-medium py-3">Árvore</th>
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
import MiniMap from '@/components/functions/MapsView/MiniMap.vue'
import PruningChart from '@/components/functions/GraficosView/PruningChart.vue'
import { useAuth } from '@/hooks/useAuth'

/* ===================================
   TIPOS
=================================== */

interface Tree {
  id: string
  age: Date
  lat?: number
  lng?: number
  latitude?: number
  longitude?: number
  status: 'TO_PRUNE' | 'UNDER_OBSERVATION' | 'NORMAL' | 'PRUNED'
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

interface ReportHeader {
  title: string
  key: string
}

/* ===================================
   COMPONENTE
=================================== */

export default defineComponent({
  name: 'ManagerHomeView',

  components: { MiniMap, PruningChart },

  data() {
    return {
      search: '',
      user: null as User | null,
      trees: null as Tree[] | null,
      species: null as Species[] | null,
      filteredTrees: [] as Tree[],
      prunings: [] as Pruning[],
      miniMapRef: null as any,

      // Contadores
      countTrees: 0,
      countPrunings: 0,
      countSpecies: 0,

      reportHeaders: [
        { title: 'Localização', key: 'localizacao' },
        { title: 'Status', key: 'status' },
        { title: 'Árvore', key: 'acao' },
      ] as ReportHeader[],
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
      this.$router.push('/manager/map')
    },

    focusOnTree(tree: Tree) {
      if (this.miniMapRef && (tree.lat || tree.latitude)) {
        this.miniMapRef.focusOn(tree.lat || tree.latitude, tree.lng || tree.longitude)
      }
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
          this.trees = (response.data || []).map(t => ({
            ...t,
            lat: t.lat ?? t.latitude ?? 0,
            lng: t.lng ?? t.longitude ?? 0
          }))
          this.countTrees = this.trees.length
          this.filteredTrees = this.trees.filter((t) => t.status === 'TO_PRUNE')
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
.alert-card-premium {
  border: 1px solid rgba(200, 12, 52, 0.1);
  background: linear-gradient(135deg, #ffffff 0%, #fff5f5 100%);
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05) !important;
}

.alert-card-premium:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(200, 12, 52, 0.1) !important;
}

.pointer-cursor {
  cursor: pointer;
}

.alerts-container {
  max-height: 400px;
  overflow-y: auto;
  padding-right: 4px;
}

.alerts-container::-webkit-scrollbar {
  width: 4px;
}

.alerts-container::-webkit-scrollbar-thumb {
  background: #e0e0e0;
  border-radius: 4px;
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

/* ===== Busca ===== */
.search-input :deep(.v-field__append-inner) {
  align-items: center;
  padding-top: 0;
  padding-bottom: 0;
  margin-left: 0;
}
</style>
