<template>
  <v-container fluid class="page-shell">
    <PageHeader
      title="Podas"
      subtitle="Consulte o serviço realizado, a árvore atendida e a parada da rota."
      :breadcrumbs="[{ text: 'Meu Painel', to: homeBase }, { text: '#Podas' }]"
    />

    <!-- Botão Nova Poda -->
    <v-btn
      color="#C5E11F"
      class="mb-4 text-none font-weight-bold"
      prepend-icon="mdi-plus"
      elevation="0"
      @click="createPruning"
    >
      Registrar poda pela rota
    </v-btn>

    <!-- Cards de Resumo -->
    <v-row class="mb-4" dense>
      <v-col cols="6" md="4">
        <v-card class="kpi-card" flat>
          <div class="kpi-header">
            <span class="kpi-label">Total de Podas</span>
            <v-icon size="20" color="blue-darken-2">mdi-content-cut</v-icon>
          </div>
          <div class="kpi-value">{{ stats.total }}</div>
          <div class="kpi-subtitle">Registradas</div>
        </v-card>
      </v-col>
      <v-col cols="6" md="4">
        <v-card class="kpi-card" :class="{ 'kpi-card--warning': stats.uniqueTrees > 0 }" flat>
          <div class="kpi-header">
            <span class="kpi-label">Árvores atendidas</span>
            <v-icon size="20" :color="stats.uniqueTrees > 0 ? 'warning' : 'grey'"
              >mdi-clock-alert</v-icon
            >
          </div>
          <div class="kpi-value" :class="{ 'text-warning': stats.uniqueTrees > 0 }">
            {{ stats.uniqueTrees }}
          </div>
          <div class="kpi-subtitle">Árvores distintas</div>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card class="kpi-card" flat>
          <div class="kpi-header">
            <span class="kpi-label">Últimos 30 dias</span>
            <v-icon size="20" color="success">mdi-check-circle</v-icon>
          </div>
          <div class="kpi-value text-success">{{ stats.recent }}</div>
          <div class="kpi-subtitle">Serviços registrados no período</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Loading -->
    <v-card v-if="loading" class="pa-8 text-center" flat>
      <v-progress-circular indeterminate color="green" size="48" />
      <p class="mt-4 text-grey">Carregando podas...</p>
    </v-card>

    <!-- Tabela de Podas -->
    <v-card v-else class="pruning-card" flat>
      <div class="d-flex align-center justify-space-between mb-4">
        <h3 class="text-subtitle-1 font-weight-bold mb-0">Histórico de Podas</h3>
        <v-chip size="small" class="records-chip">
          {{ prunings.length }} {{ prunings.length === 1 ? 'registro' : 'registros' }}
        </v-chip>
      </div>

      <v-data-table
        :items="prunings"
        :headers="headers"
        :items-per-page="10"
        density="comfortable"
        class="pruning-table"
        no-data-text="Nenhuma poda registrada"
      >
        <!-- Árvore -->
        <template #[`item.tree`]="{ item }">
          <div class="d-flex align-center">
            <v-icon size="18" color="green-darken-2" class="mr-2">mdi-tree</v-icon>
            <span class="text-body-2">
              {{ treeDisplayName(item) }}
            </span>
          </div>
        </template>

        <!-- Localização -->
        <template #[`item.location`]="{ item }">
          <div v-if="hasCoordinates(item.tree)" class="text-caption text-grey-darken-1">
            {{ formatCoordinate(item.tree.latitude) }}, {{ formatCoordinate(item.tree.longitude) }}
          </div>
          <span v-else class="text-caption text-grey">—</span>
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

        <!-- Data -->
        <template #[`item.date`]="{ item }">
          <span class="text-body-2">{{ formatDate(item.date) }}</span>
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
          <v-btn
            icon
            size="small"
            variant="text"
            color="primary"
            :aria-label="`Ver detalhes de ${treeDisplayName(item)} — ${formatDate(item.date)}`"
            :title="`Ver detalhes de ${treeDisplayName(item)}`"
            @click="viewDetails(item)"
          >
            <v-icon size="18">mdi-eye</v-icon>
          </v-btn>
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="detailsOpen" max-width="680" scrollable>
      <v-card v-if="selectedPruning" class="details-dialog" rounded="xl">
        <header class="details-hero">
          <div class="details-hero__topline">
            <v-avatar color="rgba(255,255,255,.14)" size="46">
              <v-icon color="#D7ED63" size="24">mdi-tree</v-icon>
            </v-avatar>
            <v-btn
              icon="mdi-close"
              variant="text"
              color="white"
              aria-label="Fechar detalhes da poda"
              @click="detailsOpen = false"
            />
          </div>
          <div class="details-hero__content">
            <div class="details-eyebrow">HISTÓRICO DE MANEJO</div>
            <h2 class="details-title">Detalhes da poda</h2>
            <p class="details-tree-name">{{ treeDisplayName(selectedPruning) }}</p>
          </div>
          <v-chip
            class="details-type-chip"
            :color="getTypeColor(selectedPruning.type)"
            size="small"
            variant="flat"
          >
            {{ getTypeLabel(selectedPruning.type) }}
          </v-chip>
        </header>

        <v-card-text class="details-content">
          <v-alert v-if="selectedPruning.schedule" type="info" variant="tonal" class="mb-4">
            Parada {{ selectedPruning.schedule.routeOrder || '—' }} da rota de
            {{ formatDate(selectedPruning.schedule.plannedDate) }}.
            <v-btn
              variant="text"
              size="small"
              :to="`${homeBase}/routes/daily?date=${new Date(selectedPruning.schedule.plannedDate).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })}`"
              >Ver rota</v-btn
            >
          </v-alert>
          <p v-if="selectedPruning.user?.name" class="mb-4 text-body-2">
            Serviço registrado por {{ selectedPruning.user.name }}.
          </p>
          <section class="details-section" aria-labelledby="pruning-info-heading">
            <h3 id="pruning-info-heading" class="details-section__title">
              Informações do registro
            </h3>
            <div class="details-grid">
              <div class="detail-tile">
                <v-avatar color="green-lighten-5" size="38"
                  ><v-icon color="green-darken-2" size="19"
                    >mdi-calendar-month-outline</v-icon
                  ></v-avatar
                >
                <div>
                  <span class="detail-label">Data da poda</span
                  ><strong>{{ formatDate(selectedPruning.date) }}</strong>
                </div>
              </div>
              <div class="detail-tile">
                <v-avatar color="lime-lighten-4" size="38"
                  ><v-icon color="green-darken-3" size="19"
                    >mdi-map-marker-outline</v-icon
                  ></v-avatar
                >
                <div>
                  <span class="detail-label">Localização</span
                  ><strong>{{ coordinatesDisplay(selectedPruning.tree) }}</strong>
                </div>
              </div>
              <div class="detail-tile detail-tile--wide">
                <v-avatar color="blue-grey-lighten-5" size="38"
                  ><v-icon color="blue-grey-darken-1" size="19">mdi-leaf</v-icon></v-avatar
                >
                <div>
                  <span class="detail-label">Nome científico</span
                  ><strong>{{
                    selectedPruning.tree?.species?.scientificName?.trim() ||
                    'Espécie não identificada'
                  }}</strong>
                </div>
              </div>
            </div>
          </section>

          <section class="action-note" aria-labelledby="pruning-action-heading">
            <div class="action-note__heading">
              <v-avatar color="white" size="36"
                ><v-icon color="green-darken-2" size="19">mdi-content-cut</v-icon></v-avatar
              >
              <div>
                <h3 id="pruning-action-heading">Ação registrada</h3>
                <span>Observações informadas no atendimento</span>
              </div>
            </div>
            <p class="observations-text">{{ observationDisplay(selectedPruning.observations) }}</p>
          </section>
          <p class="details-footnote">
            <v-icon size="15" class="mr-1">mdi-information-outline</v-icon>Detalhes exibidos
            conforme as informações disponíveis neste registro.
          </p>
        </v-card-text>

        <v-card-actions class="details-actions">
          <v-btn
            variant="text"
            color="green-darken-2"
            class="text-none font-weight-bold"
            @click="detailsOpen = false"
            >Fechar detalhes</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Error Snackbar -->
    <v-snackbar v-model="showError" color="error" timeout="5000">
      {{ errorMessage }}
      <template #actions>
        <v-btn variant="text" @click="showError = false">Fechar</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import { apiConnect } from '@/plugins/apiConnect'
