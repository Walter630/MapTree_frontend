<template>
  <v-container fluid class="page-shell">
    <!-- ===== Cabeçalho ===== -->
    <v-row align="center" class="mb-3">
      <v-col cols="12">
        <p class="text-caption text-grey-darken-1 mb-1">Meu Painel</p>
        <p class="text-h6 font-weight-regular mb-0">
          Olá, {{ user?.name || 'Usuário' }}, Aqui Está o Resumo de Suas Operações.
        </p>
      </v-col>
    </v-row>

    <!-- ===== Cards de Resumo Modernos ===== -->
    <v-row dense>
      <v-col cols="6" md="3">
        <v-card class="kpi-card" flat>
          <div class="kpi-header">
            <span class="kpi-label">Árvores</span>
            <AnimatedKpiIcon type="tree" color="#2e7d32" />
          </div>
          <div class="kpi-value">{{ countTrees }}</div>
          <div class="kpi-subtitle">Cadastradas</div>
        </v-card>
      </v-col>

      <v-col cols="6" md="3">
        <v-card class="kpi-card" flat>
          <div class="kpi-header">
            <span class="kpi-label">Podas</span>
            <AnimatedKpiIcon type="prune" color="#1565c0" />
          </div>
          <div class="kpi-value">{{ countPrunings }}</div>
          <div class="kpi-subtitle">Realizadas</div>
        </v-card>
      </v-col>

      <v-col cols="6" md="3">
        <v-card class="kpi-card" :class="{ 'kpi-card--danger': countCritical > 0 }" flat>
          <div class="kpi-header">
            <span class="kpi-label">Áreas Críticas</span>
            <AnimatedKpiIcon type="alert" :color="countCritical > 0 ? '#d32f2f' : '#9e9e9e'" />
          </div>
          <div class="kpi-value" :class="{ 'text-error': countCritical > 0 }">{{ countCritical }}</div>
          <div class="kpi-subtitle">Em risco</div>
        </v-card>
      </v-col>

      <v-col cols="6" md="3">
        <v-card class="kpi-card" flat>
          <div class="kpi-header">
            <span class="kpi-label">Espécies</span>
            <AnimatedKpiIcon type="sprout" color="#ef6c00" />
          </div>
          <div class="kpi-value">{{ countSpecies }}</div>
          <div class="kpi-subtitle">Catalogadas</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- ===== Seção: Mapa + Gráfico + Alertas ===== -->
    <v-row class="mb-6 mt-6" dense>
      <!-- Mapa de Risco - Design Premium -->
      <v-col cols="12" md="5">
        <v-card class="risk-map-card" flat>
          <div class="risk-map-header">
            <div class="d-flex align-center">
              <div class="risk-icon-container mr-3">
                <v-icon size="24" color="white">mdi-map-marker-alert</v-icon>
              </div>
              <div>
                <p class="risk-title mb-0">Alertas Geográficos</p>
                <p class="risk-subtitle mb-0">Áreas com intervenção prioritária</p>
              </div>
            </div>
            <v-btn
              variant="tonal"
              size="small"
              color="error"
              prepend-icon="mdi-open-in-app"
              @click="goToMap"
              class="view-map-btn"
            >
              Ver no Mapa
            </v-btn>
          </div>

          <div class="risk-map-container">
            <MiniMap
              ref="miniMapRef"
              filter-status="TO_PRUNE"
              style="height: 100%; width: 100%;"
            />
            <div class="risk-overlay-badge">
              <v-chip color="error" size="small" variant="flat" class="font-weight-bold">
                <v-icon size="14" class="mr-1">mdi-alert-circle</v-icon>
                {{ filteredTrees.length }} pontos críticos
              </v-chip>
            </div>
          </div>
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

      <!-- Árvores em risco - Lista Premium -->
      <v-col cols="12" md="4">
        <v-card class="risk-list-card" flat>
          <div class="risk-list-header">
            <div class="d-flex align-center">
              <div class="risk-list-icon mr-3">
                <v-icon size="20" color="white">mdi-alert</v-icon>
              </div>
              <div>
                <p class="risk-list-title mb-0">Lista de Alertas</p>
                <p class="risk-list-subtitle mb-0">{{ alertTrees.length }} de {{ filteredTrees.length }} árvores</p>
              </div>
            </div>
          </div>

          <!-- Busca + filtros para localizar uma árvore específica -->
          <div class="risk-list-tools">
            <v-text-field
              v-model="alertSearch"
              placeholder="Buscar por código ou coordenada"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
            <div class="risk-filter-chips mt-2">
              <v-chip
                v-for="opt in alertFilters"
                :key="opt.value"
                :color="alertFilter === opt.value ? 'green-darken-1' : undefined"
                :variant="alertFilter === opt.value ? 'flat' : 'tonal'"
                size="small"
                class="font-weight-bold"
                @click="alertFilter = opt.value"
              >
                {{ opt.label }}
              </v-chip>
            </div>
          </div>

          <div class="risk-list-container">
            <v-card
              v-for="tree in alertTrees"
              :key="tree.id"
              class="risk-item mb-2"
              flat
              @click="focusOnTree(tree)"
            >
              <div class="d-flex align-center">
                <div
                  class="risk-indicator mr-3"
                  :class="tree.status === 'TO_PRUNE' ? 'risk-indicator--warn' : 'risk-indicator--crit'"
                >
                  <v-icon size="18" :color="tree.status === 'TO_PRUNE' ? 'orange-darken-2' : 'error'">
                    {{ tree.status === 'TO_PRUNE' ? 'mdi-content-cut' : 'mdi-alert-circle' }}
                  </v-icon>
                </div>
                <div class="flex-grow-1">
                  <div class="d-flex align-center" style="gap: 6px;">
                    <span class="risk-item-code">#{{ treeCode(tree) }}</span>
                    <span class="risk-item-title">{{ tree.status === 'TO_PRUNE' ? 'Poda Urgente' : 'Risco Crítico' }}</span>
                  </div>
                  <p class="risk-item-coords mb-0">
                    <v-icon size="11" class="mr-1">mdi-map-marker</v-icon>
                    {{ (tree.lat || tree.latitude || 0).toFixed(4) }}, {{ (tree.lng || tree.longitude || 0).toFixed(4) }}
                  </p>
                </div>
                <v-icon size="16" color="grey-lighten-1">mdi-chevron-right</v-icon>
              </div>
            </v-card>

            <div v-if="alertTrees.length === 0 && filteredTrees.length > 0" class="text-center py-6 empty-state">
              <v-icon size="40" color="grey-lighten-1">mdi-magnify-close</v-icon>
              <p class="text-body-2 text-grey mt-2">Nenhuma árvore encontrada para esta busca</p>
            </div>
            <div v-else-if="filteredTrees.length === 0" class="text-center py-6 empty-state">
              <v-icon size="40" color="success-lighten-2">mdi-shield-check</v-icon>
              <p class="text-body-2 text-grey mt-2">Sem alertas pendentes</p>
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
            <div
              v-for="spec in topSpecies"
              :key="spec.id"
              class="species-item"
            >
              <div class="species-icon">
                <v-icon color="green-darken-1" size="22">mdi-tree</v-icon>
              </div>
              <div class="species-info">
                <span class="species-name">{{ spec.commonName || spec.scientificName }}</span>
                <span v-if="spec.scientificName && spec.commonName" class="species-sci">
                  {{ spec.scientificName }}
                </span>
              </div>
              <div class="species-count">
                <span class="species-count-value">{{ spec._count?.trees || 0 }}</span>
                <span class="species-count-label">árvores</span>
              </div>
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
import AnimatedKpiIcon from '@/components/shared/AnimatedKpiIcon.vue'
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

  components: { MiniMap, PruningChart, AnimatedKpiIcon },

  data() {
    return {
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

      // Lista de alertas: busca e filtro
      alertSearch: '',
      alertFilter: 'ALL' as 'ALL' | 'TO_PRUNE' | 'CRITICAL',
      alertFilters: [
        { label: 'Todas', value: 'ALL' },
        { label: 'Poda Urgente', value: 'TO_PRUNE' },
        { label: 'Crítico', value: 'CRITICAL' },
      ] as { label: string; value: 'ALL' | 'TO_PRUNE' | 'CRITICAL' }[],

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

  computed: {
    /** Lista de alertas após aplicar filtro de tipo + busca por código/coordenada */
    alertTrees(): Tree[] {
      let list = this.filteredTrees

      // Filtro por tipo
      if (this.alertFilter === 'TO_PRUNE') {
        list = list.filter((t) => t.status === 'TO_PRUNE')
      } else if (this.alertFilter === 'CRITICAL') {
        list = list.filter((t) => t.status !== 'TO_PRUNE')
      }

      // Busca por código ou coordenada (texto livre)
      const q = this.alertSearch?.trim().toLowerCase()
      if (q) {
        list = list.filter((t) => {
          const code = this.treeCode(t).toLowerCase()
          const lat = (t.lat || t.latitude || 0).toFixed(4)
          const lng = (t.lng || t.longitude || 0).toFixed(4)
          return (
            code.includes(q) ||
            lat.includes(q) ||
            lng.includes(q) ||
            `${lat}, ${lng}`.includes(q)
          )
        })
      }

      return list
    },
  },

  methods: {
    /** Código curto e amigável da árvore (ex.: usa o fim do id) */
    treeCode(tree: Tree): string {
      const id = String(tree.id ?? '')
      return id ? id.slice(-4).toUpperCase() : '----'
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
/* ===== Cards KPI Modernos ===== */
.kpi-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 16px;
  /* Altura fixa para todos os cards ficarem idênticos,
     independente do tamanho do número ou do conteúdo. */
  height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: all 0.2s ease;
}

.kpi-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.kpi-card--danger {
  background: linear-gradient(135deg, #fff5f5 0%, #ffffff 100%);
  border-color: #ffcdd2;
}

.kpi-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.kpi-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #666;
}

.kpi-value {
  font-size: 2rem;
  font-weight: 700;
  color: #333;
  line-height: 1;
}

.kpi-subtitle {
  font-size: 0.75rem;
  color: #888;
  margin-top: 4px;
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
  /* Altura padronizada com os outros cards da linha */
  height: 400px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.section-title {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
}

/* ===== Lista de Espécies (cards) ===== */
.species-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  margin-bottom: 8px;
  background: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  transition: all 0.18s ease;
}

.species-item:hover {
  border-color: #c6e6c0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transform: translateY(-1px);
}

.species-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eaf6e6;
  border-radius: 10px;
}

.species-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.species-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #2c3e2c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.species-sci {
  font-size: 0.75rem;
  font-style: italic;
  color: #9a9a9a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.species-count {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
  line-height: 1.1;
}

.species-count-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: #2e7d32;
}

