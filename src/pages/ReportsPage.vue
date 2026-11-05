<template>
  <v-container fluid class="page-shell">
    <!-- Header -->
    <PageHeader
      title="Relatórios de Podas"
      subtitle="Visualize estatísticas e relatórios das podas realizadas"
      :breadcrumbs="[{ text: 'Meu Painel', to: '/user' }, { text: '#Relatórios' }]"
    />

    <!-- Cards de Resumo -->
    <v-row class="mb-6" dense>
      <v-col cols="6" md="3">
        <v-card class="kpi-card" flat>
          <div class="kpi-header">
            <span class="kpi-label">Total de Podas</span>
            <v-icon size="20" color="blue-darken-2">mdi-content-cut</v-icon>
          </div>
          <div class="kpi-value">{{ totalPrunings }}</div>
          <div class="kpi-subtitle">Registradas</div>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card class="kpi-card" flat>
          <div class="kpi-header">
            <span class="kpi-label">Este Mês</span>
            <v-icon size="20" color="green-darken-2">mdi-calendar-check</v-icon>
          </div>
          <div class="kpi-value">{{ thisMonthPrunings }}</div>
          <div class="kpi-subtitle">Realizadas</div>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card class="kpi-card" flat>
          <div class="kpi-header">
            <span class="kpi-label">Árvores Podadas</span>
            <v-icon size="20" color="orange-darken-2">mdi-tree</v-icon>
          </div>
          <div class="kpi-value">{{ totalTreesPruned }}</div>
          <div class="kpi-subtitle">Únicas</div>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card class="kpi-card" flat>
          <div class="kpi-header">
            <span class="kpi-label">Equipes</span>
            <v-icon size="20" color="purple-darken-2">mdi-account-group</v-icon>
          </div>
          <div class="kpi-value">{{ activeTeams }}</div>
          <div class="kpi-subtitle">Ativas</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Gráficos -->
    <v-row class="mb-6" dense>
      <!-- Podas por Período -->
      <v-col cols="12" md="6">
        <v-card class="chart-card" flat>
          <div class="d-flex align-center mb-4">
            <div class="chart-icon mr-3">
              <v-icon size="20" color="white">mdi-chart-bar</v-icon>
            </div>
            <span class="text-subtitle-1 font-weight-bold">Podas por Período</span>
          </div>
          <v-skeleton-loader v-if="loading" height="250" type="image" />
          <div v-else class="chart-placeholder">
            <div class="bar-chart">
              <div v-for="(bar, i) in periodChartData" :key="i" class="bar-wrapper">
                <div class="bar" :style="{ height: bar.value + '%', backgroundColor: bar.color }" />
                <span class="bar-label">{{ bar.label }}</span>
              </div>
            </div>
          </div>
        </v-card>
      </v-col>

      <!-- Distribuição por Tipo -->
      <v-col cols="12" md="6">
        <v-card class="chart-card" flat>
          <div class="d-flex align-center mb-4">
            <div class="chart-icon mr-3">
              <v-icon size="20" color="white">mdi-chart-pie</v-icon>
            </div>
            <span class="text-subtitle-1 font-weight-bold">Distribuição por Tipo</span>
          </div>
          <v-skeleton-loader v-if="loading" height="250" type="image" />
          <div v-else-if="pruningStats.length === 0" class="text-center py-8">
            <v-icon size="48" color="grey-lighten-1">mdi-chart-pie</v-icon>
            <p class="text-body-2 text-grey mt-2">Nenhuma poda registrada</p>
          </div>
          <div v-else class="pie-chart-container">
            <div class="pie-chart" :style="pieChartStyle" />
            <div class="pie-legend">
              <div v-for="(stat, i) in pruningStats" :key="i" class="legend-item">
                <div class="legend-color" :style="{ backgroundColor: stat.color }" />
                <span class="legend-label">{{ stat.label }}</span>
                <span class="legend-value">{{ stat.value }}%</span>
              </div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Tabela de Atividades -->
    <v-card class="report-card" flat>
      <div class="d-flex align-center justify-space-between mb-4">
        <div class="d-flex align-center">
          <div class="section-icon mr-3">
            <v-icon size="22" color="white">mdi-clipboard-list</v-icon>
          </div>
          <span class="text-subtitle-1 font-weight-bold">Histórico de Atividades</span>
        </div>
        <v-chip size="small" color="grey-lighten-3">{{ prunings.length }} registros</v-chip>
      </div>

      <!-- Loading -->
      <v-card v-if="loading" class="pa-8 text-center" flat>
        <v-progress-circular indeterminate color="green" size="48" />
        <p class="mt-4 text-grey">Carregando relatórios...</p>
      </v-card>

      <!-- Tabela -->
      <v-data-table
        v-else
        :items="prunings"
        :headers="headers"
        :items-per-page="10"
        density="comfortable"
        class="report-table"
        no-data-text="Nenhuma poda registrada"
      >
        <!-- Árvore -->
        <template #[`item.tree`]="{ item }">
          <div class="d-flex align-center">
            <v-icon size="18" color="green-darken-2" class="mr-2">mdi-tree</v-icon>
            <span class="text-body-2 font-weight-medium">
              {{ item.tree?.species?.commonName || 'Árvore #' + item.idTree?.slice(-4) }}
            </span>
          </div>
        </template>

        <!-- Data -->
        <template #[`item.date`]="{ item }">
          <span class="text-body-2">{{ formatDate(item.date) }}</span>
        </template>

        <!-- Tipo -->
        <template #[`item.type`]="{ item }">
          <v-chip
            :color="getTypeColor(item.type)"
            size="small"
            variant="flat"
            class="font-weight-medium"
          >
            {{ getTypeLabel(item.type) }}
          </v-chip>
        </template>

        <!-- Observações -->
        <template #[`item.observations`]="{ item }">
          <span
            class="text-caption text-grey-darken-1 text-truncate"
            style="max-width: 200px; display: block"
          >
            {{ item.observations || '—' }}
          </span>
        </template>

        <!-- Ações -->
        <template #[`item.actions`]="{ item }">
          <v-btn icon size="small" variant="text" color="primary" @click="viewDetails(item)">
            <v-icon size="18">mdi-eye</v-icon>
          </v-btn>
          <v-btn icon size="small" variant="text" color="grey" @click="downloadReport(item)">
            <v-icon size="18">mdi-download</v-icon>
          </v-btn>
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="reportDialog" max-width="680" scrollable>
      <v-card v-if="selectedReport" class="report-detail-dialog" rounded="xl">
        <header class="report-detail-hero">
          <div class="d-flex justify-space-between align-center">
            <v-avatar color="rgba(255,255,255,.14)" size="46"
              ><v-icon color="#D7ED63">mdi-tree</v-icon></v-avatar
            >
            <v-btn
              icon="mdi-close"
              variant="text"
              color="white"
              aria-label="Fechar detalhes do relatório"
              @click="reportDialog = false"
            />
          </div>
          <div class="mt-5">
            <div class="report-detail-eyebrow">REGISTRO DE MANEJO</div>
            <h2 class="text-h5 font-weight-bold mt-1">
              {{ selectedReport.tree?.species?.commonName || 'Árvore sem identificação' }}
            </h2>
            <p class="mb-0 text-body-2 text-white">
              {{
                selectedReport.tree?.species?.scientificName || 'Espécie científica não informada'
              }}
            </p>
          </div>
          <v-chip
            class="report-detail-type"
            :color="getTypeColor(selectedReport.type)"
            size="small"
            variant="flat"
            >{{ getTypeLabel(selectedReport.type) }}</v-chip
          >
        </header>
        <v-card-text class="report-detail-content">
          <h3 class="text-subtitle-2 font-weight-bold mb-3">Dados da intervenção</h3>
          <div class="report-detail-grid">
            <div class="report-detail-tile">
              <v-icon color="green-darken-2">mdi-calendar-month-outline</v-icon>
              <div>
                <span>Data de execução</span
                ><strong>{{ formatDateFull(selectedReport.date) }}</strong>
              </div>
            </div>
            <div class="report-detail-tile">
              <v-icon color="green-darken-2">mdi-account-hard-hat-outline</v-icon>
              <div>
                <span>Responsável</span
                ><strong>{{ selectedReport.user?.name || 'Não informado' }}</strong>
              </div>
            </div>
            <div class="report-detail-tile">
              <v-icon color="green-darken-2">mdi-map-marker-outline</v-icon>
              <div>
                <span>Localização</span
                ><strong>{{ formatCoordinates(selectedReport.tree) }}</strong>
              </div>
            </div>
            <div class="report-detail-tile">
              <v-icon color="green-darken-2">mdi-leaf</v-icon>
              <div>
                <span>Vigor da árvore</span
                ><strong>{{ selectedReport.tree?.vigor || 'Não informado' }}</strong>
              </div>
            </div>
          </div>
          <section class="report-detail-notes mt-5">
            <div class="d-flex align-center ga-2 mb-2">
              <v-icon color="green-darken-2">mdi-clipboard-text-outline</v-icon>
              <h3 class="text-subtitle-2 font-weight-bold">Ações e observações</h3>
            </div>
            <p class="mb-0">
              {{
                selectedReport.observations?.trim() ||
                'Nenhuma observação foi registrada nesta intervenção.'
              }}
            </p>
          </section>
        </v-card-text>
        <v-card-actions class="report-detail-actions"
          ><v-btn
            variant="text"
            color="green-darken-2"
            class="text-none font-weight-bold"
            @click="reportDialog = false"
            >Fechar detalhes</v-btn
          ></v-card-actions
        >
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="showError" color="error" timeout="5000">
      {{ errorMessage }}
      <template #actions>
        <v-btn variant="text" @click="showError = false">Fechar</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import PageHeader from '@/components/shared/PageHeader.vue'
