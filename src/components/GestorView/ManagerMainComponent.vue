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
          <p class="card-numero">{{ countCritical }}</p>
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
        <v-card flat class="pa-4 section-card overflow-hidden" style="height: 380px;">
          <p class="section-title">
            <v-icon class="mr-2" color="green">mdi-leaf-maple</v-icon>
            Espécies por localidade
          </p>
          <div class="species-list-container" style="max-height: 300px; overflow-y: auto;">
            <div v-for="spec in topSpecies" :key="spec.id" class="mb-4 pr-2">
              <div class="d-flex justify-space-between align-center mb-1">
                <span class="text-body-2 font-weight-bold">{{ spec.commonName || spec.scientificName }}</span>
                <span class="text-caption text-grey-darken-1">{{ spec._count?.trees || 0 }} árvores</span>
              </div>
              <v-progress-linear
                :model-value="(spec._count?.trees / (countTrees || 1)) * 100"
                color="green-darken-1"
                height="8"
                rounded
                striped
              />
            </div>
            <div v-if="topSpecies.length === 0" class="text-center py-8">
              <v-icon color="grey-lighten-2" size="48">mdi-leaf-off</v-icon>
              <p class="text-caption text-grey mt-2">Sem dados de espécies</p>
            </div>
          </div>
        </v-card>
      </v-col>

      <!-- Últimos Relatórios de Poda (Modernizado) -->
      <v-col cols="12" md="6">
        <v-card class="pa-4 section-card overflow-hidden" style="height: 380px; box-shadow: none">
          <div class="d-flex justify-space-between align-center mb-4">
            <p class="section-title mb-0">
              <v-icon class="mr-2" color="blue-darken-2">mdi-clipboard-text-clock-outline</v-icon>
              Últimos Relatórios de Poda
            </p>
            <v-btn variant="text" color="primary" size="small" rounded="pill" @click="showAllReports = true">Ver Todos</v-btn>
          </div>

          <div class="reports-scroll-container" style="max-height: 300px; overflow-y: auto;">
            <v-list lines="two" bg-color="transparent" class="pa-0">
              <v-list-item
                v-for="report in prunings.slice(0, 5)"
                :key="report.id"
                class="report-list-item mb-2 rounded-lg pa-3"
                @click="viewReportDetails(report)"
              >
                <template #prepend>
                  <v-avatar :color="getPruningColor(report.type)" size="40" rounded="lg">
                    <v-icon color="white" size="20">mdi-content-cut</v-icon>
                  </v-avatar>
                </template>

                <v-list-item-title class="text-subtitle-2 font-weight-bold">
                  {{ report.tree?.species?.commonName || 'Árvore #' + report.idTree.slice(-4) }}
                </v-list-item-title>
                
                <v-list-item-subtitle class="text-caption d-flex align-center mt-1">
                  <v-icon size="12" class="mr-1">mdi-map-marker</v-icon>
                  {{ report.tree?.latitude?.toFixed(4) }}, {{ report.tree?.longitude?.toFixed(4) }}
                  <v-divider vertical class="mx-2" />
                  <v-icon size="12" class="mr-1">mdi-calendar</v-icon>
                  {{ formatDate(report.date) }}
                </v-list-item-subtitle>

                <template #append>
                  <v-chip :color="getPruningColor(report.type)" size="x-small" variant="tonal" class="font-weight-bold">
                    {{ report.type || 'REGULAR' }}
                  </v-chip>
                </template>
              </v-list-item>
            </v-list>
            
            <div v-if="prunings.length === 0" class="text-center py-12">
              <v-icon color="grey-lighten-3" size="64">mdi-clipboard-off-outline</v-icon>
              <p class="text-body-2 text-grey mt-2">Nenhum relatório pendente</p>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- ===== DIALOG DE DETALHES DO RELATÓRIO (PREMIUM) ===== -->
    <v-dialog v-model="reportDialog" max-width="500">
      <v-card v-if="selectedReport" class="rounded-xl overflow-hidden glass-card">
        <div :style="`background: linear-gradient(135deg, ${getPruningHex(selectedReport.type)}, #000); padding: 24px; color: white`">
          <div class="d-flex justify-space-between align-start">
            <div>
              <p class="text-overline mb-0" style="opacity: 0.8">Relatório Técnico de Poda</p>
              <h2 class="text-h5 font-weight-bold">{{ selectedReport.tree?.species?.commonName || 'Árvore Independente' }}</h2>
              <p class="text-caption mb-0">{{ selectedReport.tree?.species?.scientificName }}</p>
            </div>
            <v-chip color="rgba(255,255,255,0.2)" variant="flat" size="small" class="text-white">
              #{{ selectedReport.id.slice(-6).toUpperCase() }}
            </v-chip>
          </div>
        </div>

        <v-card-text class="pa-6">
          <div class="mb-6">
            <h3 class="text-subtitle-2 font-weight-bold mb-3 d-flex align-center">
              <v-icon start size="18" color="primary">mdi-information-outline</v-icon>
              Dados da Intervenção
            </h3>
            <v-card variant="tonal" color="grey-lighten-4" class="pa-4 rounded-lg border">
              <v-row dense>
                <v-col cols="6">
                  <p class="text-caption text-grey-darken-1 mb-0">Técnico Responsável</p>
                  <p class="text-body-2 font-weight-bold">{{ selectedReport.user?.name || 'Sistema IA' }}</p>
                </v-col>
                <v-col cols="6">
                  <p class="text-caption text-grey-darken-1 mb-0">Data de Execução</p>
                  <p class="text-body-2 font-weight-bold">{{ formatDateFull(selectedReport.date) }}</p>
                </v-col>
                <v-col cols="6" class="mt-2">
                  <p class="text-caption text-grey-darken-1 mb-0">Tipo de Poda</p>
                  <v-chip :color="getPruningColor(selectedReport.type)" size="x-small" class="font-weight-bold">{{ selectedReport.type }}</v-chip>
                </v-col>
                <v-col cols="6" class="mt-2">
                  <p class="text-caption text-grey-darken-1 mb-0">Vigor Médio</p>
                  <p class="text-body-2 font-weight-bold text-success">{{ selectedReport.tree?.vigor || 'BOM' }}</p>
                </v-col>
              </v-row>
            </v-card>
          </div>

          <div v-if="selectedReport.observations" class="mb-6">
            <h3 class="text-subtitle-2 font-weight-bold mb-2">Observações de Campo</h3>
            <p class="text-body-2 text-grey-darken-2 italic">{{ selectedReport.observations }}</p>
          </div>

          <div>
            <h3 class="text-subtitle-2 font-weight-bold mb-3 d-flex align-center">
              <v-icon start size="18" color="green">mdi-image-filter-hdr</v-icon>
              Telemetria Geográfica
            </h3>
            <div class="d-flex align-center pa-3 rounded-lg bg-grey-lighten-4 border">
              <v-icon color="grey" class="mr-3">mdi-map-search</v-icon>
              <div>
                <p class="text-caption font-weight-bold mb-0">Coordenadas de Referência</p>
                <p class="text-caption text-grey-darken-2">LAT: {{ selectedReport.tree?.latitude }} / LNG: {{ selectedReport.tree?.longitude }}</p>
              </div>
              <v-spacer />
              <v-btn icon size="small" variant="text" color="primary" @click="focusOnTree(selectedReport.tree); reportDialog = false">
                <v-icon>mdi-eye</v-icon>
              </v-btn>
            </div>
          </div>
        </v-card-text>

        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" rounded="pill" @click="reportDialog = false">Fechar</v-btn>
          <v-btn color="black" variant="flat" rounded="pill" class="px-6">IMPRIMIR</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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
      species: [] as any[],
      topSpecies: [] as any[],
      filteredTrees: [] as Tree[],
      prunings: [] as any[],
      miniMapRef: null as any,

      // Contadores
      countTrees: 0,
      countPrunings: 0,
      countSpecies: 0,
      countCritical: 0,

      // UI States
      reportDialog: false,
      showAllReports: false,
      selectedReport: null as any,

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

    formatDate(dateStr: any) {
      if (!dateStr) return '-'
      const d = new Date(dateStr)
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    },

    formatDateFull(dateStr: any) {
      if (!dateStr) return '-'
      const d = new Date(dateStr)
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    },

    getPruningColor(type: string) {
      if (type === 'HEAVY') return 'red-darken-2'
      if (type === 'MODERATE') return 'orange-darken-1'
      return 'green-darken-1'
    },

    getPruningHex(type: string) {
      if (type === 'HEAVY') return '#D32F2F'
      if (type === 'MODERATE') return '#F57C00'
      return '#388E3C'
    },

    viewReportDetails(report: any) {
      this.selectedReport = report
      this.reportDialog = true
    },

    /* ---------- Chamadas API ---------- */

    getSpecies() {
      this.$api
        .get<any[]>('/species')
        .then((response) => {
          this.species = response.data || []
          this.countSpecies = this.species.length
          // Pegar as 5 mais comuns para o dashboard
          this.topSpecies = [...this.species]
            .sort((a, b) => (b._count?.trees || 0) - (a._count?.trees || 0))
            .slice(0, 5)
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
          const allTrees = (response.data || []).map((t: any) => ({
            ...t,
            lat: Number(t.lat ?? t.latitude ?? 0),
            lng: Number(t.lng ?? t.longitude ?? 0)
          }))
          this.trees = allTrees
          this.countTrees = allTrees.length
          // Conta árvores críticas (perigo de fiação ou status crítico)
          this.countCritical = allTrees.filter((t: any) => t.status === 'TO_PRUNE' || t.status === 'CRITICAL').length
          // Mostra no painel lateral tanto as URB (TO_PRUNE) quanto as CRITICAL (Risco de rede)
          this.filteredTrees = allTrees.filter((t: any) => t.status === 'TO_PRUNE' || t.status === 'CRITICAL')
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

.report-list-item {
  background: white;
  border: 1px solid #eee;
  transition: all 0.2s ease;
  cursor: pointer;
}

.report-list-item:hover {
  transform: translateX(4px);
  border-color: #94a3b8;
  background: #f8fafc;
}

.glass-card {
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.95) !important;
}

/* ===== Busca ===== */
.search-input :deep(.v-field__append-inner) {
  align-items: center;
  padding-top: 0;
  padding-bottom: 0;
  margin-left: 0;
}
</style>
