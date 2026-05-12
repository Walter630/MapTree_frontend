<template>
  <v-container class="pt-3 pb-6 px-6">
    <!-- ===== Cabeçalho ===== -->
    <v-row align="center" class="mb-8">
      <v-col cols="12">
        <p class="text-caption text-grey-darken-1 mb-1">Meu Painel</p>
        <p class="text-h6 font-weight-regular mb-0">
          Olá, {{ user?.name || 'Usuário' }}, Aqui Está o Resumo de Suas Operações.
        </p>
      </v-col>
    </v-row>

    <!-- ===== Cards de Resumo Modernos ===== -->
    <v-row class="mt-6" dense>
      <v-col cols="6" md="3">
        <v-card class="kpi-card" flat>
          <div class="kpi-header">
            <span class="kpi-label">Árvores</span>
            <v-icon size="20" color="green-darken-2">mdi-tree</v-icon>
          </div>
          <div class="kpi-value">{{ countTrees }}</div>
          <div class="kpi-subtitle">Cadastradas</div>
        </v-card>
      </v-col>

      <v-col cols="6" md="3">
        <v-card class="kpi-card" flat>
          <div class="kpi-header">
            <span class="kpi-label">Podas</span>
            <v-icon size="20" color="blue-darken-2">mdi-content-cut</v-icon>
          </div>
          <div class="kpi-value">{{ countPrunings }}</div>
          <div class="kpi-subtitle">Realizadas</div>
        </v-card>
      </v-col>

      <v-col cols="6" md="3">
        <v-card class="kpi-card" :class="{ 'kpi-card--danger': countCritical > 0 }" flat>
          <div class="kpi-header">
            <span class="kpi-label">Áreas Críticas</span>
            <v-icon size="20" :color="countCritical > 0 ? 'error' : 'grey'">mdi-alert</v-icon>
          </div>
          <div class="kpi-value" :class="{ 'text-error': countCritical > 0 }">{{ countCritical }}</div>
          <div class="kpi-subtitle">Em risco</div>
        </v-card>
      </v-col>

      <v-col cols="6" md="3">
        <v-card class="kpi-card" flat>
          <div class="kpi-header">
            <span class="kpi-label">Espécies</span>
            <v-icon size="20" color="orange-darken-2">mdi-sprout</v-icon>
          </div>
          <div class="kpi-value">{{ countSpecies }}</div>
          <div class="kpi-subtitle">Catalogadas</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- ===== Seção: Mapa + Gráfico + Alertas ===== -->
    <v-row class="mb-6 mt-10" dense>
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
              style="height: 260px; width: 100%;"
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
          <v-skeleton-loader height="260" type="image" class="rounded-lg" />
        </v-card>
      </v-col>

      <!-- Árvores em risco -->
      <v-col cols="12" md="4">
        <v-card class="risk-list-card" flat>
          <div class="risk-list-header">
            <div class="d-flex align-center">
              <div class="risk-list-icon mr-3">
                <v-icon size="22" color="white">mdi-alert</v-icon>
              </div>
              <div>
                <p class="risk-title mb-0">Árvores em Risco</p>
                <p class="risk-subtitle mb-0">{{ filteredTrees.length }} árvores precisam de atenção</p>
              </div>
            </div>
          </div>

          <div class="risk-list-content">
            <div v-if="filteredTrees.length === 0" class="text-center text-grey py-8">
              <v-icon size="48" color="grey-lighten-1">mdi-tree-outline</v-icon>
              <p class="text-body-2 mt-3">Nenhuma árvore em risco no momento</p>
            </div>

            <div v-else class="alerts-container">
              <v-card
                v-for="tree in filteredTrees"
                :key="tree.id"
                class="alert-card-premium pa-3 mb-2"
                flat
                @click="focusTree(tree)"
              >
                <div class="d-flex align-center justify-space-between mb-2">
                  <div class="d-flex align-center">
                    <v-icon size="18" color="red-darken-2" class="mr-2">
                      {{ statusIcons[tree.status] || 'mdi-alert' }}
                    </v-icon>
                    <span class="text-subtitle-2 font-weight-bold text-truncate" style="max-width: 140px;">
                      {{ tree.species?.commonName || 'Espécie não identificada' }}
                    </span>
                  </div>
                  <v-icon size="16" color="grey-lighten-1">mdi-chevron-right</v-icon>
                </div>

                <v-chip
                  size="x-small"
                  color="error"
                  variant="flat"
                  class="mb-2"
                >
                  {{ statusLabels[tree.status] || tree.status }}
                </v-chip>

                <div class="d-flex align-center text-caption text-grey-darken-2">
                  <v-icon size="14" class="mr-1">mdi-map-marker</v-icon>
                  {{ tree.latitude?.toFixed(5) }}, {{ tree.longitude?.toFixed(5) }}
                </div>
              </v-card>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- ===== Seção: Relatórios ===== -->
    <v-row dense>
      <v-col cols="12">
        <!-- Header da seção -->
        <div class="d-flex align-center mb-4">
          <div class="section-icon mr-3">
            <v-icon size="22" color="white">mdi-clipboard-text</v-icon>
          </div>
          <span class="text-h6 font-weight-bold">Últimas Podas Realizadas</span>
        </div>

        <!-- Loading -->
        <v-card v-if="loading" class="pa-8 text-center" flat>
          <v-progress-circular indeterminate color="green" size="48" />
          <p class="mt-4 text-grey">Carregando podas...</p>
        </v-card>

        <!-- Tabela de Podas -->
        <v-card v-else class="pruning-card" flat>
          <div class="d-flex align-center justify-space-between mb-4">
            <span class="text-subtitle-1 font-weight-bold">Histórico de Podas</span>
            <v-chip size="small" color="grey-lighten-3">{{ prunings.length }} registros</v-chip>
          </div>

          <div v-if="prunings.length === 0" class="text-center text-grey py-8">
            <v-icon size="48" color="grey-lighten-1">mdi-clipboard-text-outline</v-icon>
            <p class="text-body-1 mt-3">Nenhuma poda registrada ainda</p>
            <v-btn
              color="#C5E11F"
              variant="flat"
              class="mt-3 text-none font-weight-bold"
              @click="goToPruningRegistration"
            >
              Registrar Primeira Poda
            </v-btn>
          </div>

          <v-data-table
            v-else
            :items="recentPrunings"
            :headers="pruningHeaders"
            :items-per-page="5"
            density="comfortable"
            class="pruning-table"
            no-data-text="Nenhuma poda encontrada"
          >
            <!-- Árvore -->
            <template #item.tree="{ item }">
              <div class="d-flex align-center">
                <v-icon size="18" color="green-darken-2" class="mr-2">mdi-tree</v-icon>
                <span class="text-body-2 font-weight-medium">
                  {{ item.tree?.species?.commonName || 'Árvore #' + item.idTree?.slice(-4) }}
                </span>
              </div>
            </template>

            <!-- Localização -->
            <template #item.location="{ item }">
              <div v-if="item.tree?.latitude" class="text-caption text-grey-darken-1">
                {{ item.tree.latitude.toFixed(4) }}, {{ item.tree.longitude.toFixed(4) }}
              </div>
              <span v-else class="text-caption text-grey">—</span>
            </template>

            <!-- Tipo -->
            <template #item.type="{ item }">
              <v-chip
                :color="getPruningTypeColor(item.type)"
                size="small"
                variant="flat"
                class="font-weight-medium"
              >
                {{ getPruningTypeLabel(item.type) }}
              </v-chip>
            </template>

            <!-- Data -->
            <template #item.date="{ item }">
              <span class="text-body-2">{{ formatDate(item.date) }}</span>
            </template>

            <!-- Status da Árvore -->
            <template #item.treeStatus="{ item }">
              <v-chip
                v-if="item.tree?.status"
                :color="getStatusColor(item.tree.status)"
                size="small"
                variant="flat"
                class="font-weight-medium"
              >
                {{ statusLabels[item.tree.status] || item.tree.status }}
              </v-chip>
              <span v-else class="text-caption text-grey">—</span>
            </template>

            <!-- Observações -->
            <template #item.observations="{ item }">
              <span class="text-caption text-grey-darken-1 text-truncate" style="max-width: 180px; display: block;">
                {{ item.observations || '—' }}
              </span>
            </template>

            <!-- Ações -->
            <template #item.actions="{ item }">
              <v-btn
                icon
                size="small"
                variant="text"
                color="primary"
                @click="viewPruningDetails(item)"
              >
                <v-icon size="18">mdi-eye</v-icon>
              </v-btn>
            </template>
          </v-data-table>

          <!-- Ver todas -->
          <div v-if="prunings.length > 5" class="d-flex justify-center mt-4">
            <v-btn
              variant="text"
              color="primary"
              class="text-none"
              @click="goToPruningList"
            >
              Ver todas as podas
              <v-icon end>mdi-arrow-right</v-icon>
            </v-btn>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import MiniMap from '@/components/functions/MapsView/MiniMap.vue'
