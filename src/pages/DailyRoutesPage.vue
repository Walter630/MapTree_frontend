<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, reactive, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { apiConnect } from '@/plugins/apiConnect'
import PageHeader from '@/components/shared/PageHeader.vue'
import PruningExecutionDialog from '@/components/pruning/PruningExecutionDialog.vue'
import {
  localDate,
  pruningTypeLabel,
  treeCoordinates,
  type RoutePruning,
} from '@/utils/pruningWorkflow'
import {
  prioritizeTrees,
  urgencyColor,
  urgencyLabel,
  type PrioritizedTree,
  type TreePriorityInput,
} from '@/utils/treePriority'
import { readDailyRouteSnapshot, saveDailyRouteSnapshot } from '@/utils/dailyRouteStorage'
import {
  getDailyRouteSchedules,
  routeStopSnapshot,
  type DailyRouteSchedule,
} from '@/utils/dailyRouteSchedules'
import { groupRoute, MAX_SUGGESTED_ROUTE_RADIUS_KM } from '@/utils/dailyRoutePlanner'

interface Tree extends TreePriorityInput {
  id: string
  species?: { commonName?: string; scientificName?: string }
  speciesName?: string
}

interface RouteStop {
  id: string
  order: number
  tree: Tree
  scheduleId?: string
  status?: string
  pruning?: RoutePruning
}

const route = useRoute()
const router = useRouter()
const homeBase = computed(() =>
  route.path.startsWith('/admin')
    ? '/admin'
    : route.path.startsWith('/manager')
      ? '/manager'
      : '/user',
)
const trees = ref<Tree[]>([])
const routeStops = ref<RouteStop[]>([])
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const feedback = ref('')
const planning = ref(true)
const pruningDialog = ref(false)
const activeStop = ref<RouteStop | null>(null)
const completedCount = computed(
  () => routeStops.value.filter((stop) => stop.status === 'COMPLETED').length,
)
const pendingRouteStops = computed(() =>
  routeStops.value.filter((stop) => stop.status !== 'COMPLETED'),
)
const routeCompleted = computed(
  () => routeStops.value.length > 0 && pendingRouteStops.value.length === 0,
)
const nextPendingStop = computed(() => pendingRouteStops.value.find((stop) => stop.scheduleId))
const hasNextStop = computed(() =>
  pendingRouteStops.value.some((stop) => stop.scheduleId && stop.id !== activeStop.value?.id),
)

function startPruning(stop: RouteStop) {
  if (!stop.scheduleId || stop.status === 'COMPLETED' || errorMessage.value) return
  activeStop.value = stop
  pruningDialog.value = true
}
function pruningSaved(pruning: RoutePruning, next: boolean) {
  const stop = activeStop.value
  if (!stop) return
  stop.status = 'COMPLETED'
  stop.pruning = pruning
  savePendingSnapshot()
  feedback.value = `Poda salva para a árvore #${stop.id}. ${completedCount.value} de ${routeStops.value.length} paradas concluídas.`
  activeStop.value = null
  if (next && nextPendingStop.value) {
    const upcoming = nextPendingStop.value
    nextTick(() => startPruning(upcoming))
  }
}
async function loadServerRoute() {
  const requestedDate = filters.date
  try {
    const schedules = await getDailyRouteSchedules<Tree>(requestedDate)
    if (requestedDate !== filters.date) return
    const stops = schedules.filter((stop) => stop.status !== 'CANCELLED')
    const scheduledTrees = new Set(schedules.map((stop) => stop.treeId))
    const drafts = routeStops.value.filter((stop) => !scheduledTrees.has(stop.id))
    routeStops.value = [
      ...stops.map((stop, index) => ({
        id: stop.treeId,
        order: stop.routeOrder || index + 1,
        tree: stop.tree,
        scheduleId: stop.id,
        status: stop.status,
        pruning: stop.prunings?.[0],
      })),
      ...drafts,
    ].sort((a, b) => a.order - b.order)
    syncState.value = drafts.length
      ? stops.length
        ? 'pending'
        : 'local'
      : stops.length
        ? 'server'
        : 'idle'
    planning.value = !stops.length || drafts.length > 0
  } catch {
    if (requestedDate !== filters.date) return
    errorMessage.value =
      'Não foi possível conferir a rota e as podas no servidor. Atualize antes de registrar um serviço.'
  }
}

// Estado de sincronização da rota salva:
// - 'idle': ainda não salvou nesta sessão
// - 'local': salvo apenas neste dispositivo (snapshot), sem servidor ainda
// - 'pending': salvo localmente, mas alguma parada falhou no servidor
// - 'server': todas as paradas confirmadas no servidor
const syncState = ref<'idle' | 'local' | 'pending' | 'server'>('idle')
const filters = reactive({
  date:
    typeof route.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(route.query.date)
      ? route.query.date
      : localDate(),
  urgency: 'ALL',
  search: '',
})

