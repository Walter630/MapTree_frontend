<template>
  <v-container fluid class="dash">
    <!-- ===== Cabeçalho ===== -->
    <div class="dash-header">
      <div>
        <h1 class="dash-hello">Olá, {{ user?.name || 'Gestor' }}!</h1>
        <p class="dash-sub">Aqui está o resumo das operações da sua equipe.</p>
      </div>
      <div class="dash-header-actions">
        <v-chip class="dash-date-chip" variant="outlined" prepend-icon="mdi-calendar-blank-outline">
          {{ todayLabel }}
        </v-chip>
        <v-select
          v-model="selectedRegion"
          :items="regionOptions"
          item-title="label"
          item-value="value"
          variant="outlined"
          density="compact"
          hide-details
          prepend-inner-icon="mdi-map-marker-radius-outline"
          class="dash-filter"
        />
        <v-select
          v-model="selectedTeam"
          :items="teamOptions"
          item-title="label"
          item-value="value"
          variant="outlined"
          density="compact"
          hide-details
          prepend-inner-icon="mdi-account-group-outline"
          class="dash-filter"
        />
        <v-btn color="green-darken-2" class="dash-create-btn text-none" prepend-icon="mdi-map-marker-path" @click="goToCreateRoute">
          Criar rota
        </v-btn>
      </div>
    </div>

    <!-- ===== KPIs ===== -->
    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-top">
          <div class="kpi-ico kpi-ico--green"><v-icon color="green-darken-2">mdi-tree</v-icon></div>
          <span class="kpi-name">Árvores cadastradas</span>
        </div>
        <div class="kpi-num">{{ countTrees.toLocaleString('pt-BR') }}</div>
        <div class="kpi-foot kpi-foot--up"><v-icon size="13">mdi-arrow-up</v-icon> cadastro ativo</div>
      </div>

      <div class="kpi">
        <div class="kpi-top">
          <div class="kpi-ico kpi-ico--green"><v-icon color="green-darken-2">mdi-check-circle-outline</v-icon></div>
          <span class="kpi-name">Podas realizadas</span>
        </div>
        <div class="kpi-num">{{ countPrunings.toLocaleString('pt-BR') }}</div>
        <div class="kpi-foot kpi-foot--up"><v-icon size="13">mdi-arrow-up</v-icon> no total</div>
      </div>

      <div class="kpi" :class="{ 'kpi--danger': countCritical > 0 }">
        <div class="kpi-top">
          <div class="kpi-ico kpi-ico--red"><v-icon color="red-darken-1">mdi-alert</v-icon></div>
          <span class="kpi-name">Áreas críticas</span>
        </div>
        <div class="kpi-num" :class="{ 'text-red-darken-1': countCritical > 0 }">{{ countCritical.toLocaleString('pt-BR') }}</div>
        <div class="kpi-foot kpi-foot--danger"><v-icon size="13">mdi-alert-circle-outline</v-icon> em risco</div>
      </div>

      <div class="kpi">
        <div class="kpi-top">
          <div class="kpi-ico kpi-ico--blue"><v-icon color="blue-darken-2">mdi-sprout</v-icon></div>
          <span class="kpi-name">Espécies</span>
        </div>
        <div class="kpi-num">{{ countSpecies.toLocaleString('pt-BR') }}</div>
        <div class="kpi-foot kpi-foot--up"><v-icon size="13">mdi-leaf</v-icon> catalogadas</div>
      </div>
    </div>

    <!-- ===== Linha principal: Mapa + Alertas ===== -->
    <div class="main-row">
      <!-- Mapa operacional -->
      <div class="panel map-panel">
        <div class="panel-head">
          <div class="panel-title">
            <v-icon size="20" color="green-darken-2" class="mr-2">mdi-map-outline</v-icon>
            Mapa operacional
          </div>
          <div class="map-legend">
            <span><i class="dot dot-crit" />Crítico</span>
            <span><i class="dot dot-high" />Alta</span>
            <span><i class="dot dot-med" />Média</span>
          </div>
        </div>
        <div class="map-wrap">
          <MiniMap
            ref="miniMapRef"
            filter-status="TO_PRUNE"
            style="height: 100%; width: 100%;"
          />
          <v-btn
            color="green-darken-2"
            class="map-open-btn text-none"
            prepend-icon="mdi-arrow-expand-all"
            @click="goToMap"
          >
            Abrir rota completa
          </v-btn>
        </div>
      </div>

      <!-- Alertas de prioridade -->
      <div class="panel alerts-panel">
        <div class="panel-head">
          <div class="panel-title">
            <v-icon size="20" color="red-darken-1" class="mr-2">mdi-alert-circle-outline</v-icon>
            Alertas de prioridade
          </div>
          <a class="panel-link" @click="goToMap">Ver todos →</a>
        </div>

        <div class="alerts-tools">
          <v-text-field
            v-model="alertSearch"
            placeholder="Buscar por código ou coordenada"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            hide-details
            clearable
          />
          <div class="alerts-chips">
            <v-chip
              v-for="opt in alertFilters"
              :key="opt.value"
              :color="alertFilter === opt.value ? 'green-darken-2' : undefined"
              :variant="alertFilter === opt.value ? 'flat' : 'tonal'"
              size="small"
              class="font-weight-medium"
              @click="alertFilter = opt.value"
            >
              {{ opt.label }}
            </v-chip>
          </div>
        </div>

        <div class="alerts-list">
          <div
            v-for="tree in alertTrees"
            :key="tree.id"
            class="alert-row"
            @click="focusOnTree(tree)"
          >
            <v-avatar size="42" rounded="lg" class="alert-thumb">
              <v-icon :color="tree.status === 'TO_PRUNE' ? 'orange-darken-2' : 'red-darken-1'">mdi-tree</v-icon>
            </v-avatar>
            <div class="alert-info">
              <div class="alert-line1">
                <span class="alert-code">#{{ treeCode(tree) }}</span>
                <v-chip :color="tree.status === 'TO_PRUNE' ? 'orange' : 'red'" size="x-small" variant="flat" class="font-weight-bold">
                  {{ tree.status === 'TO_PRUNE' ? 'Alta' : 'Crítico' }}
                </v-chip>
              </div>
              <span class="alert-name">{{ tree.species?.commonName || 'Árvore' }}</span>
              <span class="alert-coords">
                <v-icon size="11">mdi-map-marker</v-icon>
                {{ (tree.lat || tree.latitude || 0).toFixed(4) }}, {{ (tree.lng || tree.longitude || 0).toFixed(4) }}
              </span>
            </div>
            <v-icon size="18" color="grey-lighten-1">mdi-chevron-right</v-icon>
          </div>

          <div v-if="alertTrees.length === 0 && filteredTrees.length > 0" class="alerts-empty">
            <v-icon size="40" color="grey-lighten-1">mdi-magnify-close</v-icon>
            <p>Nenhuma árvore para esta busca</p>
          </div>
          <div v-else-if="filteredTrees.length === 0" class="alerts-empty">
            <v-icon size="40" color="green-lighten-2">mdi-shield-check</v-icon>
            <p>Sem alertas pendentes</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== Linha inferior: Espécies + Podas + Relatórios ===== -->
    <div class="bottom-row">
      <!-- Espécies por localidade -->
      <div class="panel">
        <div class="panel-head">
          <div class="panel-title">
            <v-icon size="18" color="green-darken-2" class="mr-2">mdi-leaf</v-icon>
            Espécies por localidade
          </div>
        </div>
        <div class="species-box">
          <div v-for="spec in topSpecies" :key="spec.id" class="species-row">
            <div class="species-left">
              <div class="species-dot"><v-icon size="16" color="green-darken-2">mdi-tree</v-icon></div>
              <span class="species-nm">{{ spec.commonName || spec.scientificName }}</span>
            </div>
            <div class="species-right">
              <div class="species-bar">
                <div class="species-bar-fill" :style="{ width: speciesPercent(spec) + '%' }" />
              </div>
              <span class="species-qt">{{ (spec._count?.trees || 0) }}</span>
            </div>
          </div>
          <div v-if="topSpecies.length === 0" class="alerts-empty">
            <v-icon size="40" color="grey-lighten-2">mdi-leaf-off</v-icon>
            <p>Sem dados de espécies</p>
          </div>
        </div>
      </div>

      <!-- Podas no mês -->
      <div class="panel">
        <div class="panel-head">
          <div class="panel-title">
            <v-icon size="18" color="green-darken-2" class="mr-2">mdi-chart-line</v-icon>
            Podas no mês
          </div>
        </div>
        <div class="chart-box">
          <PruningChart />
        </div>
      </div>

      <!-- Relatórios de poda recentes -->
      <div class="panel">
        <div class="panel-head">
          <div class="panel-title">
            <v-icon size="18" color="blue-darken-2" class="mr-2">mdi-clipboard-text-clock-outline</v-icon>
            Relatórios de poda recentes
          </div>
          <a class="panel-link" @click="showAllReports = true">Ver todos →</a>
        </div>
        <div class="reports-box">
          <div
            v-for="report in prunings.slice(0, 5)"
            :key="report.id"
            class="report-row"
            @click="viewReportDetails(report)"
          >
            <v-avatar :color="getPruningColor(report.type)" size="34" rounded="lg" class="mr-3">
              <v-icon color="white" size="16">mdi-content-cut</v-icon>
            </v-avatar>
            <div class="report-info">
              <span class="report-nm">{{ report.tree?.species?.commonName || 'Árvore #' + report.idTree.slice(-4) }}</span>
              <span class="report-dt">{{ formatDateFull(report.date) }}</span>
            </div>
            <v-chip :color="getPruningColor(report.type)" size="x-small" variant="tonal" class="font-weight-bold">
              {{ report.type || 'REGULAR' }}
            </v-chip>
          </div>
          <div v-if="prunings.length === 0" class="alerts-empty">
            <v-icon size="40" color="grey-lighten-2">mdi-clipboard-off-outline</v-icon>
            <p>Nenhum relatório ainda</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== DIALOG: árvore prioritária ===== -->
    <v-dialog v-model="alertTreeDialog" max-width="460">
      <v-card v-if="selectedAlertTree" class="alert-tree-dialog rounded-xl">
        <v-card-title class="d-flex align-center pa-5">
          <v-avatar color="red-lighten-5" class="mr-3"><v-icon color="error">mdi-tree-alert</v-icon></v-avatar>
          <div>
            <p class="text-overline mb-0 text-grey-darken-1">Árvore prioritária</p>
            <h2 class="text-h6 font-weight-bold">{{ selectedAlertTree.species?.commonName || `Árvore #${treeCode(selectedAlertTree)}` }}</h2>
          </div>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" aria-label="Fechar detalhes" @click="alertTreeDialog = false" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-alert type="warning" variant="tonal" density="comfortable" class="mb-4">
            <strong>{{ selectedAlertTree.status === 'CRITICAL' ? 'Risco crítico' : 'Poda prioritária' }}</strong><br />
            Esta árvore foi selecionada para intervenção. Confira a localização antes de iniciar o trabalho.
          </v-alert>
          <v-row dense>
            <v-col cols="6"><span class="detail-label">Código</span><strong>#{{ treeCode(selectedAlertTree) }}</strong></v-col>
            <v-col cols="6"><span class="detail-label">Status</span><v-chip size="small" color="error" variant="tonal">{{ selectedAlertTree.status }}</v-chip></v-col>
            <v-col cols="12"><span class="detail-label">Localização</span><strong>{{ Number(selectedAlertTree.lat ?? selectedAlertTree.latitude ?? 0).toFixed(5) }}, {{ Number(selectedAlertTree.lng ?? selectedAlertTree.longitude ?? 0).toFixed(5) }}</strong></v-col>
          </v-row>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-btn variant="text" class="text-none" @click="alertTreeDialog = false">Fechar</v-btn>
          <v-spacer />
          <v-btn color="blue-darken-2" variant="flat" prepend-icon="mdi-map" @click="goToMap(); alertTreeDialog = false">Ver no mapa</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ===== DIALOG: detalhes do relatório ===== -->
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
import { isTreeForPruning, prioritizeTrees } from '@/utils/treePriority'

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
  status: 'TO_PRUNE' | 'UNDER_OBSERVATION' | 'NORMAL' | 'PRUNED' | 'CRITICAL'
  species?: { commonName?: string; scientificName?: string }
  vigor?: string
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