import { getApiErrorMessage } from '@/utils/apiError'

const router = useRouter()
const route = useRoute()
const homeBase = computed(() =>
  route.path.startsWith('/admin')
    ? '/admin'
    : route.path.startsWith('/manager')
      ? '/manager'
      : '/user',
)

// State
const prunings = ref<PruningRecord[]>([])
const loading = ref(true)
const showError = ref(false)
const errorMessage = ref('')
const detailsOpen = ref(false)
const selectedPruning = ref<PruningRecord | null>(null)

interface TreeLocation {
  latitude?: number | null
  longitude?: number | null
  species?: { commonName?: string | null; scientificName?: string | null } | null
}

interface PruningRecord {
  id?: string | null
  idTree?: string | null
  type?: string | null
  date?: string | Date | null
  observations?: string | null
  tree?: TreeLocation | null
  user?: { id?: string; name?: string }
  schedule?: { id: string; plannedDate: string; routeOrder?: number } | null
}

// Headers da tabela
const headers = [
  { title: 'Árvore', key: 'tree', sortable: false },
  { title: 'Localização', key: 'location', sortable: false },
  { title: 'Tipo', key: 'type', sortable: true },
  { title: 'Data', key: 'date', sortable: true },
  { title: 'Observações', key: 'observations', sortable: false },
  { title: 'Ações', key: 'actions', sortable: false, align: 'center' },
] as const