// Paginação da lista de árvores (10 por página)
const page = ref(1)
const perPage = 10

// Mini-mapa da rota
const routeMapEl = ref<HTMLElement | null>(null)
let routeMap: L.Map | null = null
let routeLayer: L.LayerGroup | null = null

const prioritized = computed(() => prioritizeTrees(trees.value))
const completedTreeIds = computed(
  () =>
    new Set(routeStops.value.filter((stop) => stop.status === 'COMPLETED').map((stop) => stop.id)),
)
const pendingTrees = computed(() =>
  prioritized.value.filter(
    (item) => item.needsPruning && !completedTreeIds.value.has(item.tree.id),
  ),
)
const filteredTrees = computed(() => {
  const search = filters.search.trim().toLowerCase()
  return pendingTrees.value.filter((item) => {
    const urgencyMatches = filters.urgency === 'ALL' || item.urgency === filters.urgency
    const tree = item.tree
    const label = tree.species?.commonName || tree.speciesName || tree.id
    const searchMatches =
      !search ||
      `${label} ${tree.id} ${tree.latitude ?? tree.lat} ${tree.longitude ?? tree.lng}`
        .toLowerCase()
        .includes(search)
    return urgencyMatches && searchMatches
  })
})
const selectedIds = computed(() => new Set(routeStops.value.map((stop) => stop.id)))
const selectedCount = computed(() => routeStops.value.length)

// ----- Paginação (10 árvores por página) -----
const pageCount = computed(() => Math.max(1, Math.ceil(filteredTrees.value.length / perPage)))
const paginatedTrees = computed(() => {
  const start = (page.value - 1) * perPage
  return filteredTrees.value.slice(start, start + perPage)
})
// Volta pra página 1 quando os filtros mudam
watch([() => filters.search, () => filters.urgency, () => filteredTrees.value.length], () => {
  page.value = 1
})
watch(pageCount, (count) => {
  if (page.value > count) page.value = count
})
const totalScore = computed(() =>
  routeStops.value.reduce(
    (sum, stop) =>
      sum + (prioritized.value.find((item) => item.tree.id === stop.id)?.priorityScore || 0),
    0,
  ),
)

const syncStateChip = computed(() => {
  switch (syncState.value) {
    case 'server':
      return { color: 'green-darken-2', icon: 'mdi-cloud-check', label: 'Confirmada no servidor' }
    case 'pending':
      return {
        color: 'orange-darken-2',
        icon: 'mdi-cloud-alert',
        label: 'Pendente de sincronização',
      }
    case 'local':
    default:
      return { color: 'blue-grey', icon: 'mdi-cellphone-check', label: 'Salvo neste dispositivo' }
  }
})

function treeName(item: PrioritizedTree<Tree>) {
  return (
    item.tree.species?.commonName ||
    item.tree.speciesName ||
    `Árvore #${String(item.tree.id).slice(-6)}`
  )
}

function coordinates(tree: Tree) {
  return treeCoordinates(tree)
}

function toggleTree(item: PrioritizedTree<Tree>) {
  if (saving.value) return
  const index = routeStops.value.findIndex((stop) => stop.id === item.tree.id)
  if (index >= 0) {
    void removeStop(index)
  } else {
    routeStops.value.push({ id: item.tree.id, order: routeStops.value.length + 1, tree: item.tree })
  }
  normalizeOrder()
}

function addAllFiltered() {
  if (saving.value) return
  const existing = new Set(routeStops.value.map((stop) => stop.id))
  filteredTrees.value.forEach((item) => {
    if (!existing.has(item.tree.id))
      routeStops.value.push({
        id: item.tree.id,
        order: routeStops.value.length + 1,
        tree: item.tree,
      })
  })
  normalizeOrder()
}

async function removeStop(index: number) {
  const stop = routeStops.value[index]
  if (!stop || saving.value || stop.status === 'COMPLETED') return
  if (stop.scheduleId) {
    saving.value = true
    try {
      await apiConnect.patch(`/scheduling/${stop.scheduleId}/status`, { status: 'CANCELLED' })
    } catch {
      feedback.value = 'Não foi possível remover a parada. Tente novamente.'
      return
    } finally {
      saving.value = false
    }
  }
  routeStops.value.splice(index, 1)
  normalizeOrder()
  savePendingSnapshot()
}

function moveStop(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= routeStops.value.length) return
  const current = routeStops.value[index]
  const other = routeStops.value[target]
  if (!current || !other) return
  routeStops.value[index] = other
  routeStops.value[target] = current
  normalizeOrder()
}

