<template>
  <v-container fluid class="dash">
    <!-- ===== Cabeçalho ===== -->
    <div class="dash-header">
      <div>
        <h1 class="dash-hello">Olá, {{ user?.name || 'Funcionário' }}!</h1>
        <p class="dash-sub">Aqui está o resumo das suas operações de campo.</p>
      </div>
      <div class="dash-header-actions">
        <v-chip class="dash-date-chip" variant="outlined" prepend-icon="mdi-calendar-blank-outline">
          {{ todayLabel }}
        </v-chip>
        <v-btn
          color="blue-darken-2"
          variant="tonal"
          class="dash-ghost-btn text-none"
          prepend-icon="mdi-map-marker-path"
          @click="goToRoutes"
        >
          Minhas rotas
        </v-btn>
        <v-btn
          color="green-darken-2"
          class="dash-create-btn text-none"
          prepend-icon="mdi-content-cut"
          @click="goToPruningRegistration"
        >
          Registrar poda
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
        <div class="kpi-foot kpi-foot--up">
          <v-icon size="13">mdi-arrow-up</v-icon> cadastro ativo
        </div>
      </div>

      <div class="kpi">
        <div class="kpi-top">
          <div class="kpi-ico kpi-ico--green">
            <v-icon color="green-darken-2">mdi-check-circle-outline</v-icon>
          </div>
          <span class="kpi-name">Podas realizadas</span>
        </div>
        <div class="kpi-num">
          {{ pruningsLoading || pruningsLoadFailed ? '—' : countPrunings.toLocaleString('pt-BR') }}
        </div>
        <div class="kpi-foot kpi-foot--up"><v-icon size="13">mdi-arrow-up</v-icon> no total</div>
      </div>

      <div class="kpi" :class="{ 'kpi--danger': countCritical > 0 }">
        <div class="kpi-top">
          <div class="kpi-ico kpi-ico--red"><v-icon color="red-darken-1">mdi-alert</v-icon></div>
          <span class="kpi-name">Precisam de ação</span>
        </div>
        <div class="kpi-num" :class="{ 'text-red-darken-1': countCritical > 0 }">
          {{ countCritical.toLocaleString('pt-BR') }}
        </div>
        <div class="kpi-foot kpi-foot--danger">
          <v-icon size="13">mdi-alert-circle-outline</v-icon> prioridade
        </div>
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

          <v-btn
            color="green-darken-2"
            class="text-none"
            size="small"
            variant="tonal"
            prepend-icon="mdi-arrow-expand-all"
            @click="goToMap"
          >
            Abrir mapa completo
          </v-btn>
        </div>
        <div class="map-wrap">
          <MiniMap
            ref="miniMapRef"
            :trees="trees || []"
            :priority-ids="filteredTrees.map((tree) => tree.id)"
            :loading="trees === null && !treeLoadFailed"
            :failed="treeLoadFailed"
            @select-trees="selectedMapIds = $event"
            style="height: 100%; width: 100%"
          />
        </div>
      </div>

      <!-- Alertas de prioridade -->
      <div class="panel alerts-panel">
        <div class="panel-head">
          <div class="panel-title">
            <v-icon size="20" color="red-darken-1" class="mr-2">mdi-alert-circle-outline</v-icon>
            Árvores que precisam de ação
          </div>
          <a class="panel-link" @click="goToMap">Ver todos →</a>
        </div>

        <div class="alerts-tools">
          <div v-if="selectedMapIds.length" class="map-selection-note">
            <span>Seleção do mapa · {{ alertTrees.length }} prioridade(s)</span>
            <v-btn size="x-small" variant="text" color="green-darken-3" @click="selectedMapIds = []"
              >Limpar seleção</v-btn
            >
          </div>
          <v-text-field
            v-model="alertSearch"
            placeholder="Buscar por código ou coordenada"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            hide-details
            clearable
          />
        </div>

        <div class="alerts-list">
          <div
            v-for="tree in alertTrees"
            :key="tree.id"
            class="alert-row"
            @click="focusTree(tree)"
            role="button"
            tabindex="0"
            @keydown.enter="focusTree(tree)"
            @keydown.space.prevent="focusTree(tree)"
          >
            <v-avatar size="42" rounded="lg" class="alert-thumb">
              <v-icon :color="tree.status === 'TO_PRUNE' ? 'orange-darken-2' : 'red-darken-1'"
                >mdi-tree</v-icon
              >
            </v-avatar>
            <div class="alert-info">
              <div class="alert-line1">
                <span class="alert-code">#{{ treeCode(tree) }}</span>
                <v-chip
                  :color="tree.status === 'TO_PRUNE' ? 'orange' : 'red'"
                  size="x-small"
                  variant="flat"
                  class="font-weight-bold"
                >
                  {{ statusLabels[tree.status] || tree.status }}
                </v-chip>
              </div>
              <span class="alert-name">{{ tree.species?.commonName || 'Árvore' }}</span>
              <span class="alert-coords">
                <v-icon size="11">mdi-map-marker</v-icon>
                {{ (tree.latitude || 0).toFixed(4) }}, {{ (tree.longitude || 0).toFixed(4) }}
              </span>
            </div>
            <v-icon size="18" color="grey-lighten-1">mdi-chevron-right</v-icon>
          </div>

          <div v-if="alertTrees.length === 0 && filteredTrees.length > 0" class="alerts-empty">
            <v-icon size="40" color="grey-lighten-1">mdi-magnify-close</v-icon>
            <p>Nenhuma prioridade para esta seleção ou busca</p>
          </div>
          <div v-else-if="filteredTrees.length === 0" class="alerts-empty">
            <v-icon size="40" color="green-lighten-2">mdi-shield-check</v-icon>
            <p>Nenhuma árvore em risco no momento</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== Linha inferior: Espécies + Relatórios ===== -->
    <div class="bottom-row">
      <SpeciesCatalogCard
        :species="species || []"
        map-path="/user/mapUser"
        :loading="loadingSpecies"
        :failed="speciesLoadFailed"
        @retry="getSpecies"
      />
      <!-- Minhas podas recentes -->
      <div class="panel reports-panel">
        <div class="panel-head">
          <div class="panel-title">
            <v-icon size="18" color="blue-darken-2" class="mr-2"
              >mdi-clipboard-text-clock-outline</v-icon
            >
            Últimas podas realizadas
          </div>
          <a class="panel-link" @click="goToPruningList">Ver todas →</a>
        </div>
        <div class="reports-box">
          <div
            v-for="report in recentPrunings"
            :key="report.id"
            class="report-row"
            @click="viewPruningDetails(report)"
          >
            <v-avatar :color="getPruningTypeColor(report.type)" size="34" rounded="lg" class="mr-3">
              <v-icon color="white" size="16">mdi-content-cut</v-icon>
            </v-avatar>
            <div class="report-info">
              <span class="report-nm">{{
                report.tree?.species?.commonName || 'Árvore #' + report.idTree?.slice(-4)
              }}</span>
              <span class="report-dt">{{ formatDate(report.date) }}</span>
            </div>
            <v-chip
              :color="getPruningTypeColor(report.type)"
              size="x-small"
              variant="tonal"
              class="font-weight-bold"
            >
              {{ getPruningTypeLabel(report.type) }}
            </v-chip>
          </div>
          <div v-if="pruningsLoading" class="alerts-empty">
            <v-progress-circular indeterminate color="green-darken-2" size="32" />
            <p>Carregando podas...</p>
          </div>
          <div v-else-if="pruningsLoadFailed" class="alerts-empty">
            <v-icon size="40" color="grey-lighten-2">mdi-cloud-alert-outline</v-icon>
            <p>Não foi possível carregar as podas. Tente atualizar a página.</p>
          </div>
          <div v-else-if="prunings.length === 0" class="alerts-empty">
            <v-icon size="40" color="grey-lighten-2">mdi-clipboard-off-outline</v-icon>
            <p>Nenhuma poda registrada ainda</p>
            <v-btn
              color="green-darken-2"
              variant="tonal"
              size="small"
              class="text-none mt-2"
              @click="goToPruningRegistration"
            >
              Registrar primeira poda
            </v-btn>
          </div>
        </div>
      </div>
    </div>
  </v-container>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import MiniMap from '@/components/functions/MapsView/MiniMap.vue'