// Stats computadas
const stats = computed(() => {
  const total = prunings.value.length
  const uniqueTrees = new Set(prunings.value.map((record) => record.idTree).filter(Boolean)).size
  const since = Date.now() - 30 * 86400000
  const recent = prunings.value.filter(
    (record) => record.date && new Date(record.date).getTime() >= since,
  ).length
  return { total, uniqueTrees, recent }
})

// Métodos
const createPruning = () => router.push(`${homeBase.value}/routes/daily`)

const viewDetails = (item: PruningRecord) => {
  selectedPruning.value = item
  detailsOpen.value = true
}

const getTypeColor = (type?: string | null) => {
  const colors: Record<string, string> = {
    LIGHT: 'blue',
    MODERATE: 'orange',
    HEAVY: 'green',
  }
  return colors[type || ''] || 'grey'
}

const getTypeLabel = (type?: string | null) => {
  const labels: Record<string, string> = {
    LIGHT: 'Leve',
    MODERATE: 'Moderada',
    HEAVY: 'Pesada',
  }
  return labels[type || ''] || type || 'Não informado'
}

const formatDate = (date: string | Date | null | undefined) => {
  if (!date) return '—'
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return 'Data inválida'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const hasCoordinates = (
  tree?: TreeLocation | null,
): tree is TreeLocation & { latitude: number; longitude: number } =>
  typeof tree?.latitude === 'number' &&
  Number.isFinite(tree.latitude) &&
  typeof tree.longitude === 'number' &&
  Number.isFinite(tree.longitude)

const formatCoordinate = (value: number) => value.toFixed(4)

const coordinatesDisplay = (tree?: TreeLocation | null) =>
  hasCoordinates(tree)
    ? `${formatCoordinate(tree.latitude)}, ${formatCoordinate(tree.longitude)}`
    : 'Localização não informada'

const treeDisplayName = (pruning: PruningRecord) => {
  const commonName = pruning.tree?.species?.commonName?.trim()
  const id = pruning.idTree?.trim()
  return `${commonName || 'Árvore'}${id ? ` · #${id}` : ' · identificação não informada'}`
}

const observationDisplay = (observations?: string | null) =>
  observations?.trim() || 'Nenhuma observação foi registrada para esta poda.'

const loadPrunings = async () => {
  loading.value = true
  try {
    const records: PruningRecord[] = []
    for (let page = 1; ; page++) {
      const { data } = await apiConnect.get<PruningRecord[]>('/pruning', {
        params: { page, limit: 100 },
      })
      records.push(...data)
      if (data.length < 100) break
    }
    prunings.value = records
  } catch (error: unknown) {
    const apiError = error as { response?: { data?: { message?: string } } }
    errorMessage.value = getApiErrorMessage(
      error,
      apiError.response?.data?.message || 'Não foi possível carregar o histórico de podas.',
    )
    showError.value = true
  } finally {
    loading.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadPrunings()
})
</script>

<style scoped>
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

.kpi-card--warning {
  background: linear-gradient(135deg, #fff8e1 0%, #ffffff 100%);
  border-color: #ffe082;
}

.kpi-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.kpi-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #43534a;
}

.kpi-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #333;
  line-height: 1;
}

