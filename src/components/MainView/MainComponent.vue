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
          <p class="card-info">Cadastradas</p>
        </v-card>
      </v-col>

      <v-col cols="12" md="3">
        <v-card class="card-resumo">
          <div class="card-header"><span>Podas</span><v-icon>mdi-content-cut</v-icon></div>
          <p class="card-numero">{{ countPrunings }}</p>
          <p class="card-info">Realizadas</p>
        </v-card>
      </v-col>

      <v-col cols="12" md="3">
        <v-card class="card-resumo" :class="{ 'card-resumo--danger': countCritical > 0 }">
          <div class="card-header"><span>Áreas Críticas</span><v-icon>mdi-alert</v-icon></div>
          <p class="card-numero">{{ countCritical }}</p>
          <p class="card-info">Em risco</p>
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
          <v-btn icon @click="goToMap" class="mt-2"><v-icon>mdi-map</v-icon></v-btn>
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
        <v-card class="pa-4 section-card-white d-flex flex-column" flat>
          <p class="section-title">
            <v-icon class="mr-2">mdi-alert-outline</v-icon>
            Árvores em risco
          </p>

          <div v-if="treesFiltradas.length === 0" class="text-center text-grey py-6">
            <v-icon size="40" color="grey-lighten-1">mdi-tree-outline</v-icon>
            <p class="text-body-2 mt-2">Nenhuma árvore em risco no momento</p>
          </div>

          <div class="trees-risk-list flex-grow-1" style="overflow-y: auto; max-height: 320px;">
            <v-card
              v-for="tree in treesFiltradas"
              :key="tree.id"
              class="pa-3 mb-2 rounded-lg alert-card"
              flat
            >
              <div class="d-flex align-center mb-1">
                <v-icon size="18" color="red-darken-2" class="mr-2">
                  {{ statusIcons[tree.status] || 'mdi-alert' }}
                </v-icon>
                <span class="text-subtitle-2 font-weight-bold">
                  {{ tree.species?.commonName || 'Espécie não identificada' }}
                </span>
              </div>

              <v-chip
                size="x-small"
                color="#C62828"
                variant="flat"
                class="mb-2"
                style="color: #fff !important; font-weight: 600;"
              >
                {{ statusLabels[tree.status] || tree.status }}
              </v-chip>

              <div class="d-flex align-center text-caption text-grey-darken-2">
                <v-icon size="14" class="mr-1">mdi-map-marker</v-icon>
                {{ tree.latitude?.toFixed(5) }}, {{ tree.longitude?.toFixed(5) }}
              </div>
            </v-card>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- ===== Seção: Relatórios ===== -->
    <v-row dense align="stretch">
      <v-col cols="12">
        <v-card class="pa-4 section-card" style="box-shadow: none">
          <p class="text-subtitle-1 font-weight-bold mb-4">Últimos Relatórios de Poda</p>

          <div v-if="prunings.length === 0" class="text-center text-grey py-6">
            <v-icon size="40" color="grey-lighten-1">mdi-clipboard-text-outline</v-icon>
            <p class="text-body-2 mt-2">Nenhum relatório de poda encontrado</p>
          </div>

          <v-table v-else class="report-table">
            <thead>
              <tr>
                <th class="text-left text-caption text-grey-darken-1 font-weight-medium py-3">Árvore</th>
                <th class="text-left text-caption text-grey-darken-1 font-weight-medium py-3">Localização</th>
                <th class="text-left text-caption text-grey-darken-1 font-weight-medium py-3">Tipo de Poda</th>
                <th class="text-left text-caption text-grey-darken-1 font-weight-medium py-3">Status da Árvore</th>
                <th class="text-left text-caption text-grey-darken-1 font-weight-medium py-3">Observações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="report in prunings" :key="report.idTree">
                <!-- Árvore: nome popular + descrição -->
                <td class="py-3">
                  <div class="d-flex align-center">
                    <v-icon size="20" color="green-darken-2" class="mr-2">mdi-tree</v-icon>
                    <div>
                      <span class="text-body-2 font-weight-bold">
                        {{ report.tree?.species?.commonName ?? 'Não identificada' }}
                      </span>
                      <p
                        v-if="report.tree?.species?.description"
                        class="text-caption text-grey-darken-1 mb-0"
                        style="max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
                      >
                        {{ report.tree.species.description }}
                      </p>
                    </div>
                  </div>
                </td>

                <!-- Localização -->
                <td class="py-3 text-body-2">
                  <div class="d-flex align-center">
                    <v-icon size="16" color="grey-darken-1" class="mr-1">mdi-map-marker</v-icon>
                    <span v-if="report.tree?.latitude && report.tree?.longitude">
                      {{ report.tree.latitude.toFixed(5) }}, {{ report.tree.longitude.toFixed(5) }}
                    </span>
                    <span v-else class="text-grey">Sem localização</span>
                  </div>
                </td>

                <!-- Tipo de Poda em português -->
                <td class="py-3">
                  <v-chip
                    :style="`background-color: ${pruningColors[report.type]}; color: #ffffff !important;`"
                    variant="flat"
                    size="small"
                    class="type-chip"
                  >
                    {{ pruningLabels[report.type] || report.type }}
                  </v-chip>
                </td>

                <!-- Status da Árvore em português -->
                <td class="py-3">
                  <v-chip
                    v-if="report.tree?.status"
                    :style="`background-color: ${treeStatusColors[report.tree.status]}; color: #ffffff !important;`"
                    variant="flat"
                    size="small"
                    class="type-chip"
                  >
                    {{ statusLabels[report.tree.status] || report.tree.status }}
                  </v-chip>
                  <span v-else class="text-caption text-grey">—</span>
                </td>

                <!-- Observações -->
                <td class="py-3 text-body-2" style="max-width: 250px;">
                  {{ report.observations || '—' }}
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

  components: { PruningMap },

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
      countCritical: 0,

      // Cores e labels
      pruningColors: PRUNING_COLORS,
      pruningLabels: PRUNING_LABELS,
      treeStatusColors: TREE_STATUS_COLORS,
      statusLabels: STATUS_LABELS,
      statusIcons: STATUS_ICONS,

      // Auto-refresh
      refreshInterval: null as ReturnType<typeof setInterval> | null,
    }
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
        this.treesFiltradas = this.trees.filter(
          (t) => t.status === 'TO_PRUNE' || t.status === 'UNDER_OBSERVATION',
        )
        this.countCritical = this.treesFiltradas.length
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
  },
})
</script>

<style scoped>
/* ===== Cards de Resumo ===== */
.card-resumo {
  background: #f6f6f6;
  border: 1px solid #cdcdcd;
  min-height: 150px;
  height: 100%;
  border-radius: 8px;
  padding: 15px;
  box-shadow: none;
  display: flex;
  flex-direction: column;
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

.card-resumo--danger {
  background: #fef2f2;
  border-color: #f5c6cb;
}

.card-resumo--danger .card-numero {
  color: #C62828;
}

.card-resumo--danger .card-header {
  color: #C62828;
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