import { apiConnect } from '@/plugins/apiConnect'

interface ReportTree {
  latitude?: number | null
  longitude?: number | null
  vigor?: string | null
  species?: { commonName?: string | null; scientificName?: string | null } | null
}

interface PruningReport {
  idTree?: string | null
  date?: string | Date | null
  type?: string | null
  observations?: string | null
  user?: { name?: string | null } | null
  tree?: ReportTree | null
}

export default defineComponent({
  name: 'ReportsPage',
  components: { PageHeader },

  data() {
    return {
      prunings: [] as PruningReport[],
      loading: true,
      showError: false,
      errorMessage: '',
      reportDialog: false,
      selectedReport: null as PruningReport | null,

      headers: [
        { title: 'Árvore', key: 'tree', sortable: false },
        { title: 'Data', key: 'date', sortable: true },
        { title: 'Tipo', key: 'type', sortable: true },
        { title: 'Observações', key: 'observations', sortable: false },
        { title: 'Ações', key: 'actions', sortable: false, align: 'center' as const },
      ],

      periodChartData: [
        { label: 'Jan', value: 65, color: '#C5E11F' },
        { label: 'Fev', value: 45, color: '#9ed013' },
        { label: 'Mar', value: 80, color: '#C5E11F' },
        { label: 'Abr', value: 55, color: '#9ed013' },
        { label: 'Mai', value: 70, color: '#C5E11F' },
        { label: 'Jun', value: 40, color: '#9ed013' },
      ],
    }
  },

  computed: {
    totalPrunings(): number {
      return this.prunings.length
    },

    thisMonthPrunings(): number {
      const now = new Date()
      return this.prunings.filter((p) => {
        if (!p.date) return false
        const d = new Date(p.date)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      }).length
    },

    totalTreesPruned(): number {
      const uniqueTrees = new Set(this.prunings.map((p) => p.idTree))
      return uniqueTrees.size
    },

    activeTeams(): number {
      return 3 // Mock - seria calculado de dados reais
    },

    pruningStats(): { label: string; value: number; color: string }[] {
      const types: Record<string, { label: string; color: string }> = {
        LIGHT: { label: 'Leve', color: '#81C784' },
        MODERATE: { label: 'Moderada', color: '#FFB74D' },
        HEAVY: { label: 'Pesada', color: '#E57373' },
      }

      const count: Record<string, number> = { LIGHT: 0, MODERATE: 0, HEAVY: 0 }
      this.prunings.forEach((p) => {
        if (p.type && p.type in count) {
          count[p.type] = (count[p.type] || 0) + 1
        }
      })

      const total = this.prunings.length
      if (total === 0) return []

      return Object.keys(count).map((type) => {
        const typeInfo = types[type]
        const typeCount = count[type] || 0
        return {
          label: typeInfo?.label || type,
          value: Math.round((typeCount / total) * 100),
          color: typeInfo?.color || '#ccc',
        }
      })
    },

    pieChartStyle(): { background: string } {
      const stats = this.pruningStats
      if (stats.length === 0) return { background: '#f0f0f0' }

      let gradient = 'conic-gradient('
      let accumulated = 0

      stats.forEach((stat, i) => {
        const start = accumulated
        accumulated += stat.value
        gradient += `${stat.color} ${start}% ${accumulated}%`
        if (i < stats.length - 1) gradient += ', '
      })

      gradient += ')'
      return { background: gradient }
    },
  },

  mounted() {
    this.loadPrunings()
  },

  methods: {
    async loadPrunings() {
      this.loading = true
      try {
        const response = await apiConnect.get<PruningReport[]>('/pruning')
        this.prunings = response.data || []
      } catch (error: unknown) {
        console.error('Erro ao carregar podas:', error)
        const apiError = error as { response?: { data?: { message?: string } } }
        this.errorMessage = apiError.response?.data?.message || 'Erro ao carregar relatórios'
        this.showError = true
      } finally {
        this.loading = false
      }
    },

    formatDate(date: string | Date | null | undefined): string {
      if (!date) return '—'
      const d = new Date(date)
      if (Number.isNaN(d.getTime())) return 'Data inválida'
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    },

    getTypeColor(type?: string | null): string {
      const colors: Record<string, string> = {
        LIGHT: 'blue',
        MODERATE: 'orange',
        HEAVY: 'green',
      }
      return colors[type || ''] || 'grey'
    },

    getTypeLabel(type?: string | null): string {
      const labels: Record<string, string> = {
        LIGHT: 'Leve',
        MODERATE: 'Moderada',
        HEAVY: 'Pesada',
      }
      return labels[type || ''] || type || 'Não informado'
    },

    viewDetails(item: PruningReport) {
      this.selectedReport = item
      this.reportDialog = true
    },

    formatDateFull(date: string | Date | null | undefined): string {
      if (!date) return '—'
      const parsed = new Date(date)
      if (Number.isNaN(parsed.getTime())) return 'Data inválida'
      return parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    },

    formatCoordinates(tree?: ReportTree | null): string {
      const latitude = tree?.latitude
      const longitude = tree?.longitude
      if (
        typeof latitude !== 'number' ||
        !Number.isFinite(latitude) ||
        typeof longitude !== 'number' ||
        !Number.isFinite(longitude)
      )
        return 'Localização não informada'
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
    },

    downloadReport(item: PruningReport) {
      console.log('Download relatório:', item)
    },
  },
})
</script>