import { useAuth } from '@/hooks/useAuth'
import SpeciesCatalogCard from '@/components/shared/SpeciesCatalogCard.vue'
import { isTreeForPruning, prioritizeTrees } from '@/utils/treePriority'

/* ===================================
   TIPOS
=================================== */

interface Species {
  _count?: { Tree?: number; trees?: number }
  id: string
  commonName: string
  scientificName: string
  family: string
  description: string
}

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
  TO_PRUNE: 'Precisa de poda',
  UNDER_OBSERVATION: 'Em observação',
  NORMAL: 'Normal',
  PRUNED: 'Podada',
}

const STATUS_ICONS: Record<string, string> = {
  TO_PRUNE: 'mdi-alert-circle',
  UNDER_OBSERVATION: 'mdi-eye-outline',
  NORMAL: 'mdi-check-circle',
  PRUNED: 'mdi-content-cut',
}

/* ===================================
   COMPONENTE
=================================== */

export default defineComponent({
  name: 'UserHomeView',

  components: { SpeciesCatalogCard, MiniMap },

  setup() {
    return { auth: useAuth() }
  },
  data() {
    return {
      user: null as User | null,
      trees: null as Tree[] | null,
      species: null as Species[] | null,
      loadingSpecies: true,
      speciesLoadFailed: false,
      treeLoadFailed: false,
      selectedMapIds: [] as string[],
      filteredTrees: [] as Tree[],
      prunings: [] as Pruning[],
      loading: false,
      pruningsLoading: true,
      pruningsLoadFailed: false,

      // Busca na lista de alertas
      alertSearch: '',

      // Contadores
      countTrees: 0,
      countPrunings: 0,
      countSpecies: 0,
      countCritical: 0,

      // Labels/ícones
      statusLabels: STATUS_LABELS,
      statusIcons: STATUS_ICONS,

      // Auto-refresh
      refreshInterval: null as ReturnType<typeof setInterval> | null,
    }
  },

  computed: {
    todayLabel(): string {
      const now = new Date()
      const data = now.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
      const dia = now.toLocaleDateString('pt-BR', { weekday: 'long' })
      return `${data} · ${dia.charAt(0).toUpperCase() + dia.slice(1)}`
    },

    /** 5 podas mais recentes */
    recentPrunings(): Pruning[] {
      return [...this.prunings]
        .sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0
          const dateB = b.date ? new Date(b.date).getTime() : 0
          return dateB - dateA
        })
        .slice(0, 5)
    },

    /** Lista de alertas com busca por código/coordenada */
    alertTrees(): Tree[] {
      const mapSelection = this.selectedMapIds
      const q = this.alertSearch?.trim().toLowerCase()
      const list = mapSelection.length
        ? this.filteredTrees.filter((tree) => mapSelection.includes(tree.id))
        : this.filteredTrees
      if (!q) return list
      return list.filter((t) => {
        const code = this.treeCode(t).toLowerCase()
        const lat = (t.latitude || 0).toFixed(4)
        const lng = (t.longitude || 0).toFixed(4)
        return (
          code.includes(q) || lat.includes(q) || lng.includes(q) || `${lat}, ${lng}`.includes(q)
        )
      })
    },
  },

  mounted() {
    this.loadAllData()
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
      await Promise.all([this.getTrees(), this.getSpecies()])
      await this.getPrunings()
    },

    treeCode(tree: Tree): string {
      const id = String(tree.id ?? '')
      return id ? id.slice(-4).toUpperCase() : '----'
    },

    goToMap() {
      this.$router.push('/user/mapUser')
    },

    goToRoutes() {
      this.$router.push('/user/routes/daily')
    },

    /** Normaliza a árvore da API (lat/lng → latitude/longitude) e junta espécie */
    normalizeTree(raw: TreeApi): Tree {
      const lat = Number(raw.latitude ?? raw.lat)
      const lng = Number(raw.longitude ?? raw.lng)
      const speciesId = raw.speciesId ?? raw.idSpecies

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

    /** Enriquece uma poda com dados completos de árvore/espécie */
    enrichPruning(raw: PruningApi): Pruning {
      let tree: Tree | undefined

      if (raw.tree) {
        tree = this.normalizeTree(raw.tree)
      }
      if (!tree && raw.idTree && this.trees) {
        tree = this.trees.find((t) => t.id === raw.idTree)
      }
      if (tree && !tree.species && this.species) {
        const speciesId = raw.tree?.speciesId ?? raw.tree?.idSpecies
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
      this.loadingSpecies = true
      this.speciesLoadFailed = false
      try {
        const catalog = []
        const limit = 100
        for (let page = 1; ; page++) {
          const { data } = await this.$api.get<Species[]>('/species', { params: { page, limit } })
          catalog.push(...data)
          if (data.length < limit) break
        }
        this.species = catalog
        this.countSpecies = catalog.length
      } catch {
        this.speciesLoadFailed = true
      } finally {
        this.loadingSpecies = false
      }
    },

    async getPrunings() {
      this.pruningsLoading = true
      this.pruningsLoadFailed = false
      try {
        const response = await this.$api.get<PruningApi[]>('/pruning')
        this.prunings = (response.data || []).map((p) => this.enrichPruning(p))
        this.countPrunings = this.prunings.length
      } catch (error) {
        this.pruningsLoadFailed = true
        console.error('Erro ao buscar podas:', error)
      } finally {
        this.pruningsLoading = false
      }
    },

    async getTrees() {
      this.treeLoadFailed = false
      try {
        const response = await this.$api.get<TreeApi[]>('/trees')
        this.trees = response.data.map((t) => this.normalizeTree(t))
        this.countTrees = this.trees.length
        const prioritized = prioritizeTrees(this.trees).filter((item) =>
          isTreeForPruning(item.tree),
        )
        this.filteredTrees = prioritized.map((item) => item.tree)
        this.countCritical = this.filteredTrees.length
      } catch (error) {
        this.treeLoadFailed = true
        console.error('Erro ao buscar árvores:', error)
      }
    },

    getUser() {
      this.auth
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
      this.$router.push('/user/podas')
      void item
    },

    focusTree(tree: Tree) {
      const mapRef = this.$refs.miniMapRef as
        { focusOn?: (lat: number, lng: number) => void } | undefined
      const latitude = Number(tree.latitude)
      const longitude = Number(tree.longitude)
      if (mapRef?.focusOn && Number.isFinite(latitude) && Number.isFinite(longitude)) {
        mapRef.focusOn(latitude, longitude)
      }
    },

    /* ---------- Helpers ---------- */

    getPruningTypeColor(type: string): string {
      const colors: Record<string, string> = {
        LIGHT: 'blue-darken-2',
        MODERATE: 'orange-darken-1',
        HEAVY: 'green-darken-1',
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

    formatDate(date: string | Date | undefined): string {
      if (!date) return '—'
      const d = new Date(date)
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    },
  },
})
</script>

<style scoped>
.map-selection-note {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 0.75rem;
  color: #345941;
  margin-bottom: 8px;
}
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

.dash-ghost-btn,
.dash-create-btn {
  height: 44px;
  border-radius: 10px;
  font-weight: 700;
}

.dash-create-btn {
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

.kpi-ico--green {
  background: #e9f6ea;
}
.kpi-ico--red {
  background: #fdecec;
}
.kpi-ico--blue {
  background: #e7f1fb;
}

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

.kpi-foot--up {
  color: #2e7d32;
}
.kpi-foot--danger {
  color: #d32f2f;
}

/* ===== Painéis ===== */
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

.panel-link:hover {
  text-decoration: underline;
}

/* ===== Linha principal ===== */
.main-row {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.map-panel {
  height: auto;
}

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

.dot-crit {
  background: #e53935;
}
.dot-high {
  background: #fb8c00;
}
.dot-med {
  background: #fbc02d;
}

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
.alerts-panel {
  height: 440px;
}

.alerts-tools {
  padding: 12px 16px 8px;
  border-bottom: 1px solid #f1f3f5;
}

.alerts-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
  min-height: 0;
}

.alerts-list::-webkit-scrollbar {
  width: 4px;
}
.alerts-list::-webkit-scrollbar-thumb {
  background: #e0e0e0;
  border-radius: 4px;
}

.alert-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.alert-row:hover {
  background: #f6f8fa;
}

.alert-thumb {
  background: #f3f4f6;
}

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
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.reports-box {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 300px;
  overflow-y: auto;
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

.report-row:hover {
  background: #f6f8fa;
}

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

.panel {
  min-width: 0;
}
.panel-head {
  flex-wrap: wrap;
  gap: 8px;
}
.dash-header > div {
  min-width: 0;
  overflow-wrap: anywhere;
}

/* ===== Responsivo ===== */
@media (max-width: 1100px) {
  .main-row {
    grid-template-columns: 1fr;
  }
  .map-panel {
    height: auto;
  }
  .alerts-panel {
    height: 400px;
  }
  .bottom-row {
    grid-template-columns: 1fr;
  }
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .kpi-grid {
    grid-template-columns: 1fr;
  }
  .dash {
    padding: 16px 14px 32px;
  }
}
</style>