.species-count-label {
  font-size: 0.68rem;
  color: #9a9a9a;
  text-transform: uppercase;
  letter-spacing: 0.3px;
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

/* ===== Card de Mapa de Risco Premium ===== */
.risk-map-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #e0e0e0;
  /* Altura padronizada com os outros cards da linha */
  height: 400px;
  display: flex;
  flex-direction: column;
}

.risk-map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #fff5f5 0%, #ffffff 100%);
  border-bottom: 1px solid rgba(200, 12, 52, 0.1);
}

.risk-icon-container {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #c80c34 0%, #e53935 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(200, 12, 52, 0.3);
}

.risk-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #c80c34;
}

.risk-subtitle {
  font-size: 0.8rem;
  color: #666;
}

.view-map-btn {
  border-radius: 8px;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 600;
}

.risk-map-container {
  position: relative;
  flex: 1;
  min-height: 0;
}

.risk-overlay-badge {
  position: absolute;
  bottom: 12px;
  left: 12px;
  z-index: 10;
}

/* ===== Card de Lista de Riscos Premium ===== */
.risk-list-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #e0e0e0;
  /* Altura padronizada com os outros cards da linha */
  height: 400px;
  display: flex;
  flex-direction: column;
}

.risk-list-header {
  padding: 16px 20px;
  background: linear-gradient(135deg, #fff5f5 0%, #ffffff 100%);
  border-bottom: 1px solid rgba(200, 12, 52, 0.1);
}

.risk-list-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #c80c34 0%, #e53935 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(200, 12, 52, 0.3);
}

