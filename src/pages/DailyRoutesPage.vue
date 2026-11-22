<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import type * as L from 'leaflet'
import type {} from 'leaflet-routing-machine'
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
  prioritizeTree,
  urgencyColor,
  urgencyLabel,
  type PrioritizedTree,
  type TreePriorityInput,
} from '@/utils/treePriority'
import {
  readDailyRouteSnapshot,
  saveDailyRouteSnapshot,
  type DailyRouteStopSnapshot,
} from '@/utils/dailyRouteStorage'
import {
  getDailyRouteSchedules,
  getDailyRouteSchedulesByStatus,
  getDailyRouteSummary,
  setDailyRouteTreeSelected,
  type DailyRouteSchedule,
  type DailyRouteSummary,
} from '@/utils/dailyRouteSchedules'

interface Tree extends TreePriorityInput {
  id: string
  effectiveStatus?: string
  species?: { commonName?: string; scientificName?: string }
  speciesName?: string
  distance_km?: number
}

interface RouteStop {
  id: string
  order: number
  tree: Tree
  scheduleId?: string
  ownerUserId?: string | null
  status?: string
  pruning?: RoutePruning
  completedAt?: string
}

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  )
}
const routeDateSelected = computed(() => isCalendarDate(route.query.date))
const homeBase = computed(() =>
  route.path.startsWith('/admin')
    ? '/admin'
    : route.path.startsWith('/manager')
      ? '/manager'
      : '/user',
)
const trees = ref<Tree[]>([])
const nearbyTrees = ref<Tree[]>([])
const candidateMode = ref<'catalog' | 'nearby'>('catalog')
const nearbyCenter = ref<{ lat: number; lng: number } | null>(null)
const nearbyRadiusKm = ref<2 | 5>(2)
const nearbyLoading = ref(false)
const nearbyError = ref('')
const nearbyPickerOpen = ref(false)
const nearbyPickerElement = ref<HTMLElement | null>(null)
const nearbyPickedPoint = ref<{ lat: number; lng: number } | null>(null)
const routeStops = ref<RouteStop[]>([])
const serverRouteStops = ref<RouteStop[]>([])
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const feedback = ref('')
const pruningSuccessSnackbar = ref(false)
const pruningSuccessMessage = ref('')
const planning = ref(route.query.mode === 'planning')
const activeRouteTab = ref<'todo' | 'completed'>('todo')
const isMobileViewport = ref(window.matchMedia('(max-width: 600px)').matches)
const routeMapDialogOpen = ref(false)
const pruningDialog = ref(false)
const activeStop = ref<RouteStop | null>(null)
const legacyDraftStops = ref<DailyRouteStopSnapshot[]>([])
const legacyImportDialog = ref(false)
const importingLegacyDrafts = ref(false)
const stopSyncState = reactive<Record<string, 'saving' | 'saved' | 'retry'>>({})
const retrySelection = reactive<Record<string, boolean>>({})
const completedCount = computed(
  () => serverRouteStops.value.filter((stop) => stop.status === 'COMPLETED').length,
)
const serverPendingRouteStops = computed(() =>
  serverRouteStops.value.filter((stop) => stop.status === 'PENDING'),
)
const serverCompletedRouteStops = computed(() =>
  serverRouteStops.value.filter((stop) => stop.status === 'COMPLETED'),
)
function isSharedManagerStop(treeId: string) {
  const user = appStore.user
  return (
    user?.role === 'USER' &&
    serverRouteStops.value.some(
      (stop) => stop.id === treeId && stop.ownerUserId && stop.ownerUserId !== user.id,
    )
  )
}
function canManageStop(stop: RouteStop) {
  const user = appStore.user
  return user?.role === 'MANAGER' || !stop.ownerUserId || stop.ownerUserId === user?.id
}
const canExecutePruning = computed(() => appStore.user?.role === 'USER')
const pendingRouteStops = computed(() =>
  planning.value ? routeStops.value : serverPendingRouteStops.value,
)
const displayedRouteStops = computed(() => {
  if (planning.value) return routeStops.value
  return activeRouteTab.value === 'todo'
    ? serverPendingRouteStops.value
    : serverCompletedRouteStops.value
})
const routeStopsForMap = computed(() => displayedRouteStops.value)
const routeCompleted = computed(
  () =>
    serverRouteStops.value.length > 0 &&
    serverPendingRouteStops.value.length === 0 &&
    !planning.value,
)
const nextPendingStop = computed(() => pendingRouteStops.value.find((stop) => stop.scheduleId))
const hasNextStop = computed(() =>
  pendingRouteStops.value.some((stop) => stop.scheduleId && stop.id !== activeStop.value?.id),
)
let serverRouteRequest = 0
let routeViewGeneration = 0

function applyServerSchedules(schedules: DailyRouteSchedule<Tree>[]) {
  const stops = [
    ...getDailyRouteSchedulesByStatus(schedules, 'PENDING'),
    ...getDailyRouteSchedulesByStatus(schedules, 'COMPLETED'),
  ]
  const originalOrder = new Map(schedules.map((stop, index) => [stop.id, index + 1]))
  serverRouteStops.value = stops
    .map((stop, index) => ({
      id: stop.treeId,
      order: stop.routeOrder || originalOrder.get(stop.id) || index + 1,
      tree: stop.tree,
      scheduleId: stop.id,
      ownerUserId: stop.userId,
      status: stop.status,
      pruning: stop.prunings?.[0],
      completedAt: stop.prunings?.[0]?.date,
    }))
    .sort((a, b) => a.order - b.order)
  routeStops.value = serverRouteStops.value.filter((stop) => stop.status === 'PENDING')
  for (const stop of routeStops.value) {
    if (stopSyncState[stop.id] !== 'retry') stopSyncState[stop.id] = 'saved'
  }
  updateVisibleRouteSummary(filters.date, schedules)
}

function updateVisibleRouteSummary(date: string, schedules: DailyRouteSchedule<Tree>[]) {
  if (date.slice(0, 7) !== selectedMonth.value) return
  const row = {
    date,
    pendingCount: schedules.filter((stop) => stop.type === 'PRUNING' && stop.status === 'PENDING')
      .length,
    completedCount: schedules.filter(
      (stop) => stop.type === 'PRUNING' && stop.status === 'COMPLETED',
    ).length,
  }
  const existingIndex = routeSummaries.value.findIndex((summary) => summary.date === date)
  if (!row.pendingCount && !row.completedCount) {
    if (existingIndex >= 0) routeSummaries.value.splice(existingIndex, 1)
    return
  }
  if (existingIndex >= 0) routeSummaries.value.splice(existingIndex, 1, row)
  else routeSummaries.value.push(row)
  routeSummaries.value.sort((a, b) => b.date.localeCompare(a.date))
}

async function loadRouteSummaries(month = selectedMonth.value) {
  const request = ++routeSummaryRequest
  summaryLoading.value = true
  summaryError.value = ''
  try {
    const summaries = await getDailyRouteSummary(month)
    if (month !== selectedMonth.value || request !== routeSummaryRequest) return
    routeSummaries.value = [...summaries].sort((a, b) => b.date.localeCompare(a.date))
  } catch {
    if (month !== selectedMonth.value || request !== routeSummaryRequest) return
    summaryError.value = 'Não foi possível carregar as rotas deste mês.'
  } finally {
    if (month === selectedMonth.value && request === routeSummaryRequest)
      summaryLoading.value = false
  }
}