import { useAuth } from '@/hooks/useAuth'

/* ===================================
   TIPOS
=================================== */

interface Species {
  id: string
  commonName: string
  scientificName: string
  family: string
  description: string
}

/** Árvore como vem da API (lat/lng + speciesId) */
interface TreeApi {
  id: string
  age: string | Date
  lat: number
  lng: number
  latitude?: number
  longitude?: number
  status: 'TO_PRUNE' | 'UNDER_OBSERVATION' | 'NORMAL' | 'PRUNED'
  speciesId?: string
  idSpecies?: string
  species?: Species
}

/** Árvore normalizada para uso no template */
interface Tree {
  id: string
  age: string | Date
  latitude: number
  longitude: number
  status: 'TO_PRUNE' | 'UNDER_OBSERVATION' | 'NORMAL' | 'PRUNED'
  species?: Species
}

interface User {
  id: string | number
  name: string
  email?: string
  role?: string
}

/** Poda como vem da API */
interface PruningApi {
  id?: string
  idTree: string
  tree?: TreeApi
  idUser: string
  user?: User
  date?: string | Date
  observations: string
  type: 'LIGHT' | 'MODERATE' | 'HEAVY'
}

/** Poda enriquecida com dados completos */
interface Pruning {
  id?: string
  idTree: string
  tree?: Tree
  idUser: string
  user?: User
  date?: string | Date
  observations: string
  type: 'LIGHT' | 'MODERATE' | 'HEAVY'
}