<style scoped>
/* Cards KPI */
.kpi-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 16px;
  height: 100%;
  transition: all 0.2s ease;
}

.kpi-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.kpi-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.kpi-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #666;
}

.kpi-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #333;
  line-height: 1;
}

.kpi-subtitle {
  font-size: 0.75rem;
  color: #888;
  margin-top: 4px;
}

/* Cards de Gráficos */
.chart-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  padding: 20px;
  height: 100%;
}

.chart-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #c5e11f 0%, #9ed013 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-placeholder {
  height: 250px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bar-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 200px;
  width: 100%;
  padding: 0 20px;
  border-bottom: 1px solid #e0e0e0;
}

.bar-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 12%;
}

.bar {
  width: 100%;
  border-radius: 4px 4px 0 0;
  transition: all 0.3s ease;
}

.bar-label {
  font-size: 0.75rem;
  color: #666;
  margin-top: 8px;
}

/* Card de Relatório */
.report-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  padding: 24px;
}

.section-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #c5e11f 0%, #9ed013 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.report-table :deep(th) {
  font-weight: 600 !important;
  color: #555 !important;
  font-size: 0.8rem !important;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.report-table :deep(td) {
  padding-top: 12px !important;
  padding-bottom: 12px !important;
}

/* Gráfico de Pizza CSS */
.pie-chart-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 250px;
  gap: 24px;
}