function summaryDateLabel(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function openRouteDate(date: string) {
  router.push({ query: { date } })
}

function planRouteForDate() {
  if (!isCalendarDate(newRouteDate.value)) return
  router.push({ query: { date: newRouteDate.value, mode: 'planning' } })
  newRouteDialog.value = false
}

function openNewRouteDialog() {
  newRouteDate.value = localDate()
  newRouteDialog.value = true
}

function backToRouteList() {
  router.push({ path: route.path, query: {} })
}

async function refreshCurrentView() {
  errorMessage.value = ''
  if (routeDateSelected.value) {
    await Promise.all([loadServerRoute(), ...(planning.value ? [loadTrees()] : [])])
  } else {
    await loadRouteSummaries()
  }
}

function startPruning(stop: RouteStop) {
  if (
    !canExecutePruning.value ||
    !stop.scheduleId ||
    stop.status === 'COMPLETED' ||
    errorMessage.value
  ) return
  activeStop.value = stop
  pruningDialog.value = true
}
function pruningSaved(pruning: RoutePruning, next: boolean) {
  const stop = activeStop.value
  if (!stop) return
  feedback.value = ''
  stop.status = 'COMPLETED'
  stop.pruning = pruning
  stop.completedAt = pruning.date
  const serverStop = serverRouteStops.value.find((item) => item.scheduleId === stop.scheduleId)
  if (serverStop) {
    serverStop.status = 'COMPLETED'
    serverStop.pruning = pruning
    serverStop.completedAt = pruning.date
  }
  const speciesName = stop.tree.species?.commonName || stop.tree.speciesName || 'Árvore sem espécie'
  pruningSuccessMessage.value = `Poda salva · ${speciesName}. ${completedCount.value} de ${serverRouteStops.value.length} concluídas.`
  pruningSuccessSnackbar.value = true
  activeStop.value = null
  void loadServerRoute()
  if (next && nextPendingStop.value) {
    const upcoming = nextPendingStop.value
    nextTick(() => startPruning(upcoming))
  }
}
async function loadServerRoute() {
  const request = ++serverRouteRequest
  const requestedDate = filters.date
  try {
    const schedules = await getDailyRouteSchedules<Tree>(requestedDate)
    if (requestedDate !== filters.date || request !== serverRouteRequest) return
    applyServerSchedules(schedules)
  } catch {
    if (requestedDate !== filters.date || request !== serverRouteRequest) return
    errorMessage.value =
      'Não foi possível conferir a rota e as podas no servidor. Atualize antes de registrar um serviço.'
  }
}
const filters = reactive({
  date: isCalendarDate(route.query.date) ? route.query.date : localDate(),
  urgency: 'ALL',
  search: '',
})
const selectedMonth = ref(localDate().slice(0, 7))
const newRouteDate = ref(localDate())
const newRouteDialog = ref(false)
const routeSummaries = ref<DailyRouteSummary[]>([])
const summaryLoading = ref(false)
const summaryError = ref('')
let routeSummaryRequest = 0

// Paginação da lista de árvores (10 por página)
const page = ref(1)
const perPage = 10

// Mini-mapa da rota
const routeMapEl = ref<HTMLElement | null>(null)
let routeMap: L.Map | null = null
let routeLayer: L.LayerGroup | null = null
let routeControl: L.Routing.Control | null = null
let nearbyPickerMap: L.Map | null = null
let nearbyPickerMarker: L.CircleMarker | null = null
let nearbyPickerRequest = 0
let leafletRuntime: typeof import('leaflet') | null = null
let leafletModulesPromise: Promise<void> | null = null
let routeMapInitialization: Promise<void> | null = null
const routeMapLoading = ref(false)
const routeMapError = ref(false)
const roadRouteUnavailable = ref(false)
const nextTreeCatalogPage = ref(1)
const hasMoreTreeCatalog = ref(true)
let treeCatalogRequest = 0

function updateViewportMode() {
  isMobileViewport.value = window.matchMedia('(max-width: 600px)').matches
  if (!isMobileViewport.value) routeMapDialogOpen.value = false
}

function openMobileRouteMap() {
  routeMapDialogOpen.value = true
}

function closeMobileRouteMap() {
  routeMapDialogOpen.value = false
}

const candidateTrees = computed(() =>
  candidateMode.value === 'nearby' ? nearbyTrees.value : trees.value,
)
const prioritized = computed(() => {
  const treesByPriority = prioritizeTrees(candidateTrees.value)
  if (candidateMode.value !== 'nearby') return treesByPriority
  return treesByPriority.sort(
    (left, right) => (left.tree.distance_km ?? Infinity) - (right.tree.distance_km ?? Infinity),
  )
})
const completedTreeIds = computed(
  () => new Set(serverCompletedRouteStops.value.map((stop) => stop.id)),
)
const pendingTrees = computed(() => {
  if (planning.value) {
    return prioritized.value.filter(
      (item) => item.needsPruning && !completedTreeIds.value.has(item.tree.id),
    )
  }
  const priorityById = new Map(prioritized.value.map((item) => [item.tree.id, item]))
  const scheduledIds = new Set(serverPendingRouteStops.value.map((stop) => stop.id))
  const scheduled = serverPendingRouteStops.value.map((stop) => {
    const existing = priorityById.get(stop.id)
    if (existing) return existing
    const priority = prioritizeTree(stop.tree)
    return {
      ...priority,
      needsPruning: true,
      urgency: priority.urgency || 'HIGH',
      reason: 'Parada pendente da rota do dia.',
      recommendedAction: 'Executar ou remover esta parada.',
    }
  })
  return [
    ...scheduled,
    ...prioritized.value.filter(
      (item) =>
        item.needsPruning &&
        !completedTreeIds.value.has(item.tree.id) &&
        !scheduledIds.has(item.tree.id),
    ),
  ]
})
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
const selectedCount = computed(() => displayedRouteStops.value.length)

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
function treeName(item: PrioritizedTree<Tree>) {
  return (
    item.tree.species?.commonName ||
    item.tree.speciesName ||
    'Árvore sem espécie'
  )
}

function coordinates(tree: Tree) {
  return treeCoordinates(tree)
}

function setPlanningMode(enabled: boolean) {
  planning.value = enabled
  activeRouteTab.value = 'todo'
  void router.replace({
    query: { ...route.query, date: filters.date, mode: enabled ? 'planning' : undefined },
  })
  if (enabled) loadLegacyDrafts()
}

function enterPlanning() {
  errorMessage.value = ''
  setPlanningMode(true)
}

function leavePlanning() {
  setPlanningMode(false)
}

function loadLegacyDrafts() {
  const saved = readDailyRouteSnapshot(filters.date)
  const serverTreeIds = new Set(serverRouteStops.value.map((stop) => stop.id))
  legacyDraftStops.value = (saved?.stops ?? []).filter(
    (stop) => !stop.scheduleId && !serverTreeIds.has(stop.id),
  )
  if (legacyDraftStops.value.length) legacyImportDialog.value = true
}

async function setTreeSelected(treeId: string, selected: boolean): Promise<boolean> {
  if (saving.value) return false
  const isSelected = serverPendingRouteStops.value.some((stop) => stop.id === treeId)
  if (isSelected === selected) return true

  saving.value = true
  errorMessage.value = ''
  stopSyncState[treeId] = 'saving'
  delete retrySelection[treeId]
  const requestedDate = filters.date
  const requestedGeneration = routeViewGeneration
  try {
    const schedules = await setDailyRouteTreeSelected<Tree>(requestedDate, treeId, selected)
    if (requestedDate !== filters.date || requestedGeneration !== routeViewGeneration) return false
    applyServerSchedules(schedules)
    stopSyncState[treeId] = 'saved'
    return true
  } catch {
    if (requestedDate === filters.date && requestedGeneration === routeViewGeneration) {
      stopSyncState[treeId] = 'retry'
      retrySelection[treeId] = selected
    }
    return false
  } finally {
    saving.value = false
  }
}

function toggleTree(item: PrioritizedTree<Tree>) {
  if (saving.value || isSharedManagerStop(item.tree.id)) return
  void setTreeSelected(item.tree.id, !selectedIds.value.has(item.tree.id))
}

async function importLegacyDrafts() {
  if (importingLegacyDrafts.value || !legacyDraftStops.value.length) return
  importingLegacyDrafts.value = true
  legacyImportDialog.value = false
  let allImported = true
  for (const stop of legacyDraftStops.value) {
    const success = await setTreeSelected(stop.id, true)
    if (!success) allImported = false
  }
  if (allImported) {
    saveDailyRouteSnapshot({ date: filters.date, updatedAt: new Date().toISOString(), stops: [] })
    legacyDraftStops.value = []
    feedback.value = 'Os rascunhos foram confirmados e entraram na agenda do servidor.'
  } else {
    feedback.value = 'Alguns rascunhos não foram salvos. Confira as paradas com “Tentar novamente”.'
  }
  importingLegacyDrafts.value = false
}

function retryTreeSelection(treeId: string) {
  const selected = retrySelection[treeId]
  if (selected === undefined) return
  void setTreeSelected(treeId, selected)
}

async function loadTrees(loadNextPage = false) {
  if (loading.value && loadNextPage) return
  const request = ++treeCatalogRequest
  const pageNumber = loadNextPage ? nextTreeCatalogPage.value : 1
  if (!loadNextPage) {
    trees.value = []
    hasMoreTreeCatalog.value = true
    nextTreeCatalogPage.value = 1
  }
  loading.value = true
  errorMessage.value = ''
  try {
    const pageSize = 100
    const response = await apiConnect.get<Tree[]>('/trees', {
      params: { page: pageNumber, limit: pageSize, routeEditor: 'true' },
    })
    if (request !== treeCatalogRequest) return
    const pageTrees = response.data || []
    if (loadNextPage) {
      const loadedIds = new Set(trees.value.map(({ id }) => id))
      trees.value = [...trees.value, ...pageTrees.filter(({ id }) => !loadedIds.has(id))]
    } else {
      trees.value = pageTrees
    }
    nextTreeCatalogPage.value = pageNumber + 1
    hasMoreTreeCatalog.value = pageTrees.length === pageSize
    if (planning.value) loadLegacyDrafts()
  } catch {
    if (request === treeCatalogRequest) {
      errorMessage.value =
        'Não foi possível carregar as árvores. Verifique sua conexão e tente novamente.'
    }
  } finally {
    if (request === treeCatalogRequest) loading.value = false
  }
}

function loadMoreCatalogTrees() {
  if (candidateMode.value !== 'catalog' || !hasMoreTreeCatalog.value) return
  void loadTrees(true)
}

async function queryNearbyTrees(point: { lat: number; lng: number }, radiusKm: 2 | 5) {
  candidateMode.value = 'nearby'
  nearbyCenter.value = point
  nearbyRadiusKm.value = radiusKm
  const response = await apiConnect.getTreesNearby(point.lat, point.lng, radiusKm, 50, true)
  const records = Array.isArray(response.data) ? (response.data as Tree[]) : []
  nearbyTrees.value = records.filter((tree) => tree.id).map((tree) => ({
    ...tree,
    distance_km: Number.isFinite(Number(tree.distance_km)) ? Number(tree.distance_km) : undefined,
  }))
}

async function loadNearbyAt(point: { lat: number; lng: number }, radiusKm: 2 | 5) {
  if (nearbyLoading.value) return
  nearbyError.value = ''
  nearbyLoading.value = true
  try {
    await queryNearbyTrees(point, radiusKm)
  } catch {
    nearbyError.value = 'Não foi possível consultar as árvores próximas. Tente novamente.'
  } finally {
    nearbyLoading.value = false
  }
}

async function findNearbyFromDevice() {
  if (nearbyLoading.value) return
  nearbyError.value = ''
  candidateMode.value = 'nearby'
  if (!navigator.geolocation) {
    nearbyError.value = 'Este dispositivo não oferece GPS. Escolha um ponto no mapa.'
    return
  }

  nearbyLoading.value = true
  try {
    const point = await new Promise<{ lat: number; lng: number }>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
        reject,
        { enableHighAccuracy: false, maximumAge: 0, timeout: 12000 },
      )
    })
    await queryNearbyTrees(point, 2)
  } catch {
    nearbyError.value = 'Não foi possível obter sua localização. Escolha um ponto no mapa.'
  } finally {
    nearbyLoading.value = false
  }
}