/* ===================================
   CONSTANTES
=================================== */

const STATUS_LABELS: Record<string, string> = {
  TO_PRUNE: 'Precisa de Poda',
  UNDER_OBSERVATION: 'Em Observação',
  NORMAL: 'Normal',
  PRUNED: 'Podada',
}

const STATUS_ICONS: Record<string, string> = {
  TO_PRUNE: 'mdi-alert-circle',
  UNDER_OBSERVATION: 'mdi-eye-outline',
  NORMAL: 'mdi-check-circle',
  PRUNED: 'mdi-content-cut',
}

const PRUNING_COLORS: Record<string, string> = {
  LIGHT: '#0D47A1',
  MODERATE: '#E65100',
  HEAVY: '#1B5E20',
}

const PRUNING_LABELS: Record<string, string> = {
  LIGHT: 'Leve',
  MODERATE: 'Moderada',
  HEAVY: 'Pesada',
}

const TREE_STATUS_COLORS: Record<string, string> = {
  TO_PRUNE: '#E65100',
  UNDER_OBSERVATION: '#F9A825',
  NORMAL: '#2E7D32',
  PRUNED: '#0D47A1',
}

/* ===================================
   COMPONENTE
=================================== */

export default defineComponent({
  name: 'UserHomeView',

  components: { MiniMap },

  data() {
    return {
      search: '',
      user: null as User | null,
      trees: null as Tree[] | null,
      species: null as Species[] | null,
      filteredTrees: [] as Tree[],
      prunings: [] as Pruning[],
      loading: false,

      // Contadores
      countTrees: 0,
      countPrunings: 0,
      countSpecies: 0,
      countCritical: 0,

      // Cores e labels
      pruningColors: PRUNING_COLORS,
      pruningLabels: PRUNING_LABELS,
      treeStatusColors: TREE_STATUS_COLORS,
      statusLabels: STATUS_LABELS,
      statusIcons: STATUS_ICONS,

      // Headers da tabela de podas
      pruningHeaders: [
        { title: 'Árvore', key: 'tree', sortable: false },
        { title: 'Localização', key: 'location', sortable: false },
        { title: 'Tipo', key: 'type', sortable: true },
        { title: 'Data', key: 'date', sortable: true },
        { title: 'Status', key: 'treeStatus', sortable: false },
        { title: 'Observações', key: 'observations', sortable: false },
        { title: 'Ações', key: 'actions', sortable: false, align: 'center' as const },
      ],

      // Auto-refresh
      refreshInterval: null as ReturnType<typeof setInterval> | null,
    }
  },

  computed: {
    /** Retorna apenas as 5 podas mais recentes */
    recentPrunings(): Pruning[] {
      return [...this.prunings]
        .sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0
          const dateB = b.date ? new Date(b.date).getTime() : 0
          return dateB - dateA
        })
        .slice(0, 5)
    },
  },

  mounted() {
    this.loadAllData()
    // Atualiza os dados a cada 30 segundos
    this.refreshInterval = setInterval(() => this.loadAllData(), 30_000)
  },

  beforeUnmount() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
      this.refreshInterval = null
    }
  },

  methods: {
    async loadAllData() {
      this.getUser()
      // Carrega árvores e espécies primeiro, depois podas (para enriquecer)
      await Promise.all([this.getTrees(), this.getSpecies()])
      await this.getPrunings()
    },

    performSearch() {
      console.log('Pesquisando:', this.search)
    },

    goToMap() {
      this.$router.push('/user/mapUser')
    },

    /** Normaliza a árvore da API (lat/lng → latitude/longitude) e junta espécie */
    normalizeTree(raw: TreeApi): Tree {
      const lat = raw.latitude ?? raw.lat ?? 0
      const lng = raw.longitude ?? raw.lng ?? 0
      const speciesId = raw.speciesId ?? raw.idSpecies

      // Tenta encontrar a espécie pelo ID
      let species = raw.species
      if (!species && speciesId && this.species) {
        species = this.species.find((s) => s.id === speciesId)
      }

      return {
        id: raw.id,
        age: raw.age,
        latitude: lat,
        longitude: lng,
        status: raw.status,
        species,
      }
    },

    /** Enriquece uma poda com os dados completos de árvore e espécie */
    enrichPruning(raw: PruningApi): Pruning {
      let tree: Tree | undefined

      // Se a API já devolveu a árvore dentro da poda, normaliza
      if (raw.tree) {
        tree = this.normalizeTree(raw.tree)
      }

      // Se não veio ou veio sem espécie, tenta buscar na lista de árvores já carregadas
      if (!tree && raw.idTree && this.trees) {
        tree = this.trees.find((t) => t.id === raw.idTree)
      }

      // Se achou a árvore mas falta a espécie, tenta preencher
      if (tree && !tree.species && this.species) {
        const speciesId = (raw.tree as any)?.speciesId ?? (raw.tree as any)?.idSpecies
        if (speciesId) {
          tree = { ...tree, species: this.species.find((s) => s.id === speciesId) }
        }
      }

      return {
        id: raw.id,
        idTree: raw.idTree,
        tree,
        idUser: raw.idUser,
        user: raw.user,
        date: raw.date,
        observations: raw.observations,
        type: raw.type,
      }
    },

    /* ---------- Chamadas API ---------- */

    async getSpecies() {
      try {
        const response = await this.$api.get<Species[]>('/species')
        this.species = response.data
        this.countSpecies = this.species.length
      } catch (error) {
        console.error('Erro ao buscar espécies:', error)
      }
    },

    async getPrunings() {
      try {
        const response = await this.$api.get<PruningApi[]>('/pruning')
        this.prunings = response.data.map((p) => this.enrichPruning(p))
        this.countPrunings = this.prunings.length
      } catch (error) {
        console.error('Erro ao buscar podas:', error)
      }
    },

    async getTrees() {
      try {
        const response = await this.$api.get<TreeApi[]>('/trees')
        this.trees = response.data.map((t) => this.normalizeTree(t))
        this.countTrees = this.trees.length
        this.filteredTrees = this.trees.filter(
          (t) => t.status === 'TO_PRUNE' || t.status === 'UNDER_OBSERVATION',
        )
        this.countCritical = this.filteredTrees.length
      } catch (error) {
        console.error('Erro ao buscar árvores:', error)
      }
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

    /* ---------- Navegação ---------- */

    goToPruningRegistration() {
      this.$router.push('/user/podas/nova')
    },

    goToPruningList() {
      this.$router.push('/user/podas')
    },

    viewPruningDetails(item: Pruning) {
      console.log('Ver detalhes da poda:', item)
      // this.$router.push(`/user/podas/${item.id}`)
    },

    focusTree(tree: Tree) {
      // Centraliza o mapa na árvore selecionada
      if (this.$refs.miniMapRef) {
        const mapRef = this.$refs.miniMapRef as any
        if (mapRef.map && tree.latitude && tree.longitude) {
          mapRef.map.flyTo([tree.latitude, tree.longitude], 17, { duration: 1.5 })
        }
      }
      console.log('Focar na árvore:', tree)
    },

    /* ---------- Helpers ---------- */

    getPruningTypeColor(type: string): string {
      const colors: Record<string, string> = {
        LIGHT: 'blue',
        MODERATE: 'orange',
        HEAVY: 'green',
      }
      return colors[type] || 'grey'
    },

    getPruningTypeLabel(type: string): string {
      const labels: Record<string, string> = {
        LIGHT: 'Leve',
        MODERATE: 'Moderada',
        HEAVY: 'Pesada',
      }
      return labels[type] || type
    },

    getStatusColor(status: string): string {
      const colors: Record<string, string> = {
        TO_PRUNE: 'error',
        UNDER_OBSERVATION: 'warning',
        NORMAL: 'success',
        PRUNED: 'info',
      }
      return colors[status] || 'grey'
    },

    formatDate(date: string | Date | undefined): string {
      if (!date) return '—'
      const d = new Date(date)
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
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
  height: 100%;
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
  margin-bottom: 12px;
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

/* ===== Seção de Relatórios ===== */
.section-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #C5E11F 0%, #9ed013 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.pruning-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  padding: 24px;
}

.pruning-table :deep(th) {
  font-weight: 600 !important;
  color: #555 !important;
  font-size: 0.8rem !important;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.pruning-table :deep(td) {
  padding-top: 12px !important;
  padding-bottom: 12px !important;
}

/* ===== Mapa de Risco Premium ===== */
.risk-map-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #e0e0e0;
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
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #ff5252 0%, #c80c34 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(200, 12, 52, 0.3);
}

.risk-title {
  font-size: 1rem;
  font-weight: 700;
  color: #333;
}

.risk-subtitle {
  font-size: 0.8rem;
  color: #666;
}

.risk-map-container {
  position: relative;
}

.risk-overlay-badge {
  position: absolute;
  bottom: 12px;
  left: 12px;
  z-index: 10;
}

/* ===== Lista de Riscos Premium ===== */
.risk-list-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  height: 100%;
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
  background: linear-gradient(135deg, #ff5252 0%, #c80c34 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.risk-list-content {
  flex: 1;
  overflow-y: auto;
  max-height: 320px;
  padding: 12px;
}

.alerts-container::-webkit-scrollbar {
  width: 4px;
}

.alerts-container::-webkit-scrollbar-thumb {
  background: #e0e0e0;
  border-radius: 4px;
}

.alert-card-premium {
  border: 1px solid rgba(200, 12, 52, 0.1);
  background: linear-gradient(135deg, #ffffff 0%, #fff5f5 100%);
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05) !important;
  cursor: pointer;
}

.alert-card-premium:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(200, 12, 52, 0.1) !important;
}

/* ===== Seções ===== */
.section-card {
  border: 1px solid #cdcdcd;
  background-color: #f6f6f6;
  border-radius: 12px;
  height: 100%;
}

.section-card-white {
  border: 1px solid #cdcdcd;
  background-color: white;
  border-radius: 12px;
  height: 100%;
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

.trees-risk-list {
  scrollbar-width: thin;
  scrollbar-color: #c0c0c0 transparent;
}

.trees-risk-list::-webkit-scrollbar {
  width: 5px;
}

.trees-risk-list::-webkit-scrollbar-thumb {
  background-color: #c0c0c0;
  border-radius: 4px;
}

/* ===== Tabela de Relatórios ===== */
.report-table {
  background-color: #f6f6f6 !important;
}

.report-table :deep(td) {
  color: #212121 !important;
  font-weight: 500;
}

.report-table :deep(th) {
  color: #424242 !important;
  font-weight: 700 !important;
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
  border: none;
  box-shadow: none;
  color: #ffffff !important;
  font-weight: 700;
}

/* ===== Busca ===== */
.search-input :deep(.v-field__append-inner) {
  align-items: center;
  padding-top: 0;
  padding-bottom: 0;
  margin-left: 0;
}

/* ===== Responsivo ===== */
@media (max-width: 960px) {
  .card-resumo {
    min-height: 120px;
  }

  .trees-risk-list {
    max-height: 240px !important;
  }
}
</style>