function normalizeOrder() {
  routeStops.value.forEach((stop, index) => {
    stop.order = index + 1
  })
}

function loadLocalRoute() {
  const saved = readDailyRouteSnapshot(filters.date)
  if (!saved) {
    routeStops.value = []
    return
  }

  const treesById = new Map(trees.value.map((tree) => [tree.id, tree]))
  routeStops.value = saved.stops
    .map((stop) => {
      if (stop.scheduleId) return null
      const tree = treesById.get(stop.id)
      return tree ? { id: stop.id, order: stop.order, tree } : null
    })
    .filter((stop): stop is RouteStop => Boolean(stop))
  normalizeOrder()
}

async function loadTrees() {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await apiConnect.get<Tree[]>('/trees')
    trees.value = response.data || []
    loadLocalRoute()
    await loadServerRoute()
  } catch {
    errorMessage.value =
      'Não foi possível carregar as árvores. Verifique sua conexão e tente novamente.'
  } finally {
    loading.value = false
  }
}

function savePendingSnapshot() {
  saveDailyRouteSnapshot({
    date: filters.date,
    updatedAt: new Date().toISOString(),
    stops: pendingRouteStops.value.flatMap((stop) => {
      const point = routeStopSnapshot(stop.tree, stop.order, stop.scheduleId)
      return point ? [point] : []
    }),
  })
}

async function saveRoute() {
  if (pendingRouteStops.value.length === 0) {
    feedback.value = 'Selecione pelo menos uma árvore para montar a rota.'
    return
  }

  if (saving.value) return
  saving.value = true
  feedback.value = ''
  syncState.value = 'local'

  savePendingSnapshot()

  // DECISÃO (ver FEAT-003): o backend expõe POST /scheduling com CreateScheduleDto,
  // que exige treeId SINGULAR e descarta campos não declarados (treeIds/stops/status)
  // por causa do ValidationPipe com whitelist. O payload antigo (treeIds/stops) caía
  // em 400 sempre. Por isso enviamos UMA solicitação de agendamento POR PARADA.
  // Dia planejado no fuso da operação.
  const plannedDate = new Date(`${filters.date}T08:00:00-03:00`).toISOString()
  const stopsToSave = pendingRouteStops.value
  const results = await Promise.allSettled(
    stopsToSave.map((stop) =>
      apiConnect.post<DailyRouteSchedule<Tree>>('/scheduling', {
        treeId: stop.id,
        type: 'PRUNING',
        plannedDate,
        notes: `Rota diária ordem ${stop.order}`,
        routeOrder: stop.order,
      }),
    ),
  )

  results.forEach((result, index) => {
    const stop = stopsToSave[index]
    if (result.status === 'fulfilled' && stop) {
      stop.scheduleId = result.value.data.id
      stop.status = result.value.data.status
    }
  })
  savePendingSnapshot()
  const failed = results.filter((r) => r.status === 'rejected').length
  saving.value = false

  // Só declaramos "confirmada no servidor" quando TODAS as paradas persistem.
  // Qualquer falha mantém o estado "pendente de sincronização" e permite nova tentativa.
  if (failed === 0) {
    syncState.value = 'server'
    planning.value = false
    feedback.value =
      'Rota salva. Use Registrar poda na parada atendida; a árvore já está selecionada.'
  } else {
    syncState.value = 'pending'
    const total = stopsToSave.length
    const ok = total - failed
    feedback.value = `Rota salva neste dispositivo, mas pendente de sincronização: ${ok} de ${total} paradas confirmadas no servidor. Toque em "Salvar rota" para tentar novamente.`
  }
}

function openRouteOnMap() {
  savePendingSnapshot()
  router.push({
    path: homeBase.value === '/user' ? '/user/mapUser' : `${homeBase.value}/map`,
    query: { routeDate: filters.date },
  })
}

function openExternalNavigation(stop: RouteStop) {
  const latitude = Number(stop.tree.latitude ?? stop.tree.lat)
  const longitude = Number(stop.tree.longitude ?? stop.tree.lng)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return

  const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${latitude},${longitude}`)}&travelmode=driving`
  window.open(url, '_blank', 'noopener,noreferrer')
}

/** Abre a ROTA INTEIRA no Google Maps: origem = localização atual do usuário,
 *  paradas intermediárias = waypoints, destino = última parada. */