.kpi-subtitle {
  font-size: 0.8125rem;
  line-height: 1.4;
  color: #53635a;
  margin-top: 4px;
}

.records-chip {
  color: #173d2a !important;
  background: #e8f1e9 !important;
  border: 1px solid #c8d9cb;
  font-weight: 650;
}

.pruning-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 20px;
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

.pruning-table :deep(td .text-caption) {
  color: #53635a !important;
  font-size: 0.8125rem;
}

.details-dialog {
  overflow: hidden;
  border: 1px solid rgba(34, 69, 45, 0.12);
  box-shadow: 0 24px 70px rgba(15, 35, 23, 0.24) !important;
}

.details-hero {
  position: relative;
  min-height: 204px;
  padding: 24px 28px 26px;
  overflow: hidden;
  color: white;
  background:
    radial-gradient(circle at 92% 8%, rgba(197, 225, 31, 0.22), transparent 31%),
    linear-gradient(125deg, #173d2a 0%, #245a39 58%, #367044 100%);
}

.details-hero::after {
  position: absolute;
  right: -42px;
  bottom: -112px;
  width: 238px;
  height: 238px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 50%;
  content: '';
  box-shadow:
    0 0 0 24px rgba(255, 255, 255, 0.035),
    0 0 0 48px rgba(255, 255, 255, 0.025);
  pointer-events: none;
}

.details-hero__topline,
.details-hero__content,
.details-type-chip {
  position: relative;
  z-index: 1;
}

.details-hero__topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.details-hero__content {
  margin-top: 22px;
}

.details-eyebrow {
  color: #d7ed63;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.14em;
}

.details-title {
  margin-top: 3px;
  font-size: 1.45rem;
  font-weight: 750;
  letter-spacing: -0.025em;
}

.details-tree-name {
  margin-top: 3px;
  color: rgba(255, 255, 255, 0.78);
  font-size: 0.92rem;
}

.details-type-chip {
  position: absolute;
  right: 28px;
  bottom: 28px;
  font-weight: 700;
}

.details-content {
  display: grid;
  gap: 22px;
  padding: 24px 28px 12px;
  background: #f7f9f5;
}

.details-section__title {
  margin-bottom: 12px;
  color: #26382c;
  font-size: 0.9rem;
  font-weight: 750;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.detail-tile {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
  padding: 13px;
  border: 1px solid #e8ede5;
  border-radius: 14px;
  background: #fff;
}

.detail-tile > div {
  display: grid;
  min-width: 0;
  gap: 3px;
}
.detail-tile strong {
  overflow-wrap: anywhere;
  color: #25372b;
  font-size: 0.85rem;
  font-weight: 650;
}
.detail-tile--wide {
  grid-column: 1 / -1;
}

.detail-label {
  color: #778278;
  font-size: 0.69rem;
  font-weight: 650;
  letter-spacing: 0.025em;
}

.action-note {
  padding: 16px;
  border: 1px solid #e1e9cf;
  border-left: 4px solid #a7c92b;
  border-radius: 14px;
  background: linear-gradient(120deg, #f1f6e5, #fbfcf8 72%);
}

.action-note__heading {
  display: flex;
  align-items: center;
  gap: 10px;
}
.action-note__heading h3 {
  color: #2d4933;
  font-size: 0.86rem;
  font-weight: 750;
}
.action-note__heading span {
  color: #788276;
  font-size: 0.72rem;
}

.observations-text {
  margin: 14px 0 0;
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

.details-footnote {
  display: flex;
  align-items: center;
  color: #7b857c;
  font-size: 0.7rem;
}
.details-actions {
  justify-content: flex-end;
  padding: 8px 20px 18px;
  background: #f7f9f5;
}

@media (max-width: 520px) {
  .details-hero {
    min-height: 194px;
    padding: 20px;
  }
  .details-type-chip {
    right: 20px;
    bottom: 20px;
  }
  .details-content {
    gap: 18px;
    padding: 20px 16px 10px;
  }
  .details-grid {
    grid-template-columns: 1fr;
  }
  .detail-tile--wide {
    grid-column: auto;
  }
}
</style>