/* ===================================
   COMPONENTE
=================================== */

export default defineComponent({
  name: 'ManagerHomeView',

  components: { MiniMap, PruningChart },

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
      alertTreeDialog: false,
      selectedAlertTree: null as Tree | null,
      showAllReports: false,
      selectedReport: null as any,

      // Filtros do cabeçalho (região / equipe)
      selectedRegion: 'ALL' as string,
      selectedTeam: 'ALL' as string,
      regionOptions: [{ label: 'Todas as regiões', value: 'ALL' }] as { label: string; value: string }[],
      teamOptions: [{ label: 'Todas as equipes', value: 'ALL' }] as { label: string; value: string }[],

      // Lista de alertas: busca e filtro
      alertSearch: '',
      alertFilter: 'ALL' as 'ALL' | 'TO_PRUNE' | 'CRITICAL',
      alertFilters: [
        { label: 'Todas', value: 'ALL' },
        { label: 'Poda urgente', value: 'TO_PRUNE' },
        { label: 'Crítico', value: 'CRITICAL' },
      ] as { label: string; value: 'ALL' | 'TO_PRUNE' | 'CRITICAL' }[],
    }
  },

  mounted() {
    this.getUser()
    this.getTrees()
    this.getSpecies()
    this.getPrunings()
    this.loadFilters()
  },

  computed: {
    todayLabel(): string {
      const now = new Date()
      const data = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
      const dia = now.toLocaleDateString('pt-BR', { weekday: 'long' })
      return `${data} · ${dia.charAt(0).toUpperCase() + dia.slice(1)}`
    },

    /** Lista de alertas após aplicar filtro de tipo + busca por código/coordenada */
    alertTrees(): Tree[] {
      let list = this.filteredTrees

      if (this.alertFilter === 'TO_PRUNE') {
        list = list.filter((t) => t.status === 'TO_PRUNE')
      } else if (this.alertFilter === 'CRITICAL') {
        list = list.filter((t) => t.status !== 'TO_PRUNE')
      }

      const q = this.alertSearch?.trim().toLowerCase()
      if (q) {
        list = list.filter((t) => {
          const code = this.treeCode(t).toLowerCase()
          const lat = (t.lat || t.latitude || 0).toFixed(4)
          const lng = (t.lng || t.longitude || 0).toFixed(4)
          return code.includes(q) || lat.includes(q) || lng.includes(q) || `${lat}, ${lng}`.includes(q)
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

    /** Percentual da espécie em relação ao total de árvores (barra) */
    speciesPercent(spec: any): number {
      const qt = spec._count?.trees || 0
      const total = this.countTrees || 1
      return Math.min(Math.round((qt / total) * 100), 100)
    },

    goToMap() {
      this.$router.push('/manager/map')
    },

    goToCreateRoute() {
      this.$router.push('/manager/routes/daily')
    },

    /** Carrega opções de região (API) e equipes (funcionários da organização) */
    loadFilters() {
      // Regiões reais do backend
      this.$api
        .getRegions()
        .then((res) => {
          const regions = (res.data || []).map((r) => ({ label: r.name, value: r.slug || r.id }))
          this.regionOptions = [{ label: 'Todas as regiões', value: 'ALL' }, ...regions]
        })
        .catch(() => {
          // Mantém só "Todas as regiões" se o endpoint não responder
        })

      // Equipes: por enquanto derivadas dos funcionários da organização
      this.$api
        .get<Array<{ name?: string; role?: string }>>('/users')
        .then((res) => {
          const names = Array.from(
            new Set((res.data || []).filter((u) => u?.name).map((u) => u.name as string)),
          ).slice(0, 20)
          this.teamOptions = [
            { label: 'Todas as equipes', value: 'ALL' },
            ...names.map((n) => ({ label: n, value: n })),
          ]
        })
        .catch(() => {
          // Mantém só "Todas as equipes"
        })
    },

    focusOnTree(tree: Tree) {
      this.selectedAlertTree = tree
      this.alertTreeDialog = true
      this.$nextTick(() => {
        if (this.miniMapRef && (tree.lat || tree.latitude)) {
          this.miniMapRef.focusOn(tree.lat || tree.latitude, tree.lng || tree.longitude)
        }
      })
    },

    formatDate(dateStr: any) {
      if (!dateStr) return '-'
      const d = new Date(dateStr)
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    },

    formatDateFull(dateStr: any) {
      if (!dateStr) return '-'
      const d = new Date(dateStr)
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
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
            lng: Number(t.lng ?? t.longitude ?? 0),
          }))
          this.trees = allTrees
          this.countTrees = allTrees.length
          this.countCritical = allTrees.filter((t: any) => t.status === 'TO_PRUNE' || t.status === 'CRITICAL').length
          const prioritized = prioritizeTrees(allTrees).filter((item) => isTreeForPruning(item.tree))
          this.filteredTrees = prioritized.map((item) => item.tree)
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
/* ===== Container ===== */
.dash {
  padding: 20px 24px 40px;
  background: #f7f8fa;
  min-height: calc(100dvh - 56px);
  max-width: 1440px;
  margin: 0 auto;
}

/* ===== Cabeçalho ===== */
.dash-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 20px;
}

.dash-hello {
  font-size: 1.5rem;
  font-weight: 800;
  color: #1e293b;
  line-height: 1.2;
}

.dash-sub {
  font-size: 0.9rem;
  color: #64748b;
  margin-top: 2px;
}

.dash-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.dash-date-chip {
  background: #fff;
  font-size: 0.8rem;
}

.dash-filter {
  min-width: 180px;
  max-width: 200px;
  background: #fff;
  border-radius: 10px;
}

.dash-filter :deep(.v-field) {
  border-radius: 10px;
  font-size: 0.85rem;
}

.dash-create-btn {
  height: 44px;
  border-radius: 10px;
  font-weight: 700;
  box-shadow: 0 4px 14px rgba(46, 125, 50, 0.25);
}

/* ===== KPIs ===== */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 18px;
}

.kpi {
  background: #fff;
  border: 1px solid #eceef1;
  border-radius: 16px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.kpi--danger {
  background: linear-gradient(135deg, #fff6f6 0%, #ffffff 60%);
  border-color: #f3c9c9;
}

.kpi-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.kpi-ico {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.kpi-ico--green { background: #e9f6ea; }
.kpi-ico--red { background: #fdecec; }
.kpi-ico--blue { background: #e7f1fb; }

.kpi-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: #64748b;
}

.kpi-num {
  font-size: 1.9rem;
  font-weight: 800;
  color: #1e293b;
  line-height: 1;
}

.kpi-foot {
  font-size: 0.72rem;
  display: flex;
  align-items: center;
  gap: 3px;
}

.kpi-foot--up { color: #2e7d32; }
.kpi-foot--danger { color: #d32f2f; }

/* ===== Painéis genéricos ===== */
.panel {
  background: #fff;
  border: 1px solid #eceef1;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #f1f3f5;
}

.panel-title {
  display: flex;
  align-items: center;
  font-size: 0.95rem;
  font-weight: 700;
  color: #1e293b;
}

.panel-link {
  font-size: 0.78rem;
  font-weight: 600;
  color: #2e7d32;
  cursor: pointer;
}

.panel-link:hover { text-decoration: underline; }

/* ===== Linha principal ===== */
.main-row {
  display: grid;
  grid-template-columns: 1.7fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.map-panel { height: 440px; }

.map-legend {
  display: flex;
  gap: 14px;
  font-size: 0.72rem;
  color: #64748b;
}

.map-legend span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: inline-block;
}

.dot-crit { background: #e53935; }
.dot-high { background: #fb8c00; }
.dot-med { background: #fbc02d; }

.map-wrap {
  position: relative;
  flex: 1;
  min-height: 0;
}

.map-open-btn {
  position: absolute;
  bottom: 14px;
  right: 14px;
  z-index: 10;
  border-radius: 10px;
  font-weight: 600;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
}

/* ===== Alertas ===== */
.alerts-panel { height: 440px; }

.alerts-tools {
  padding: 12px 16px 8px;
  border-bottom: 1px solid #f1f3f5;
}

.alerts-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.alerts-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
  min-height: 0;
}

.alerts-list::-webkit-scrollbar { width: 4px; }
.alerts-list::-webkit-scrollbar-thumb { background: #e0e0e0; border-radius: 4px; }

.alert-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.alert-row:hover { background: #f6f8fa; }

.alert-thumb { background: #f3f4f6; }

.alert-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.alert-line1 {
  display: flex;
  align-items: center;
  gap: 6px;
}

.alert-code {
  font-size: 0.72rem;
  font-weight: 700;
  font-family: monospace;
  color: #475569;
}

.alert-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: #1e293b;
}

.alert-coords {
  font-size: 0.72rem;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 2px;
}

.alerts-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 180px;
  color: #94a3b8;
  text-align: center;
  gap: 6px;
  font-size: 0.85rem;
}

/* ===== Linha inferior ===== */
.bottom-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.species-box,
.reports-box {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 300px;
  overflow-y: auto;
}

.chart-box {
  padding: 16px;
  height: 300px;
}

/* Espécies */
.species-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.species-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.species-dot {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: #eaf6e6;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.species-nm {
  font-size: 0.85rem;
  font-weight: 600;
  color: #334155;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.species-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.species-bar {
  width: 70px;
  height: 6px;
  background: #eef1f4;
  border-radius: 4px;
  overflow: hidden;
}

.species-bar-fill {
  height: 100%;
  background: #2e7d32;
  border-radius: 4px;
}

.species-qt {
  font-size: 0.78rem;
  font-weight: 700;
  color: #475569;
  min-width: 28px;
  text-align: right;
}

/* Relatórios */
.report-row {
  display: flex;
  align-items: center;
  padding: 8px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.report-row:hover { background: #f6f8fa; }

.report-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.report-nm {
  font-size: 0.85rem;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.report-dt {
  font-size: 0.72rem;
  color: #94a3b8;
}

/* Dialogs */
.alert-tree-dialog .detail-label {
  display: block;
  margin-bottom: 4px;
  color: #64748b;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.glass-card {
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.95) !important;
}

/* ===== Responsivo ===== */
@media (max-width: 1100px) {
  .main-row { grid-template-columns: 1fr; }
  .map-panel, .alerts-panel { height: 400px; }
  .bottom-row { grid-template-columns: 1fr; }
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 600px) {
  .kpi-grid { grid-template-columns: 1fr; }
  .dash { padding: 16px 14px 32px; }
}
</style>