function openFullRouteOnGoogleMaps() {
  if (pendingRouteStops.value.length === 0) {
    feedback.value = 'Monte a rota (selecione árvores) antes de abrir no Google Maps.'
    return
  }

  const coords = pendingRouteStops.value
    .map((stop) => {
      const lat = Number(stop.tree.latitude ?? stop.tree.lat)
      const lng = Number(stop.tree.longitude ?? stop.tree.lng)
      return Number.isFinite(lat) && Number.isFinite(lng) ? `${lat},${lng}` : null
    })
    .filter((c): c is string => c !== null)

  if (coords.length === 0) return

  const destination = coords[coords.length - 1] as string
  const waypoints = coords.slice(0, -1)
  const buildUrl = (origin?: string) => {
    const params = new URLSearchParams({ api: '1', destination, travelmode: 'driving' })
    if (origin) params.set('origin', origin)
    if (waypoints.length) params.set('waypoints', waypoints.join('|'))
    return `https://www.google.com/maps/dir/?${params.toString()}`
  }

  // Tenta pegar a localização atual pra usar como ponto de partida
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const origin = `${pos.coords.latitude},${pos.coords.longitude}`
        window.open(buildUrl(origin), '_blank', 'noopener,noreferrer')
      },
      () => {
        // Sem permissão/localização: abre sem origem (Maps pergunta o ponto de partida)
        window.open(buildUrl(), '_blank', 'noopener,noreferrer')
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    )
  } else {
    window.open(buildUrl(), '_blank', 'noopener,noreferrer')
  }
}

/* ----- Mini-mapa da rota (Leaflet próprio, simples) ----- */
function ensureRouteMap() {
  if (routeMap || !routeMapEl.value) return
  routeMap = L.map(routeMapEl.value, { zoomControl: true, attributionControl: false }).setView(
    [-5.2434, -38.1276],
    13,
  )
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(routeMap)
  routeLayer = L.layerGroup().addTo(routeMap)
}