.risk-list-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #c80c34;
}

.risk-list-subtitle {
  font-size: 0.75rem;
  color: #666;
}

.risk-list-container {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  min-height: 0;
}

.risk-list-container::-webkit-scrollbar {
  width: 4px;
}

.risk-list-container::-webkit-scrollbar-thumb {
  background: #e0e0e0;
  border-radius: 4px;
}

.risk-item {
  padding: 12px 16px;
  border-radius: 10px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.risk-item:hover {
  background: white;
  border-color: #c80c34;
  box-shadow: 0 4px 12px rgba(200, 12, 52, 0.1);
  transform: translateX(4px);
}

.risk-indicator {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(200, 12, 52, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.risk-item-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #333;
}

.risk-item-coords {
  font-size: 0.75rem;
  color: #888;
  font-family: monospace;
  display: flex;
  align-items: center;
}

/* Ferramentas de busca/filtro da lista de alertas */
.risk-list-tools {
  padding: 12px 16px 4px;
  border-bottom: 1px solid #f3f3f3;
}

.risk-filter-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

/* Código curto da árvore (ex.: #1054) */
.risk-item-code {
  font-size: 0.72rem;
  font-weight: 700;
  color: #2e7d32;
  background: #eaf6e6;
  border-radius: 6px;
  padding: 1px 6px;
  font-family: monospace;
}

/* Variações de cor do indicador por tipo */
.risk-indicator--warn {
  background: rgba(230, 126, 0, 0.12);
}

.risk-indicator--crit {
  background: rgba(200, 12, 52, 0.1);
}

/* Hover muda a cor conforme o tipo seria ideal, mas mantemos neutro */
.risk-item:hover .risk-indicator--warn {
  background: rgba(230, 126, 0, 0.18);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
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
</style>