.pie-chart {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  position: relative;
}

.pie-legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.legend-label {
  font-size: 0.85rem;
  color: #555;
}

.legend-value {
  font-size: 0.85rem;
  font-weight: 700;
  color: #333;
  margin-left: auto;
}

.report-detail-dialog {
  overflow: hidden;
  border: 1px solid rgba(34, 69, 45, 0.12);
  box-shadow: 0 24px 70px rgba(15, 35, 23, 0.24) !important;
}
.report-detail-hero {
  position: relative;
  padding: 24px 28px 28px;
  color: #fff;
  background:
    radial-gradient(circle at 92% 8%, rgba(197, 225, 31, 0.22), transparent 31%),
    linear-gradient(125deg, #173d2a 0%, #245a39 58%, #367044 100%);
}
.report-detail-hero h2 {
  padding-right: 126px;
}
.report-detail-eyebrow {
  color: #d7ed63;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.14em;
}
.report-detail-type {
  position: absolute;
  right: 28px;
  bottom: 28px;
  font-weight: 700;
}
.report-detail-content {
  padding: 24px 28px;
  background: #f7f9f5;
}
.report-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.report-detail-tile {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1px solid #e8ede5;
  border-radius: 14px;
  background: #fff;
}
.report-detail-tile div {
  display: grid;
  min-width: 0;
  gap: 3px;
}
.report-detail-tile span {
  color: #778278;
  font-size: 0.7rem;
  font-weight: 650;
}
.report-detail-tile strong {
  overflow-wrap: anywhere;
  color: #25372b;
  font-size: 0.85rem;
  font-weight: 650;
}
.report-detail-notes {
  padding: 16px;
  border: 1px solid #e1e9cf;
  border-left: 4px solid #a7c92b;
  border-radius: 14px;
  background: linear-gradient(120deg, #f1f6e5, #fbfcf8 72%);
}
.report-detail-notes p {
  padding: 13px 14px;
  border: 1px solid #e8ede5;
  border-radius: 10px;
  background: white;
  color: #37463a;
  font-size: 0.86rem;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.report-detail-actions {
  justify-content: flex-end;
  padding: 8px 20px 18px;
  background: #f7f9f5;
}
@media (max-width: 520px) {
  .report-detail-hero {
    padding: 20px;
  }
  .report-detail-type {
    right: 20px;
    bottom: 20px;
  }
  .report-detail-content {
    padding: 20px 16px;
  }
  .report-detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