function renderRouteOnMiniMap() {
  if (!routeMap || !routeLayer) return
  routeLayer.clearLayers()

  const points: [number, number][] = pendingRouteStops.value
    .map((stop) => {
      const lat = Number(stop.tree.latitude ?? stop.tree.lat)
      const lng = Number(stop.tree.longitude ?? stop.tree.lng)
      return Number.isFinite(lat) && Number.isFinite(lng) ? ([lat, lng] as [number, number]) : null
    })
    .filter((p): p is [number, number] => p !== null)

  if (points.length === 0) {
    routeMap.setView([-5.2434, -38.1276], 13)
    return
  }

  // Linha ligando as paradas na ordem
  if (points.length > 1) {
    L.polyline(points, { color: '#1565c0', weight: 4, opacity: 0.7 }).addTo(routeLayer)
  }

  // O número corresponde à parada original, mesmo quando há coordenadas ausentes.
  pendingRouteStops.value.forEach((stop) => {
    const lat = Number(stop.tree.latitude ?? stop.tree.lat)
    const lng = Number(stop.tree.longitude ?? stop.tree.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    const marker = L.divIcon({
      className: 'route-stop-pin',
      html: `<span>${stop.order}</span>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    })
    L.marker([lat, lng], { icon: marker, title: `Parada ${stop.order} · Árvore #${stop.id}` })
      .on('click', () => {
        if (stop.scheduleId && stop.status !== 'COMPLETED' && !errorMessage.value)
          startPruning(stop)
      })
      .addTo(routeLayer!)
  })

  routeMap.fitBounds(L.latLngBounds(points).pad(0.25))
}

watch(
  routeStops,
  () => {
    nextTick(renderRouteOnMiniMap)
  },
  { deep: true },
)

function useSuggestedRoute() {
  if (routeStops.value.some((stop) => stop.scheduleId)) {
    feedback.value =
      'A rota já possui paradas salvas. Adicione ou remova as paradas individualmente para preservar o histórico.'
    return
  }
  const suggested = groupRoute(filteredTrees.value, 20, MAX_SUGGESTED_ROUTE_RADIUS_KM)
  routeStops.value = suggested.map((item, index) => ({
    id: item.tree.id,
    order: index + 1,
    tree: item.tree,
  }))
  const excludedCount = filteredTrees.value.length - suggested.length
  feedback.value =
    excludedCount > 0
      ? `${suggested.length} paradas sugeridas. ${excludedCount} árvore(s) fora do raio de ${MAX_SUGGESTED_ROUTE_RADIUS_KM} km ou sem coordenadas ficaram de fora (incluindo o limite de 20 paradas); selecione-as manualmente se necessário.`
      : ''
}

function organizeSelectedRoute() {
  const selected = routeStops.value
    .map((stop) => prioritized.value.find((item) => item.tree.id === stop.id))
    .filter((item): item is PrioritizedTree<Tree> => Boolean(item))
  const ordered = groupRoute(selected, selected.length)
  routeStops.value = ordered.map((item, index) => ({
    ...routeStops.value.find((stop) => stop.id === item.tree.id),
    id: item.tree.id,
    order: index + 1,
    tree: item.tree,
  }))
}

watch(
  () => filters.date,
  async () => {
    routeStops.value = []
    syncState.value = 'idle'
    planning.value = true
    loadLocalRoute()
    await loadServerRoute()
  },
)

// Qualquer edição das paradas após salvar invalida a confirmação anterior:
// a rota passa a estar apenas "local" até um novo "Salvar rota" bem-sucedido.
watch(
  () => routeStops.value.map((stop) => stop.id).join(','),
  () => {
    if (syncState.value === 'server' || syncState.value === 'pending') {
      syncState.value = 'local'
    }
  },
  { flush: 'sync' },
)

onMounted(async () => {
  await loadTrees()
  await nextTick()
  ensureRouteMap()
  renderRouteOnMiniMap()
})

onBeforeUnmount(() => {
  if (routeMap) {
    routeMap.remove()
    routeMap = null
    routeLayer = null
  }
})
</script>

<template>
  <v-container fluid class="page-shell py-8">
    <PageHeader
      title="Rotas diárias de poda"
      subtitle="Planeje o trajeto, identifique cada árvore e registre o serviço na própria parada."
      :breadcrumbs="[{ text: 'Meu Painel', to: homeBase }, { text: 'Rotas diárias' }]"
    />
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-6 route-page-actions">
      <div class="d-flex flex-wrap align-center ga-2">
        <v-btn
          variant="tonal"
          color="blue-darken-2"
          prepend-icon="mdi-map"
          :disabled="!pendingRouteStops.length || saving || loading || !!errorMessage"
          @click="openRouteOnMap"
          >Ver rota no mapa</v-btn
        >
        <v-btn variant="text" prepend-icon="mdi-refresh" :loading="loading" @click="loadTrees"
          >Atualizar rota</v-btn
        >
        <v-btn
          color="green-darken-2"
          prepend-icon="mdi-content-save"
          :loading="saving"
          @click="saveRoute"
          :disabled="loading || !pendingRouteStops.length || !!errorMessage"
          >Salvar rota</v-btn
        >
      </div>
      <!-- Estado de sincronização: distingue claramente o que está só no dispositivo
           do que foi confirmado no servidor. Não apresenta dado local como persistido. -->
      <v-chip
        v-if="syncState !== 'idle'"
        :color="syncStateChip.color"
        variant="tonal"
        size="small"
        :prepend-icon="syncStateChip.icon"
        class="font-weight-bold"
      >
        {{ syncStateChip.label }}
      </v-chip>
    </div>

    <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-4">{{
      errorMessage
    }}</v-alert>
    <v-alert v-if="feedback" type="info" variant="tonal" closable class="mb-4">{{
      feedback
    }}</v-alert>

    <div class="execution-toolbar mb-5">
      <v-btn-toggle v-model="planning" mandatory color="green-darken-3" variant="outlined" divided>
        <v-btn :value="true" prepend-icon="mdi-map-marker-path">Planejar rota</v-btn>
        <v-btn :value="false" prepend-icon="mdi-content-cut">Executar e registrar</v-btn>
      </v-btn-toggle>
      <v-btn
        :to="`${homeBase}/podas`"
        variant="text"
        color="green-darken-3"
        prepend-icon="mdi-history"
        >Histórico de podas</v-btn
      >
    </div>
    <v-card v-if="!planning && routeStops.length" class="execution-summary mb-5" elevation="0">
      <div>
        <span class="text-overline">{{
          routeCompleted ? 'Rota concluída' : 'Andamento do trabalho'
        }}</span>
        <h2>{{ completedCount }} de {{ routeStops.length }} árvores atendidas</h2>
        <p>
          {{
            completedCount === routeStops.length
              ? 'Todas as podas desta rota foram registradas.'
              : 'Navegue até a árvore, confira a identificação e registre o que foi feito.'
          }}
        </p>
      </div>
      <v-progress-linear
        :model-value="(completedCount / routeStops.length) * 100"
        color="green-darken-3"
        height="9"
        rounded
        class="mt-4"
        aria-label="Progresso das podas na rota"
      />
    </v-card>
    <v-row>
      <v-col v-if="planning" cols="12" lg="7">
        <v-card elevation="0" class="panel-card">
          <v-card-item>
            <template #prepend><v-icon color="green-darken-2">mdi-filter-variant</v-icon></template>
            <v-card-title>Árvores que precisam de ação</v-card-title>
            <v-card-subtitle
              >{{ pendingTrees.length }} pendências ordenadas por urgência</v-card-subtitle
            >
          </v-card-item>
          <v-divider />
          <v-card-text>
            <v-row dense>
              <v-col cols="12" sm="4"
                ><v-text-field
                  v-model="filters.date"
                  :disabled="saving || loading"
                  type="date"
                  label="Dia da rota"
                  variant="outlined"
                  density="comfortable"
              /></v-col>
              <v-col cols="12" sm="3"
                ><v-select
                  v-model="filters.urgency"
                  label="Urgência"
                  :items="[
                    { title: 'Todas', value: 'ALL' },
                    { title: 'Urgente', value: 'CRITICAL' },
                    { title: 'Prioridade alta', value: 'HIGH' },
                  ]"
                  variant="outlined"
                  density="comfortable"
              /></v-col>
              <v-col cols="12" sm="5"
                ><v-text-field
                  v-model="filters.search"
                  label="Buscar espécie, código ou coordenada"
                  prepend-inner-icon="mdi-magnify"
                  clearable
                  variant="outlined"
                  density="comfortable"
              /></v-col>
            </v-row>
            <div class="suggestion-banner mb-4">
              <div class="d-flex align-center">
                <v-avatar color="green-darken-2" size="40" class="mr-3"
                  ><v-icon color="white">mdi-auto-fix</v-icon></v-avatar
                >
                <div class="flex-grow-1">
                  <p class="text-subtitle-2 font-weight-bold mb-1">Sugestão inteligente pronta</p>
                  <p class="text-caption mb-0 text-grey-darken-2">
                    Prioriza urgência e sugere paradas em um raio máximo de
                    {{ MAX_SUGGESTED_ROUTE_RADIUS_KM }} km do primeiro ponto.
                  </p>
                </div>
                <v-btn
                  color="green-darken-2"
                  variant="flat"
                  class="suggestion-button text-none"
                  prepend-icon="mdi-auto-fix"
                  @click="useSuggestedRoute"
                  >Usar sugestão</v-btn
                >
              </div>
            </div>
            <div class="d-flex flex-wrap justify-space-between align-center mb-3 ga-2">
              <span class="text-caption text-grey-darken-1"
                >{{ filteredTrees.length }} resultado(s)</span
              >
              <v-btn
                size="small"
                variant="text"
                color="green-darken-2"
                prepend-icon="mdi-plus-box-multiple"
                @click="addAllFiltered"
                >Adicionar resultados</v-btn
              >
            </div>

            <v-progress-linear v-if="loading" indeterminate color="green" class="mb-3" />
            <div v-if="!loading && filteredTrees.length === 0" class="empty-state">
              <v-icon size="48" color="green-lighten-2">mdi-tree-check</v-icon>
              <p class="text-body-2 mt-2 mb-0">Nenhuma árvore pendente para este filtro.</p>
            </div>
            <template v-else>
              <v-list lines="two" class="pa-0">
                <v-list-item
                  v-for="item in paginatedTrees"
                  :key="item.tree.id"
                  class="tree-row mb-2"
                  :class="{ 'tree-row--selected': selectedIds.has(item.tree.id) }"
                  @click="toggleTree(item)"
                >
                  <template #prepend>
                    <v-checkbox-btn
                      :model-value="selectedIds.has(item.tree.id)"
                      color="green-darken-2"
                      @click.stop="toggleTree(item)"
                    />
                  </template>
                  <v-list-item-title class="font-weight-bold">{{
                    treeName(item)
                  }}</v-list-item-title>
                  <v-list-item-subtitle
                    >{{ item.reason }} · {{ coordinates(item.tree) }}</v-list-item-subtitle
                  >
                  <template #append
                    ><v-chip size="small" :color="urgencyColor(item.urgency)" variant="tonal">{{
                      urgencyLabel(item.urgency)
                    }}</v-chip></template
                  >
                </v-list-item>
              </v-list>

              <!-- Paginação: 10 árvores por página -->
              <div v-if="pageCount > 1" class="d-flex justify-center mt-4">
                <v-pagination
                  v-model="page"
                  :length="pageCount"
                  :total-visible="5"
                  density="comfortable"
                  rounded="circle"
                  color="green-darken-2"
                />
              </div>
            </template>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" :lg="planning ? 5 : 12">
        <v-card elevation="0" class="panel-card route-card">
          <v-card-item>
            <template #prepend><v-icon color="blue-darken-2">mdi-route</v-icon></template>
            <v-card-title>Rota de {{ filters.date.split('-').reverse().join('/') }}</v-card-title>
            <v-card-subtitle
              >{{ selectedCount }} paradas · pontuação {{ totalScore }}</v-card-subtitle
            >
            <template #append>
              <v-btn
                v-if="routeStops.length > 1"
                size="small"
                variant="tonal"
                color="blue-darken-2"
                prepend-icon="mdi-call-split"
                class="text-none"
                @click="organizeSelectedRoute"
                >Agrupar por proximidade</v-btn
              >
            </template>
          </v-card-item>
          <v-divider />
          <v-card-text>
            <!-- Mini-mapa com a rota -->
            <div
              v-show="!routeCompleted"
              class="route-minimap-wrap mb-4"
              :class="{ 'route-minimap-wrap--execution': !planning }"
            >
              <div ref="routeMapEl" class="route-minimap" />
              <div v-if="routeStops.length === 0" class="route-minimap-hint">
                <v-icon size="18" class="mr-1">mdi-information-outline</v-icon>
                Selecione árvores para ver a rota no mapa
              </div>
            </div>

            <div v-if="routeStops.length === 0" class="empty-state">
              <v-icon size="48" color="blue-lighten-2">mdi-map-marker-path</v-icon>
              <p class="text-body-2 mt-2 mb-0">
                Abra Planejar rota para selecionar as árvores do trabalho.
              </p>
            </div>
            <v-list v-else lines="two" class="pa-0">
              <v-list-item
                v-for="(stop, index) in routeStops"
                :key="stop.id"
                class="route-stop mb-2"
                :class="{ 'route-stop--completed': stop.status === 'COMPLETED' }"
              >
                <template #prepend
                  ><v-avatar color="blue-lighten-5" size="32"
                    ><v-icon color="blue-darken-3" size="18">mdi-map-marker</v-icon
                    ><span class="route-number">{{ index + 1 }}</span></v-avatar
                  ></template
                >
                <v-list-item-title class="font-weight-bold">{{
                  stop.tree.species?.commonName ||
                  stop.tree.speciesName ||
                  `Árvore #${stop.id.slice(-6)}`
                }}</v-list-item-title>
                <v-list-item-subtitle class="stop-identity"
                  >Identificação: #{{ stop.id }}<br />{{
                    coordinates(stop.tree)
                  }}</v-list-item-subtitle
                >
                <div class="stop-work mt-3">
                  <template v-if="stop.status === 'COMPLETED'">
                    <v-chip
                      color="green-darken-3"
                      variant="tonal"
                      prepend-icon="mdi-check-circle-outline"
                      size="small"
                      >Poda registrada</v-chip
                    >
                    <p v-if="stop.pruning" class="text-body-2 mt-2">
                      {{ pruningTypeLabel(stop.pruning.type) }} ·
                      {{ new Date(stop.pruning.date).toLocaleDateString('pt-BR')
                      }}<span v-if="stop.pruning.user"> · {{ stop.pruning.user.name }}</span>
                    </p>
                    <p v-if="stop.pruning?.observations" class="text-body-2 mt-1 stop-observation">
                      {{ stop.pruning.observations }}
                    </p>
                  </template>
                  <div v-else class="stop-work-actions">
                    <v-btn
                      color="green-darken-3"
                      variant="flat"
                      prepend-icon="mdi-content-cut"
                      :disabled="saving || !!errorMessage || !stop.scheduleId"
                      @click="startPruning(stop)"
                      >Registrar poda desta árvore</v-btn
                    >
                    <v-btn
                      variant="tonal"
                      color="blue-darken-2"
                      prepend-icon="mdi-navigation-variant"
                      @click="openExternalNavigation(stop)"
                      >Ir até a árvore</v-btn
                    >
                    <p v-if="!stop.scheduleId" class="text-caption">
                      Salve a rota para vincular esta parada ao serviço.
                    </p>
                  </div>
                </div>
                <template #append>
                  <div v-if="planning" class="d-flex align-center">
                    <v-btn
                      icon="mdi-chevron-up"
                      size="x-small"
                      variant="text"
                      :disabled="index === 0 || saving"
                      @click="moveStop(index, -1)"
                    />
                    <v-btn
                      icon="mdi-chevron-down"
                      size="x-small"
                      variant="text"
                      :disabled="index === routeStops.length - 1 || saving"
                      @click="moveStop(index, 1)"
                    />
                    <v-btn
                      icon="mdi-navigation-variant"
                      size="x-small"
                      variant="text"
                      color="blue-darken-2"
                      aria-label="Abrir navegação no Google Maps"
                      @click="openExternalNavigation(stop)"
                    />
                    <v-btn
                      icon="mdi-close"
                      size="x-small"
                      variant="text"
                      color="error"
                      aria-label="Remover parada"
                      :disabled="saving || stop.status === 'COMPLETED'"
                      @click="removeStop(index)"
                    />
                  </div>
                </template>
              </v-list-item>
            </v-list>
            <div v-if="routeStops.length" class="route-ready-footer">
              <v-alert
                type="success"
                variant="tonal"
                density="compact"
                class="route-ready-alert mb-0"
              >
                <template #prepend><v-icon>mdi-check-circle-outline</v-icon></template>
                <strong
                  >{{ completedCount }} concluídas ·
                  {{ selectedCount - completedCount }} pendentes.</strong
                >
                <span class="route-ready-copy"
                  >Em cada parada, use Registrar poda para salvar o serviço na árvore correta.</span
                >
              </v-alert>
              <div v-if="pendingRouteStops.length" class="route-ready-actions">
                <v-btn
                  color="blue-darken-2"
                  variant="flat"
                  class="text-none"
                  prepend-icon="mdi-map-marker-path"
                  :disabled="loading || saving || !!errorMessage"
                  @click="openRouteOnMap"
                  >Abrir no mapa</v-btn
                >
                <v-btn
                  color="green-darken-2"
                  variant="flat"
                  class="text-none"
                  prepend-icon="mdi-google-maps"
                  :disabled="loading || saving || !!errorMessage"
                  @click="openFullRouteOnGoogleMaps"
                  >Abrir no Google Maps</v-btn
                >
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <PruningExecutionDialog
      v-model="pruningDialog"
      :tree="activeStop?.tree || null"
      :schedule-id="activeStop?.scheduleId"
      :order="activeStop?.order"
      :has-next="hasNextStop"
      @saved="pruningSaved"
    />
  </v-container>