function showCatalogCandidates() {
  candidateMode.value = 'catalog'
  nearbyError.value = ''
}

function openNearbyMapPicker() {
  nearbyPickedPoint.value = null
  nearbyPickerOpen.value = true
}

async function useNearbyMapPoint() {
  const point = nearbyPickedPoint.value
  if (!point) return
  nearbyPickerOpen.value = false
  await loadNearbyAt(point, 2)
}

function distanceLabel(tree: Tree) {
  const distance = Number(tree.distance_km)
  if (!Number.isFinite(distance) || distance < 0) return ''
  return distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(2)} km`
}

function openRouteOnMap() {
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
async function ensureRouteMap() {
  const mapElement = routeMapEl.value
  if (routeMap || !mapElement) return
  if (routeMapInitialization) {
    await routeMapInitialization
    return
  }

  routeMapLoading.value = true
  routeMapError.value = false
  const initialization = (async () => {
    if (!leafletModulesPromise) {
      leafletModulesPromise = (async () => {
        const leafletModule = await import('leaflet')
        const leafletGlobal = leafletModule.default as unknown as typeof import('leaflet')
        ;(window as Window & { L?: typeof leafletGlobal }).L = leafletGlobal
        await Promise.all([
          import('leaflet-routing-machine'),
          import('leaflet/dist/leaflet.css'),
          import('leaflet-routing-machine/dist/leaflet-routing-machine.css'),
        ])
        if (!leafletGlobal.Routing?.control) {
          throw new Error('Leaflet Routing Machine não foi inicializado.')
        }
        leafletRuntime = leafletGlobal
      })()
    }
    await leafletModulesPromise

    if (routeMap || !leafletRuntime || !mapElement.isConnected || routeMapEl.value !== mapElement)
      return

    routeMap = leafletRuntime
      .map(mapElement, { zoomControl: true, attributionControl: false })
      .setView([-5.2434, -38.1276], 13)
    leafletRuntime
      .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      })
      .addTo(routeMap)
    routeLayer = leafletRuntime.layerGroup().addTo(routeMap)
  })()
  routeMapInitialization = initialization
  try {
    await initialization
  } catch {
    leafletModulesPromise = null
    routeMapError.value = true
  } finally {
    if (routeMapInitialization === initialization) routeMapInitialization = null
    routeMapLoading.value = false
  }
}

function renderRouteOnMiniMap() {
  const L = leafletRuntime
  if (!L || !routeMap || !routeLayer) return
  routeLayer.clearLayers()
  if (routeControl) {
    routeMap.removeControl(routeControl)
    routeControl = null
  }
  roadRouteUnavailable.value = false

  const stopsForMap = routeStopsForMap.value
  const points: [number, number][] = stopsForMap
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

  // Linha provisória e waypoints respeitam exatamente a ordem confirmada pela API.
  if (points.length > 1 && (planning.value || activeRouteTab.value === 'todo')) {
    L.polyline(points, {
      color: '#1565c0',
      weight: 4,
      opacity: 0.28,
      dashArray: '8 8',
    }).addTo(routeLayer)
    const control = L.Routing.control({
      plan: L.Routing.plan(
        points.map(([latitude, longitude]) => L.latLng(latitude, longitude)),
        {
          addWaypoints: false,
          draggableWaypoints: false,
          createMarker: () => false,
        },
      ),
      lineOptions: {
        extendToWaypoints: false,
        missingRouteTolerance: 0,
        styles: [
          { color: '#0f2f5f', opacity: 0.18, weight: 10 },
          { color: '#2563eb', opacity: 0.9, weight: 5 },
        ],
      },
      addWaypoints: false,
      fitSelectedRoutes: false,
      showAlternatives: false,
      show: false,
    }).addTo(routeMap)
    routeControl = control
    control.on('routingerror', () => {
      roadRouteUnavailable.value = true
    })
    control.on('routesfound', () => {
      roadRouteUnavailable.value = false
    })
  }

  // O número corresponde à parada original, mesmo quando há coordenadas ausentes.
  stopsForMap.forEach((stop) => {
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
        if (
          canExecutePruning.value &&
          stop.scheduleId &&
          stop.status !== 'COMPLETED' &&
          !errorMessage.value
        )
          startPruning(stop)
      })
      .addTo(routeLayer!)
  })

  routeMap.fitBounds(L.latLngBounds(points).pad(0.25))
}

function retryRoadRoute() {
  if (!routeMap) return
  roadRouteUnavailable.value = false
  renderRouteOnMiniMap()
}

watch(
  [routeStops, serverRouteStops, activeRouteTab, planning],
  async () => {
    await nextTick()
    if (isMobileViewport.value && (!routeMapDialogOpen.value || !routeMap)) return
    if (!routeDateSelected.value) {
      if (routeMap) {
        routeMap.remove()
        routeMap = null
        routeLayer = null
        routeControl = null
      }
      return
    }
    await ensureRouteMap()
    routeMap?.invalidateSize()
    renderRouteOnMiniMap()
  },
  { deep: true },
)

watch(routeMapDialogOpen, async (opened) => {
  if (!opened) {
    if (routeMap) {
      routeMap.remove()
      routeMap = null
      routeLayer = null
      routeControl = null
    }
    routeMapError.value = false
    return
  }
  if (!isMobileViewport.value) return

  await nextTick()
  await ensureRouteMap()
  await nextTick()
  routeMap?.invalidateSize()
  renderRouteOnMiniMap()
})

watch(nearbyPickerOpen, async (opened) => {
  const request = ++nearbyPickerRequest
  if (!opened) {
    nearbyPickerMap?.remove()
    nearbyPickerMap = null
    nearbyPickerMarker = null
    nearbyPickedPoint.value = null
    return
  }

  await nextTick()
  const leafletModule = await import('leaflet')
  await import('leaflet/dist/leaflet.css')
  const leaflet = leafletModule.default as unknown as typeof import('leaflet')
  if (request !== nearbyPickerRequest || !nearbyPickerOpen.value || !nearbyPickerElement.value)
    return

  const center = nearbyCenter.value || { lat: -3.7319, lng: -38.5267 }
  nearbyPickerMap = leaflet
    .map(nearbyPickerElement.value, { scrollWheelZoom: true })
    .setView([center.lat, center.lng], 14)
  leaflet
    .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    })
    .addTo(nearbyPickerMap)
  nearbyPickerMap.on('click', (event) => {
    const point = { lat: event.latlng.lat, lng: event.latlng.lng }
    nearbyPickedPoint.value = point
    if (nearbyPickerMarker) nearbyPickerMarker.setLatLng([point.lat, point.lng])
    else {
      nearbyPickerMarker = leaflet
        .circleMarker([point.lat, point.lng], {
          radius: 9,
          color: '#ffffff',
          weight: 3,
          fillColor: '#19734a',
          fillOpacity: 1,
        })
        .addTo(nearbyPickerMap!)
    }
  })
  await nextTick()
  nearbyPickerMap?.invalidateSize()
})

watch(
  () => filters.date,
  (date) => {
    if (routeDateSelected.value && isCalendarDate(date) && route.query.date !== date)
      void router.replace({ query: { ...route.query, date } })
  },
)

watch(
  () => [route.query.date, route.query.mode] as const,
  async ([date, mode]) => {
    routeViewGeneration += 1
    if (!isCalendarDate(date)) {
      planning.value = false
      treeCatalogRequest += 1
      loading.value = false
      trees.value = []
      candidateMode.value = 'catalog'
      routeStops.value = []
      serverRouteStops.value = []
      serverRouteRequest += 1
      void loadRouteSummaries()
      return
    }

    filters.date = date
    planning.value = mode === 'planning'
    activeRouteTab.value = 'todo'
    routeStops.value = []
    serverRouteStops.value = []
    Object.keys(stopSyncState).forEach((treeId) => delete stopSyncState[treeId])
    Object.keys(retrySelection).forEach((treeId) => delete retrySelection[treeId])
    legacyDraftStops.value = []
    errorMessage.value = ''
    candidateMode.value = 'catalog'
    nearbyTrees.value = []
    nearbyError.value = ''
    if (!planning.value) {
      treeCatalogRequest += 1
      loading.value = false
      trees.value = []
    }
    await Promise.all([loadServerRoute(), ...(planning.value ? [loadTrees()] : [])])
    if (planning.value) loadLegacyDrafts()
  },
  { immediate: true },
)

watch(selectedMonth, (month) => {
  if (/^\d{4}-\d{2}$/.test(month)) void loadRouteSummaries(month)
})

onMounted(() => window.addEventListener('resize', updateViewportMode, { passive: true }))

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewportMode)
  nearbyPickerRequest += 1
  nearbyPickerMap?.remove()
  nearbyPickerMap = null
  nearbyPickerMarker = null
  if (routeMap) {
    routeMap.remove()
    routeMap = null
    routeLayer = null
    routeControl = null
  }
})
</script>

<template>
  <v-container fluid class="page-shell py-8">
    <PageHeader
      :title="
        !routeDateSelected
          ? 'Rotas'
          : planning
            ? 'Editar rota'
            : `Rota de ${filters.date.split('-').reverse().join('/')}`
      "
      :subtitle="
        !routeDateSelected
          ? 'Consulte as rotas salvas e planeje novas datas.'
          : planning
            ? 'Selecione árvores e acompanhe a ordem confirmada pela agenda.'
            : 'Veja as paradas da data e registre cada serviço na árvore correta.'
      "
      :breadcrumbs="[{ text: 'Meu Painel', to: homeBase }, { text: 'Rotas' }]"
      :show-back-button="!routeDateSelected"
    >
      <template v-if="routeDateSelected" #actions>
        <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="backToRouteList"
          >Voltar</v-btn
        >
        <v-btn
          v-if="!planning"
          color="primary"
          variant="tonal"
          prepend-icon="mdi-pencil"
          @click="enterPlanning"
          >Editar</v-btn
        >
        <v-btn v-else variant="outlined" prepend-icon="mdi-check" @click="leavePlanning"
          >Concluir edição</v-btn
        >
      </template>
    </PageHeader>
    <template v-if="!routeDateSelected">
      <div class="route-summary-toolbar mb-5">
        <v-text-field
          v-model="selectedMonth"
          type="month"
          label="Mês das rotas"
          variant="outlined"
          density="comfortable"
          hide-details
          class="route-month-field"
        />
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          class="text-none"
          @click="openNewRouteDialog"
        >
          Planejar rota
        </v-btn>
      </div>
      <v-alert v-if="summaryError" type="error" variant="tonal" class="mb-4">
        {{ summaryError }}
        <v-btn variant="text" color="error" @click="loadRouteSummaries()">Tentar novamente</v-btn>
      </v-alert>
      <v-card class="route-summary-card" elevation="0">
        <v-progress-linear v-if="summaryLoading" indeterminate color="primary" />
        <div v-if="!summaryLoading && !routeSummaries.length" class="route-summary-empty">
          <v-icon size="44" color="primary">mdi-calendar-search</v-icon>
          <p class="text-body-1 font-weight-medium mb-1">Nenhuma rota salva neste mês</p>
          <p class="text-body-2 text-medium-emphasis mb-0">
            Use Planejar rota para escolher uma data.
          </p>
        </div>
        <v-list v-else-if="routeSummaries.length" lines="two" class="pa-0">
          <v-list-item
            v-for="summary in routeSummaries"
            :key="summary.date"
            class="route-summary-row"
            :class="{ 'route-summary-row--today': summary.date === localDate() }"
            :title="summaryDateLabel(summary.date)"
            :subtitle="
              summary.date === localDate() ? 'Hoje · abrir rota salva' : 'Abrir rota desta data'
            "
            prepend-icon="mdi-map-marker-path"
            append-icon="mdi-chevron-right"
            role="button"
            tabindex="0"
            @click="openRouteDate(summary.date)"
            @keydown.enter="openRouteDate(summary.date)"
            @keydown.space.prevent="openRouteDate(summary.date)"
          >
            <template #append>
              <div class="route-summary-counts">
                <v-chip color="warning" variant="tonal" size="small">
                  {{ summary.pendingCount }} pendentes
                </v-chip>
                <v-chip color="success" variant="tonal" size="small">
                  {{ summary.completedCount }} concluídas
                </v-chip>
                <v-icon>mdi-chevron-right</v-icon>
              </div>
            </template>
          </v-list-item>
        </v-list>
      </v-card>
      <v-dialog v-model="newRouteDialog" max-width="440">
        <v-card rounded="xl">
          <v-card-title>Planejar rota</v-card-title>
          <v-card-text>
            <v-text-field
              v-model="newRouteDate"
              type="date"
              label="Data da rota"
              variant="outlined"
            />
            <p class="text-body-2 text-medium-emphasis mb-0">
              Se a data já tiver uma rota salva, ela será aberta para edição.
            </p>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="newRouteDialog = false">Cancelar</v-btn>
            <v-btn
              color="primary"
              variant="flat"
              :disabled="!isCalendarDate(newRouteDate)"
              @click="planRouteForDate"
              >Continuar</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-dialog>
    </template>
    <template v-else>
      <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-6 route-page-actions">
        <div class="d-flex flex-wrap align-center ga-2">
          <v-btn
            variant="text"
            prepend-icon="mdi-refresh"
            :loading="loading || summaryLoading"
            @click="refreshCurrentView"
            >Atualizar rota</v-btn
          >
        </div>
      </div>

      <v-row v-if="planning" class="route-date-row mb-4">
        <v-col cols="12" sm="5" md="3">
          <v-text-field
            v-model="filters.date"
            :disabled="saving || loading || importingLegacyDrafts"
            type="date"
            label="Dia da rota"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </v-col>
      </v-row>

      <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-4">
        {{ errorMessage }}
        <v-btn variant="text" color="error" @click="refreshCurrentView">Tentar novamente</v-btn>
      </v-alert>
      <v-alert v-if="feedback" type="info" variant="tonal" closable class="mb-4">{{
        feedback
      }}</v-alert>
      <v-alert
        v-if="planning && legacyDraftStops.length"
        type="warning"
        variant="tonal"
        density="compact"
        class="mb-4"
      >
        Há {{ legacyDraftStops.length }} rascunho(s) antigos neste navegador. Eles ainda não fazem
        parte da agenda.
        <v-btn variant="text" color="warning" @click="legacyImportDialog = true"
          >Revisar e importar</v-btn
        >
      </v-alert>

      <div class="execution-toolbar mb-5">
        <v-btn :to="`${homeBase}/podas`" variant="text" color="primary" prepend-icon="mdi-history"
          >Histórico de podas</v-btn
        >
      </div>
      <v-card
        v-if="!planning && serverRouteStops.length"
        class="execution-summary mb-5"
        elevation="0"
      >
        <div>
          <span class="text-overline">{{
            routeCompleted ? 'Rota concluída' : 'Andamento do trabalho'
          }}</span>
          <h2>{{ completedCount }} de {{ serverRouteStops.length }} árvores atendidas</h2>
          <p>
            {{
              routeCompleted
                ? 'Todas as podas desta rota foram registradas.'
                : 'Navegue até a árvore, confira a identificação e registre o que foi feito.'
            }}
          </p>
        </div>
        <v-progress-linear
          :model-value="(completedCount / serverRouteStops.length) * 100"
          color="success"
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
              <template #prepend><v-icon color="primary">mdi-filter-variant</v-icon></template>
              <v-card-title>Árvores que precisam de ação</v-card-title>
              <v-card-subtitle
                >{{ pendingTrees.length }} pendências ordenadas por urgência</v-card-subtitle
              >
            </v-card-item>
            <v-divider />
            <v-card-text>
              <div class="d-flex flex-wrap align-center ga-2 mb-4">
                <v-btn
                  color="primary"
                  variant="tonal"
                  prepend-icon="mdi-crosshairs-gps"
                  :loading="nearbyLoading"
                  :disabled="nearbyLoading || !!errorMessage"
                  @click="findNearbyFromDevice"
                  >Perto de mim</v-btn
                >
                <v-btn
                  v-if="candidateMode === 'nearby'"
                  variant="text"
                  prepend-icon="mdi-format-list-bulleted"
                  :disabled="nearbyLoading"
                  @click="showCatalogCandidates"
                  >Buscar no catálogo</v-btn
                >
                <v-btn
                  v-if="candidateMode === 'nearby' && nearbyRadiusKm === 2 && nearbyTrees.length < 50"
                  variant="text"
                  color="primary"
                  :disabled="nearbyLoading || !nearbyCenter"
                  @click="nearbyCenter && loadNearbyAt(nearbyCenter, 5)"
                  >Ampliar para 5 km</v-btn
                >
                <span v-if="candidateMode === 'nearby'" class="text-caption text-medium-emphasis">
                  {{ nearbyTrees.length }} candidatas em até {{ nearbyRadiusKm }} km, por distância
                </span>
              </div>
              <v-alert v-if="nearbyError" type="warning" variant="tonal" class="mb-4">
                {{ nearbyError }}
                <v-btn variant="text" color="warning" @click="openNearbyMapPicker"
                  >Escolher ponto no mapa</v-btn
                >
              </v-alert>
              <v-row dense>
                <v-col cols="12" sm="4"
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
                <v-col cols="12" sm="8"
                  ><v-text-field
                    v-model="filters.search"
                    label="Buscar espécie, código ou coordenada"
                    prepend-inner-icon="mdi-magnify"
                    clearable
                    variant="outlined"
                    density="comfortable"
                    @keydown.enter.prevent="loadMoreCatalogTrees"
                /></v-col>
              </v-row>
              <div class="d-flex flex-wrap justify-space-between align-center mb-3 ga-2">
                <span class="text-caption text-grey-darken-1"
                  >{{ filteredTrees.length }} resultado(s)</span
                >
                <span class="text-caption text-medium-emphasis"
                  >Marcar uma árvore salva a parada imediatamente.</span
                >
              </div>

              <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-3" />
              <div v-if="!loading && filteredTrees.length === 0" class="empty-state">
                <v-icon size="48" color="primary">mdi-tree-check</v-icon>
                <p class="text-body-2 mt-2 mb-0">Nenhuma árvore pendente para este filtro.</p>
                <v-btn
                  v-if="candidateMode === 'catalog' && hasMoreTreeCatalog"
                  variant="text"
                  color="primary"
                  class="mt-2"
                  @click="loadMoreCatalogTrees"
                  >Buscar na próxima página</v-btn
                >
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
                        color="primary"
                        :disabled="saving || !!errorMessage || isSharedManagerStop(item.tree.id)"
                        @click.stop
                        @update:model-value="setTreeSelected(item.tree.id, Boolean($event))"
                      />
                    </template>
                    <v-list-item-title class="font-weight-bold">{{
                      treeName(item)
                    }}</v-list-item-title>
                    <v-list-item-subtitle
                      >{{ item.reason }} · {{ coordinates(item.tree)
                      }}<span v-if="distanceLabel(item.tree)"> · ~{{ distanceLabel(item.tree) }}</span>
                    </v-list-item-subtitle
                    >
                    <template #append>
                      <div class="tree-row-append">
                        <v-chip size="small" :color="urgencyColor(item.urgency)" variant="tonal">
                          {{ urgencyLabel(item.urgency) }}
                        </v-chip>
                        <div
                          v-if="stopSyncState[item.tree.id]"
                          class="stop-sync-state"
                          role="status"
                        >
                          <span v-if="stopSyncState[item.tree.id] === 'saving'" class="sync-saving">
                            <v-progress-circular indeterminate size="14" width="2" />
                            Salvando
                          </span>
                          <v-btn
                            v-else-if="stopSyncState[item.tree.id] === 'retry'"
                            size="x-small"
                            variant="text"
                            color="error"
                            :disabled="saving"
                            @click.stop="retryTreeSelection(item.tree.id)"
                            >Tentar novamente</v-btn
                          >
                          <span v-else>Salvo</span>
                        </div>
                      </div>
                    </template>
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
                    color="primary"
                  />
                </div>
                <div
                  v-if="candidateMode === 'catalog' && hasMoreTreeCatalog"
                  class="d-flex justify-center mt-2"
                >
                  <v-btn
                    variant="text"
                    color="primary"
                    :loading="loading"
                    :disabled="loading || !!errorMessage"
                    @click="loadMoreCatalogTrees"
                    >Carregar mais árvores</v-btn
                  >
                </div>
              </template>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" :lg="planning ? 5 : 12">
          <v-card elevation="0" class="panel-card route-card">
            <v-card-item>
              <template #prepend><v-icon color="primary">mdi-route</v-icon></template>
              <v-card-title>{{
                planning
                  ? 'Na rota'
                  : `Rota de ${filters.date.split('-').reverse().join('/')}`
              }}</v-card-title>
              <v-card-subtitle> {{ selectedCount }} paradas </v-card-subtitle>
              <template #append>
                <v-btn
                  v-if="isMobileViewport"
                  variant="tonal"
                  color="primary"
                  prepend-icon="mdi-map"
                  :disabled="!displayedRouteStops.length || saving || loading || !!errorMessage"
                  @click="openMobileRouteMap"
                  >Mapa</v-btn
                >
                <v-btn
                  v-else-if="!planning"
                  variant="tonal"
                  color="primary"
                  prepend-icon="mdi-map"
                  :disabled="!serverRouteStops.length || saving || loading || !!errorMessage"
                  @click="openRouteOnMap"
                  >Ver mapa</v-btn
                >
              </template>
            </v-card-item>
            <v-divider />
            <v-card-text>
              <v-tabs v-if="!planning" v-model="activeRouteTab" color="success" class="mb-4" grow>
                <v-tab value="todo">A fazer ({{ serverPendingRouteStops.length }})</v-tab>
                <v-tab value="completed">
                  Concluídas ({{ serverCompletedRouteStops.length }})
                </v-tab>
              </v-tabs>

              <!-- Mini-mapa com a rota -->
              <div
                v-if="
                  !isMobileViewport &&
                  (planning || activeRouteTab === 'completed' || !routeCompleted)
                "
                class="route-minimap-wrap mb-4"
                :class="{ 'route-minimap-wrap--execution': !planning }"
              >
                <div ref="routeMapEl" class="route-minimap" />
                <v-progress-linear
                  v-if="routeMapLoading"
                  class="route-map-loading"
                  indeterminate
                  color="primary"
                  aria-label="Carregando mapa da rota"
                />
                <v-alert
                  v-if="routeMapError"
                  class="route-map-error"
                  type="error"
                  variant="tonal"
                  density="compact"
                  role="alert"
                >
                  Não foi possível abrir o mapa.
                  <v-btn variant="text" color="error" @click="ensureRouteMap"
                    >Tentar novamente</v-btn
                  >
                </v-alert>
                <v-alert
                  v-if="roadRouteUnavailable"
                  class="route-map-warning"
                  type="warning"
                  variant="tonal"
                  density="compact"
                  role="status"
                >
                  Trajeto pelas ruas indisponível. A sequência numerada permanece no mapa.
                  <v-btn variant="text" color="warning" @click="retryRoadRoute"
                    >Tentar novamente</v-btn
                  >
                </v-alert>
                <div v-if="!routeStopsForMap.length" class="route-minimap-hint">
                  <v-icon size="18" class="mr-1">mdi-information-outline</v-icon>
                  Nenhuma parada para mostrar no mapa
                </div>
              </div>

              <div v-if="displayedRouteStops.length === 0" class="empty-state">
                <v-icon size="48" color="primary">mdi-map-marker-path</v-icon>
                <p class="text-body-2 mt-2 mb-0">
                  {{
                    planning
                      ? 'Marque árvores para adicioná-las à agenda da rota.'
                      : activeRouteTab === 'todo'
                        ? 'Não há paradas pendentes para esta data.'
                        : 'Não há atendimentos concluídos para esta data.'
                  }}
                </p>
              </div>
              <v-list v-else lines="two" class="pa-0">
                <v-list-item
                  v-for="stop in displayedRouteStops"
                  :key="stop.id"
                  class="route-stop mb-2"
                  :class="{ 'route-stop--completed': stop.status === 'COMPLETED' }"
                >
                  <v-chip
                    v-if="!planning && activeRouteTab === 'todo' && stop.id === nextPendingStop?.id"
                    color="success"
                    variant="tonal"
                    size="small"
                    class="next-stop-label"
                    prepend-icon="mdi-map-marker-star"
                    >Próxima parada</v-chip
                  >
                  <template #prepend
                    ><v-avatar color="primary" size="32"
                      ><v-icon color="on-primary" size="18">mdi-map-marker</v-icon
                      ><span class="route-number">{{ stop.order }}</span></v-avatar
                    ></template
                  >
                  <v-list-item-title class="font-weight-bold">
                    Parada {{ stop.order }} ·
                    {{ stop.tree.species?.commonName || stop.tree.speciesName || 'Árvore sem espécie' }}
                  </v-list-item-title>
                  <v-list-item-subtitle class="stop-identity"
                    >Identificação: #{{ stop.id }}<br />{{
                      coordinates(stop.tree)
                    }}</v-list-item-subtitle
                  >
                  <v-chip
                    v-if="appStore.user?.role === 'USER' && !canManageStop(stop)"
                    class="mt-2"
                    size="small"
                    color="primary"
                    variant="tonal"
                  >
                    Parada planejada pelo gestor
                  </v-chip>
                  <div class="stop-work mt-3">
                    <template v-if="stop.status === 'COMPLETED'">
                      <v-chip
                        color="success"
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
                      <p v-else-if="stop.completedAt" class="text-body-2 mt-2">
                        Atendida em {{ new Date(stop.completedAt).toLocaleDateString('pt-BR') }}
                      </p>
                      <p v-else class="text-caption mt-2">Data do atendimento não informada.</p>
                      <p
                        v-if="stop.pruning?.observations"
                        class="text-body-2 mt-1 stop-observation"
                      >
                        {{ stop.pruning.observations }}
                      </p>
                    </template>
                    <div v-else-if="!planning" class="stop-work-actions">
                      <v-btn
                        v-if="canExecutePruning"
                        color="success"
                        variant="flat"
                        prepend-icon="mdi-content-cut"
                        :disabled="saving || !!errorMessage || !stop.scheduleId"
                        @click="startPruning(stop)"
                        >Registrar poda</v-btn
                      >
                      <v-btn
                        variant="tonal"
                        color="primary"
                        prepend-icon="mdi-navigation-variant"
                        @click="openExternalNavigation(stop)"
                        >Ir até a árvore</v-btn
                      >
                    </div>
                  </div>
                  <template #append>
                    <div v-if="planning" class="route-stop-actions">
                      <span class="stop-sync-state" role="status">
                        <span v-if="stopSyncState[stop.id] === 'saving'" class="sync-saving">
                          <v-progress-circular indeterminate size="14" width="2" />
                          Salvando
                        </span>
                        <template v-else-if="stopSyncState[stop.id] === 'retry'">
                          <v-btn
                            size="x-small"
                            variant="text"
                            color="error"
                            :disabled="saving"
                            @click="retryTreeSelection(stop.id)"
                            >Tentar novamente</v-btn
                          >
                        </template>
                        <template v-else>Salvo</template>
                      </span>
                      <v-btn
                        icon="mdi-close"
                        size="x-small"
                        variant="text"
                        color="error"
                        :aria-label="`Remover árvore ${stop.id} da rota`"
                        :disabled="saving || !canManageStop(stop)"
                        @click="setTreeSelected(stop.id, false)"
                      />
                    </div>
                  </template>
                </v-list-item>
              </v-list>
              <div v-if="planning && routeStops.length" class="route-ready-footer">
                <v-alert
                  type="success"
                  variant="tonal"
                  density="compact"
                  class="route-ready-alert mb-0"
                >
                  <template #prepend><v-icon>mdi-check-circle-outline</v-icon></template>
                  <strong
                    >{{ serverCompletedRouteStops.length }} concluídas ·
                    {{ serverPendingRouteStops.length }} pendentes na agenda.</strong
                  >
                  <span class="route-ready-copy"
                    >A agenda salva cada seleção e calcula a ordem automaticamente.</span
                  >
                </v-alert>
                <div v-if="serverPendingRouteStops.length" class="route-ready-actions">
                  <v-btn
                    color="primary"
                    variant="flat"
                    class="text-none"
                    prepend-icon="mdi-map-marker-path"
                    :disabled="loading || saving || !!errorMessage"
                    @click="openRouteOnMap"
                    >Abrir no mapa</v-btn
                  >
                  <v-btn
                    color="primary"
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
      <v-dialog
        v-model="routeMapDialogOpen"
        fullscreen
        transition="dialog-bottom-transition"
        class="route-map-dialog"
      >
        <v-card class="route-map-dialog-card">
          <v-toolbar density="comfortable" color="surface">
            <v-btn
              icon="mdi-arrow-left"
              variant="text"
              aria-label="Voltar para a lista da rota"
              @click="closeMobileRouteMap"
            />
            <v-toolbar-title
              >Mapa da rota de {{ filters.date.split('-').reverse().join('/') }}</v-toolbar-title
            >
          </v-toolbar>
          <div class="route-map-dialog-body">
            <div ref="routeMapEl" class="route-minimap route-minimap--dialog" />
            <v-progress-linear
              v-if="routeMapLoading"
              class="route-map-loading"
              indeterminate
              color="primary"
              aria-label="Carregando mapa da rota"
            />
            <v-alert
              v-if="routeMapError"
              class="route-map-error"
              type="error"
              variant="tonal"
              density="compact"
              role="alert"
            >
              Não foi possível abrir o mapa.
              <v-btn variant="text" color="error" @click="ensureRouteMap">Tentar novamente</v-btn>
            </v-alert>
            <v-alert
              v-if="roadRouteUnavailable"
              class="route-map-warning"
              type="warning"
              variant="tonal"
              density="compact"
              role="status"
            >
              Trajeto pelas ruas indisponível. A sequência numerada permanece no mapa.
              <v-btn variant="text" color="warning" @click="retryRoadRoute">Tentar novamente</v-btn>
            </v-alert>
          </div>
        </v-card>
      </v-dialog>
      <PruningExecutionDialog
        v-model="pruningDialog"
        :tree="activeStop?.tree || null"
        :schedule-id="activeStop?.scheduleId"
        :order="activeStop?.order"
        :has-next="hasNextStop"
        @saved="pruningSaved"
      />
      <v-dialog v-model="legacyImportDialog" max-width="560" :persistent="importingLegacyDrafts">
        <v-card rounded="xl">
          <v-card-title>Importar rascunhos antigos?</v-card-title>
          <v-card-text>
            <p class="mb-3">
              Estes rascunhos estão salvos somente neste navegador. Confirme para criar ou atualizar
              as paradas na agenda do servidor.
            </p>
            <v-list density="compact" class="legacy-draft-list">
              <v-list-item v-for="stop in legacyDraftStops" :key="stop.id">
                <v-list-item-title>{{
                  stop.label || `Árvore #${stop.id.slice(-6)}`
                }}</v-list-item-title>
                <v-list-item-subtitle>
                  #{{ stop.id }} · {{ stop.latitude.toFixed(5) }}, {{ stop.longitude.toFixed(5) }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
          <v-card-actions class="flex-wrap">
            <v-btn :disabled="importingLegacyDrafts" @click="legacyImportDialog = false"
              >Manter no navegador</v-btn
            >
            <v-spacer />
            <v-btn
              color="primary"
              variant="flat"
              :loading="importingLegacyDrafts"
              @click="importLegacyDrafts"
              >Confirmar importação</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog v-model="nearbyPickerOpen" max-width="820">
        <v-card rounded="xl">
          <v-card-title>Escolher ponto no mapa</v-card-title>
          <v-card-text>
            <p class="text-body-2 text-medium-emphasis">
              Toque no mapa para escolher um ponto de referência para a busca por proximidade.
            </p>
            <div ref="nearbyPickerElement" class="nearby-point-picker-map" />
            <p v-if="nearbyPickedPoint" class="text-caption mt-2 mb-0" role="status">
              Ponto escolhido: {{ nearbyPickedPoint.lat.toFixed(5) }},
              {{ nearbyPickedPoint.lng.toFixed(5) }}
            </p>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="nearbyPickerOpen = false">Cancelar</v-btn>
            <v-btn
              color="primary"
              variant="flat"
              :disabled="!nearbyPickedPoint || nearbyLoading"
              @click="useNearbyMapPoint"
              >Buscar a partir deste ponto</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-dialog>
    </template>
    <v-snackbar
      v-model="pruningSuccessSnackbar"
      color="success"
      timeout="4500"
      location="bottom right"
      role="status"
    >
      {{ pruningSuccessMessage }}
      <template #actions>
        <v-btn
          variant="text"
          aria-label="Fechar confirmação da poda"
          @click="pruningSuccessSnackbar = false"
        >
          Fechar
        </v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<style scoped>