</template>

<style scoped>
.execution-toolbar,
.stop-work-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
.execution-toolbar {
  justify-content: space-between;
}
.execution-summary {
  padding: 22px;
  border: 1px solid #c9ddca;
  border-radius: 16px;
  background: #edf5ed;
}
.execution-summary h2 {
  font-size: 1.3rem;
  color: #274c31;
}
.execution-summary p {
  color: #586e5d;
  font-size: 0.85rem;
  margin-top: 6px;
}
.stop-identity {
  white-space: normal;
  opacity: 1;
  font-family: monospace;
  font-size: 0.74rem;
  overflow-wrap: anywhere;
}
.stop-observation {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.route-stop--completed {
  background: #edf5ed;
  border-color: #a5c4a9 !important;
}
.stop-work {
  padding-bottom: 8px;
}
.route-minimap-wrap--execution {
  max-height: 260px;
}
@media (max-width: 600px) {
  .stop-work-actions .v-btn {
    width: 100%;
    font-size: 0.75rem;
  }
  .execution-toolbar .v-btn {
    font-size: 0.73rem;
  }
  .route-stop :deep(.v-list-item__prepend) {
    display: none;
  }
}

.panel-card {
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  height: 100%;
}
.tree-row,
.route-stop {
  border: 1px solid #edf0f2;
  border-radius: 12px;
  cursor: pointer;
  transition: 0.2s ease;
}
.route-ready-footer {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}
.route-ready-alert {
  width: 100%;
  border-radius: 12px;
}
.route-ready-copy {
  display: block;
  margin-top: 3px;
  font-size: 0.78rem;
  line-height: 1.45;
}
.route-ready-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}
.tree-row:hover,
.tree-row--selected {
  border-color: #81c784;
  background: #f4fbf4;
}
.suggestion-banner {
  border: 1px solid #b7d96b;
  border-radius: 16px;
  padding: 14px;
  background: linear-gradient(135deg, #f7fbe9 0%, #ffffff 100%);
}
.suggestion-button {
  min-height: 42px;
  box-shadow: 0 6px 18px rgba(46, 125, 50, 0.2);
}
.route-number {
  position: absolute;
  font-size: 0.7rem;
  font-weight: 800;
  color: #0d47a1;
  margin-left: 1px;
}
.empty-state {
  min-height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #68747c;
  text-align: center;
}

/* Mini-mapa da rota */
.route-minimap-wrap {
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

.route-minimap {
  height: 220px;
  width: 100%;
  z-index: 0;
}

.route-minimap-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.78);
  color: #64748b;
  font-size: 0.82rem;
  z-index: 1;
  pointer-events: none;
}

@media (max-width: 600px) {
  .route-ready-actions {
    display: grid;
    grid-template-columns: 1fr;
  }
  .route-ready-actions :deep(.v-btn) {
    width: 100%;
  }
}
</style>

<style>
/* Pin numerado da rota (não-scoped: o ícone é injetado via Leaflet divIcon) */
.route-stop-pin {
  background: #1565c0;
  color: #fff;
  border: 2px solid #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 800;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}
</style>