.route-summary-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.route-month-field {
  max-width: 260px;
}
.route-summary-card {
  min-height: 150px;
  overflow: hidden;
  border: 1px solid var(--mt-border);
  border-radius: 16px;
  background: var(--mt-surface);
}
.route-summary-empty {
  display: flex;
  min-height: 230px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28px;
  text-align: center;
}
.route-summary-row {
  min-height: 78px;
  border-bottom: 1px solid var(--mt-border);
  cursor: pointer;
}
.route-summary-row:last-child {
  border-bottom: 0;
}
.route-summary-row--today {
  border-left: 4px solid var(--mt-green);
  background: var(--mt-surface-soft);
}
.route-summary-counts {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sync-saving {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--mt-text-muted);
  font-size: 0.72rem;
}
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
  border: 1px solid var(--mt-border);
  border-radius: 16px;
  background: var(--mt-surface-soft);
}
.next-stop-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 22px;
  border: 1px solid var(--mt-border);
  border-radius: 16px;
  background: var(--mt-surface);
}
.next-stop-copy h2 {
  margin: 2px 0 4px;
  font-size: 1.15rem;
}
.next-stop-copy p {
  margin: 0;
  color: var(--mt-text-muted);
  font-size: 0.82rem;
}
.execution-summary h2 {
  font-size: 1.3rem;
  color: var(--mt-forest);
}
.execution-summary p {
  color: var(--mt-text-muted);
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
  background: var(--mt-surface-soft);
  border-color: var(--mt-border) !important;
}
.stop-work {
  padding-bottom: 8px;
}
.route-minimap-wrap--execution {
  max-height: 260px;
}
.route-map-warning {
  position: absolute;
  z-index: 800;
  left: 12px;
  right: 12px;
  bottom: 12px;
}
.tree-row-append,
.route-stop-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}
.stop-sync-state {
  min-height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  font-size: 0.72rem;
  color: var(--mt-text-muted);
}
.legacy-draft-list {
  max-height: 260px;
  overflow-y: auto;
  background: var(--mt-surface-soft);
  border-radius: 12px;
}
@media (max-width: 600px) {
  .route-summary-toolbar {
    align-items: stretch;
    flex-direction: column;
  }
  .route-month-field {
    max-width: none;
  }
  .route-summary-counts {
    gap: 4px;
  }
  .route-summary-counts :deep(.v-chip) {
    font-size: 0.65rem;
  }
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
  .next-stop-card {
    align-items: stretch;
    flex-direction: column;
  }
  .tree-row-append {
    align-items: flex-end;
  }
}

.panel-card {
  border: 1px solid var(--mt-border);
  border-radius: 18px;
  height: 100%;
}
.tree-row,
.route-stop {
  border: 1px solid var(--mt-border);
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
  border-color: rgb(var(--v-theme-primary));
  background: var(--mt-surface-soft);
}
.suggestion-banner {
  border: 1px solid rgba(var(--v-theme-primary), 0.32);
  border-radius: 16px;
  padding: 14px;
  background: rgb(var(--v-theme-surface-variant));
}
.suggestion-button {
  min-height: 42px;
  box-shadow: 0 6px 18px rgba(46, 125, 50, 0.2);
}
.route-number {
  position: absolute;
  font-size: 0.7rem;
  font-weight: 800;
  color: rgb(var(--v-theme-on-primary));
  margin-left: 1px;
}
.empty-state {
  min-height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--mt-text-muted);
  text-align: center;
}

/* Mini-mapa da rota */
.route-minimap-wrap {
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--mt-border);
}

.route-minimap {
  height: 220px;
  width: 100%;
  z-index: 0;
}

.route-map-dialog-card {
  display: flex;
  flex-direction: column;
  height: 100dvh;
}

.route-map-dialog-body {
  position: relative;
  flex: 1;
  min-height: 0;
}
.nearby-point-picker-map {
  width: 100%;
  height: min(62dvh, 560px);
  min-height: 320px;
  overflow: hidden;
  border: 1px solid var(--mt-border);
  border-radius: 12px;
  background: var(--mt-surface-soft);
}
.route-map-loading {
  position: absolute;
  z-index: 500;
  top: 10px;
  left: 50%;
  width: min(220px, calc(100% - 32px));
  transform: translateX(-50%);
}
.route-map-error {
  position: absolute;
  z-index: 600;
  top: 18px;
  right: 18px;
  left: 18px;
  width: auto;
}

.route-minimap--dialog {
  height: 100%;
}

.next-stop-label {
  margin-bottom: 8px;
}

.route-minimap-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--mt-surface) 82%, transparent);
  color: var(--mt-text-muted);
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
  .nearby-point-picker-map {
    height: 52dvh;
    min-height: 280px;
  }
}
</style>

<style>
/* Pin numerado da rota (não-scoped: o ícone é injetado via Leaflet divIcon) */
.route-stop-pin {
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  border: 2px solid var(--mt-surface);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 800;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}
</style>
