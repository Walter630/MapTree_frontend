<script lang="ts">
import type { TreeApiRecord } from '@/types/treeApi'
import { isAxiosError } from 'axios'
import { NEST_ICON, speciesIcon } from '@/utils/speciesDisplay'
import {
  defineAsyncComponent,
  defineComponent,
  onMounted,
  onUnmounted,
  ref,
  computed,
  nextTick,
  watch,
} from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import * as L from 'leaflet'
import { HeatLayer } from 'leaflet.heat'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { apiConnect, type Measurement, type TreeWithAi } from '@/plugins/apiConnect'
import TreeFieldMeasurement from '@/components/functions/TreeFieldMeasurement.vue'
import { SOIL_TYPES, getSoilInfo } from '@/utils/soilData'
import type { DailyRouteStopSnapshot } from '@/utils/dailyRouteStorage'
import { getDailyRouteSchedules, getPendingMapStops } from '@/utils/dailyRouteSchedules'
import 'leaflet-routing-machine'
import {
  CEARA_REGIONS,
  findRegionAtLocation,
  getVisibleTiles,
  loadTileData,
  getTileKey,
  type Region,
} from '@/utils/regionPipeline'
import { renderSoilLayer, type SoilRenderMode } from '@/utils/soilRenderers'
import {
  buildTreeDensityCells,
  countTreesBySpecies,
  estimateTotalCrownAreaM2,
  getTreeDensityCategories,
  getTreeDensityHeatPoints,
  isValidGeoPoint,
  type TreeDensityDimension,
} from '@/utils/treeDensity'
import { getDensestTreeMapCluster, uniqueTreeMapPoints } from '@/utils/treeMapViewport'
import { selectTreeMapTrees, type TreeMapQuickFilter } from '@/utils/treeMapSelection'
import { clearTreeCreateAttemptKey, getTreeCreateAttemptKey } from '@/utils/treeCreateAttempt'
import { getApiErrorMessage } from '@/utils/apiError'
import { localDate } from '@/utils/pruningWorkflow'
import {
  isMunicipalityGeometry,
  isPointInsideMunicipality,
  type MunicipalityGeometry,
} from '@/utils/municipalityGeometry'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'

const TreeAiStats = defineAsyncComponent(() => import('@/components/functions/TreeAiStats.vue'))

/* =====================================================
   ESTRUTURA DO COMPONENTE PRUNINGMAP
   =====================================================

   Este componente gerencia o mapa de podas com as seguintes seções:

   1. TIPOS (Interfaces TypeScript)
      - TreeOnMap, ApiTree, MarkedLocation, etc.

   2. SETUP / ESTADO REATIVO
      - Variáveis ref() e computed() para dados e UI
      - Estados: trees, selectedTree, loadingTrees, etc.

   3. CONFIGURAÇÕES
      - STATUS_CONFIG: Cores e ícones por status
      - SOIL_TYPES: Tipos de solo e cores
      - STATUS_EMOJI: Emojis para cada status

   4. FUNÇÕES DE DADOS
      - parseTreeData(): Converte API para formato interno
      - fetchTrees(): Carrega árvores da API
      - fetchTreesNearby(): Carrega por proximidade
      - fetchTreesByRegion(): Carrega por região/cidade
      - loadVisibleTiles(): Carrega área visível no mapa

   5. FUNÇÕES DO MAPA (Leaflet)
      - initMap(): Inicializa o mapa
      - renderTrees(): Renderiza marcadores no mapa
      - drawPowerLines(): Mantém a camada de rede elétrica desativada
      - toggleSoilLayer(): Ativa/desativa camada de solo

   6. GEOLOCALIZAÇÃO
      - goToUserLocation(): Centraliza no usuário
      - startWatchingPosition(): Acompanha movimento

   7. UI / SIDEBAR v2 (Novo - Abril/2025)
      - Dashboard flutuante: Sempre visível com mini mapa
      - Abas: Carregar / Árvores / Config
      - Lista de árvores com filtros
      - Legenda e configurações

   8. TEMPLATE (HTML)
      - Mapa Leaflet
      - Botões flutuantes (ações rápidas)
      - Sidebar com abas
      - Drawer de IA
      - Dialogs (importação CSV)

   9. ESTILOS (CSS)
      - Layout do mapa
      - Sidebar v2 (novo design)
      - Dashboard flutuante
      - Animações e responsivo

   BACKUP: Menu lateral anterior salvo em:
   /src/components/functions/MapsView/PruningMap_sidebar_backup.vue

   ===================================================== */

/* ===================================
   TIPOS
=================================== */

interface TreeOnMap {
  id: string
  createdById?: string
  updatedAt?: string
  latitude: number
  longitude: number
  address?: string
  status: string
  registeredStatus?: string
  lastPruneDate?: string | null
  pruningLabel?: string
  speciesName: string
  scientificName: string
  family: string
  nearPowerLine: boolean
  soilQuality?: string
  soilStatus?: string
  vigor: string
  currentHeight?: number
  wireHeight?: number
  nestCount?: number
  nestAgeYears?: number
  averageNestSizeCm?: number
  isDemoData?: boolean
  canopyWidthMeters?: number
}

interface MarkedLocation {
  id: string
  lat: number
  lng: number
  notes: string
  timestamp: Date
  marker?: L.Marker
}

interface QuickTreeOrganizationBoundary {
  municipalityGeometry?: unknown
  municipalityName?: string | null
  municipalityUf?: string | null
}

// Tipos — adiciona junto com os outros interfaces no topo
interface SoilMapPoint {
  treeId: string
  lat: number
  lng: number
  status: string
  species: string
  soilType: string // Mudado de soilQuality
  soilQuality?: string // Legado para compatibilidade
  soilDepth: number | null
  clay: number | null
  sand: number | null
  ph: number | null
  hasSoilData: boolean
  markerColor?: string
}

// Estado reativo — adiciona junto com os outros refs
const soilPoints = ref<SoilMapPoint[]>([])
const showSoilLayer = ref(false)
const loadingSoil = ref(false)
let soilLayer: L.LayerGroup | null = null

/* ===================================
   CORREÇÃO ÍCONE PADRÃO LEAFLET
=================================== */

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

/* ===================================
   CONSTANTES
=================================== */

const DEFAULT_LAT = -3.7319
const DEFAULT_LNG = -38.5267
const DEFAULT_ZOOM = 15

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

interface StatusInfo {
  label: string
  icon: string
  color: string
  bg: string
  border: string
}

const STATUS_CONFIG: { [key: string]: StatusInfo } = {
  NORMAL: {
    label: 'Normal',
    icon: 'mdi-tree',
    color: '#2E7D32',
    bg: '#2E7D32',
    border: '#1B5E20',
  },
  TO_PRUNE: {
    label: 'Para Podar',
    icon: 'mdi-content-cut',
    color: '#EF6C00',
    bg: '#EF6C00',
    border: '#E65100',
  },
  UNDER_OBSERVATION: {
    label: 'Observação',
    icon: 'mdi-eye-outline',
    color: '#F9A825',
    bg: '#F9A825',
    border: '#F57F17',
  },
  PRUNED: {
    label: 'Podada',
    icon: 'mdi-leaf',
    color: '#4CAF50',
    bg: '#4CAF50',
    border: '#388E3C',
  },
  DANGER: {
    label: 'Risco',
    icon: 'mdi-alert-outline',
    color: '#D32F2F',
    bg: '#D32F2F',
    border: '#B71C1C',
  },
  CRITICAL: {
    label: 'CRÍTICO',
    icon: 'mdi-alert-octagon-outline',
    color: '#D32F2F',
    bg: '#D32F2F',
    border: '#B71C1C',
  },
}

const DEFAULT_STATUS: StatusInfo = {
  label: 'Normal',
  icon: 'mdi-tree',
  color: '#4CAF50',
  bg: '#4CAF50',
  border: '#2E7D32',
}

const pruningDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'short',
})

function getStatusCfg(status: string): StatusInfo {
  const s = String(status).toUpperCase()

  if (s === 'CRITICAL' || s === 'DANGER') {
    return STATUS_CONFIG['CRITICAL'] || STATUS_CONFIG['DANGER'] || DEFAULT_STATUS
  }

  // SE FOR PARA PODAR, retorna o status laranja/amarelo correto (TO_PRUNE)
  if (s === 'TO_PRUNE') {
    return STATUS_CONFIG['TO_PRUNE'] || DEFAULT_STATUS
  }

  // Caso contrário, respeita o status (incluindo TO_PRUNE em amarelo/laranja)
  return STATUS_CONFIG[s] || DEFAULT_STATUS
}

/* ===================================
   COMPONENTE
=================================== */

export default defineComponent({
  name: 'PruningMap',
  components: { TreeAiStats, TreeFieldMeasurement },

  setup() {
    const currentRoute = useRoute()
    const appStore = useAppStore()

    /* ---------- Map refs ---------- */
    let map: L.Map | null = null
    let treeClusterGroup: L.MarkerClusterGroup | null = null
    const treeMarkerCache = new Map<string, { marker: L.Marker; signature: string }>()
    let userMarker: L.Marker | null = null
    let userAccuracyCircle: L.Circle | null = null
    let markedMarkersLayer: L.LayerGroup | null = null
    let powerLinesLayer: L.LayerGroup | null = null
    let locationWatchId: number | null = null
    let refreshInterval: ReturnType<typeof setInterval> | null = null
    // Timer do debounce de carregamento ao mover o mapa. Precisa ser acessível
    // no onUnmounted para ser cancelado e não disparar após o componente morrer.
    let tileLoadTimeout: ReturnType<typeof setTimeout> | null = null
    // Flag que marca o componente como destruído. Callbacks assíncronos (timers,
    // geolocalização, promises de fetch) checam isso antes de mexer em estado
    // reativo/mapa, evitando o erro "vnode is null" ao sair da rota do mapa.
    let isDestroyed = false
    let streetLayer: L.TileLayer | null = null
    let satelliteLayer: L.TileLayer | null = null
    let dailyRoadRoutingControl: L.Routing.Control | null = null
    let dailyRouteLayer: L.LayerGroup | null = null
    let treeDensityLayer: HeatLayer | null = null
    let quickTreeMunicipalityLayer: L.GeoJSON | null = null

    /* ---------- Estado Reativo ---------- */
    const trees = ref<TreeOnMap[]>([])
    const requestedDimension = currentRoute.query.treeMapDimension
    const validDimensions: TreeDensityDimension[] = [
      'species',
      'status',
      'vigor',
      'proximity',
      'nests',
      'canopy',
    ]
    const treeDensityDimension = ref<TreeDensityDimension>(
      typeof requestedDimension === 'string' &&
        validDimensions.includes(requestedDimension as TreeDensityDimension)
        ? (requestedDimension as TreeDensityDimension)
        : 'species',
    )
    const treeDensityCategory = ref(
      typeof currentRoute.query.treeMapCategory === 'string'
        ? currentRoute.query.treeMapCategory
        : 'all',
    )
    const selectedSpecies = ref(
      requestedDimension === 'species' && typeof currentRoute.query.treeMapCategory === 'string'
        ? currentRoute.query.treeMapCategory
        : 'all',
    )
    const showTreeDensityLayer = ref(
      currentRoute.query.treeMapHeat === 'true' || currentRoute.query.camada === 'calor',
    )
    watch(
      () => currentRoute.query,
      (query) => {
        if (query.camada !== 'calor') return
        treeDensityDimension.value = 'species'
        treeDensityCategory.value =
          (typeof query.especie === 'string' && query.especie.trim()) || 'all'
        selectedSpecies.value = treeDensityCategory.value
        showTreeDensityLayer.value = true
      },
      { immediate: true },
    )
    const densityTrees = computed(() => trees.value.filter((tree) => !tree.isDemoData))
    const markedLocations = ref<MarkedLocation[]>([])
    const markMode = ref(false)
    const noteDialog = ref(false)
    const noteText = ref('')
    let pendingMarkLatLng: L.LatLng | null = null
    const isExpanded = ref(false)
    const loadingTrees = ref(false)
    const isInitialLoad = ref(true)
    const isInitialMapLoading = ref(true)
    const locating = ref(false)
    const locationError = ref('')
    const userLat = ref<number | null>(null)
    const userLng = ref<number | null>(null)
    const searchQuery = ref('')
    const searching = ref(false)
    const isMobile = ref(window.innerWidth < 768)
    const sidebarOpen = ref(!isMobile.value)
    const requestedFilter = currentRoute.query.treeMapFilter
    const activeFilter = ref<TreeMapQuickFilter>(
      requestedFilter === 'CRITICAL' || requestedFilter === 'TO_PRUNE' ? requestedFilter : 'ALL',
    )
    const mapStyle = ref<'street' | 'satellite'>('street')
    const snackbar = ref(false)
    const snackbarText = ref('')
    const snackbarColor = ref('success')
    const selectedTree = ref<TreeOnMap | null>(null)
    const locationEditTree = ref<TreeOnMap | null>(null)
    const locationDraft = ref<{ latitude: number; longitude: number } | null>(null)
    const locationOriginalPosition = ref<{ latitude: number; longitude: number } | null>(null)
    const locationLatitudeInput = ref('')
    const locationLongitudeInput = ref('')
    const locationAddressInput = ref('')
    const locationEditDialog = ref(false)
    const locationEditLoading = ref(false)
    const locationSaving = ref(false)
    const locationEditError = ref('')
    const locationEditConflict = ref(false)
    let locationEditMarker: L.Marker | null = null
    let locationOriginalIcon: L.Icon | L.DivIcon | undefined
    let locationOriginalZIndex = 0
    let locationDragListener: (() => void) | null = null
    let locationDragEndListener: (() => void) | null = null
    const locationInputsValid = computed(() => {
      if (!locationLatitudeInput.value.trim() || !locationLongitudeInput.value.trim()) return false
      return isValidGeoPoint(Number(locationLatitudeInput.value), Number(locationLongitudeInput.value))
    })
    const locationPositionChanged = computed(() => {
      const original = locationOriginalPosition.value
      const draft = locationDraft.value
      return Boolean(original && draft &&
        (original.latitude !== draft.latitude || original.longitude !== draft.longitude))
    })
    const canSaveLocation = computed(() =>
      Boolean(locationEditTree.value?.updatedAt && locationPositionChanged.value &&
        locationInputsValid.value && !locationSaving.value && !locationEditConflict.value),
    )
    watch([locationLatitudeInput, locationLongitudeInput], ([latitude, longitude]) => {
      if (!locationEditMarker || !latitude.trim() || !longitude.trim()) return
      const parsedLatitude = Number(latitude)
      const parsedLongitude = Number(longitude)
      if (!isValidGeoPoint(parsedLatitude, parsedLongitude)) return
      locationDraft.value = { latitude: parsedLatitude, longitude: parsedLongitude }
      locationEditMarker.setLatLng([parsedLatitude, parsedLongitude])
    })
    const treeRegistrationMode = ref(false)
    const treeRegistrationPoint = ref<{ lat: number; lng: number } | null>(null)
    let treeRegistrationMarker: L.Marker | null = null
    const quickTreeMunicipalityGeometry = ref<MunicipalityGeometry | null>(null)
    const quickTreeMunicipalityName = ref('')
    const quickTreeBoundaryLoading = ref(false)
    const quickTreeBoundaryError = ref('')
    const quickTreeRequiresMunicipalityBoundary = computed(() => appStore.user?.role !== 'ADMIN')
    const quickTreeSpecies = ref<Array<{ id: string; commonName: string; scientificName?: string; family?: string }>>([])
    const quickTreeSpeciesId = ref('')
    const quickSpeciesDialog = ref(false)
    const quickSpeciesLoading = ref(false)
    const quickSpeciesError = ref('')
    const quickTreeSaving = ref(false)
    const quickTreeSaveError = ref('')
    const selectedQuickTreeSpecies = computed(
      () => quickTreeSpecies.value.find(({ id }) => id === quickTreeSpeciesId.value) ?? null,
    )
    const quickTreePointOutsideMunicipality = computed(() => {
      const point = treeRegistrationPoint.value
      const geometry = quickTreeMunicipalityGeometry.value
      return Boolean(
        point &&
        quickTreeRequiresMunicipalityBoundary.value &&
        geometry &&
        !isPointInsideMunicipality(point.lng, point.lat, geometry),
      )
    })
    const quickTreeCanSave = computed(() => {
      const boundaryReady =
        !quickTreeRequiresMunicipalityBoundary.value ||
        (!quickTreeBoundaryLoading.value &&
          !quickTreeBoundaryError.value &&
          Boolean(quickTreeMunicipalityGeometry.value))
      return Boolean(
        treeRegistrationPoint.value &&
          selectedQuickTreeSpecies.value &&
          boundaryReady &&
          !quickTreePointOutsideMunicipality.value &&
          !quickTreeSaving.value,
      )
    })
    const nestObservationDialog = ref(false)
    const savingNestObservation = ref(false)
    const nestObservationForm = ref({
      quantity: '',
      estimatedAgeYears: '',
      averageSizeCm: '',
      notes: '',
    })
    const isSimulationMode = ref(false)
    const dailyRouteDate = computed(() => {
      const value = currentRoute.query.routeDate
      return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''
    })
    const router = useRouter()
    const dailyRouteStops = ref<DailyRouteStopSnapshot[]>([])
    const dailyRouteState = ref<'loading' | 'ready' | 'empty' | 'completed' | 'error'>('loading')
    let dailyRouteRequest = 0
    const dailyRouteVisible = computed(() =>
      Boolean(dailyRouteDate.value && dailyRouteStops.value.length),
    )
    const nextDailyRouteStop = computed(() => dailyRouteStops.value[0] || null)

    /* ---------- Carregamento Progressivo ---------- */
    const loadRadius = ref(2) // Raio inicial em km
    const maxRadius = ref(50) // Raio máximo em km
    const totalTreesInArea = ref(0) // Total de árvores disponíveis na API
    const hasMoreTrees = ref(false) // Se há mais árvores para carregar
    const autoLoadOnZoom = ref(true) // Carregar automaticamente ao ampliar o mapa
    const followUserPosition = ref(false) // Se true, mapa segue o usuário automaticamente
    const userHasMovedMap = ref(false) // Detecta se usuário navegou manualmente no mapa
    const loadedTreeIds = new Set<string>() // Cache para evitar duplicatas
    const partialBoundsView = ref(false)
    let boundsRequestId = 0
    let boundsRequestController: AbortController | null = null
    const blockingMapLoading = computed(() => isInitialMapLoading.value)

    /* ---------- Sistema de Regiões ---------- */
    const availableRegions = ref<Region[]>(CEARA_REGIONS)
    const selectedRegion = ref<Region | null>(null)
    const regionTrees = ref<Map<string, TreeOnMap[]>>(new Map()) // Cache por região
    const tileCache = ref<Map<string, TreeOnMap[]>>(new Map()) // Cache por tile
    const loadingRegion = ref(false)
    const cityStats = ref<{
      total: number
      withRisk: number
      byStatus: Record<string, number>
    } | null>(null)
    let lastLoadedBounds: L.LatLngBounds | null = null
    let lastLoadedZoom: number | null = null

    const clearTreeLoadCache = () => {
      loadedTreeIds.clear()
      tileCache.value = new Map()
      lastLoadedBounds = null
      lastLoadedZoom = null
    }

    /* ---------- Carregar Regiões do Backend ---------- */
    const loadRegionsFromApi = async () => {
      try {
        // Tenta buscar do endpoint /regions (novo)
        const res = await apiConnect.getRegions()
        if (res.data && res.data.length > 0) {
          // Converte do formato da API para o formato interno
          availableRegions.value = res.data.map((r) => ({
            id: r.slug,
            name: r.name,
            type: r.type as 'city' | 'district' | 'state' | 'quadrant',
            bounds: {
              north: r.north,
              south: r.south,
              east: r.east,
              west: r.west,
            },
            center: {
              lat: (r.north + r.south) / 2,
              lng: (r.east + r.west) / 2,
            },
            loaded: false,
          }))
          console.log(`${availableRegions.value.length} regiões carregadas do banco`)
        }
      } catch {
        // Silencioso - usa hardcoded como fallback
        console.log('Usando regiões hardcoded (endpoint /regions não disponível)')
      }
    }

    /* ---------- Configuração de Solo ---------- */
    const soilRenderMode = ref<SoilRenderMode>('circles')
    const showSoilControls = ref(false)

    /* ---------- Accordion Sidebar ---------- */
    const expandedPanels = ref(['carregamento', 'filtros'])

    /* ---------- Abas do Novo Sidebar v2 ---------- */
    const activeTab = ref<'inventario' | 'carregar' | 'arvores' | 'config'>('inventario')

    /* ---------- IA Drawer ---------- */
    const aiDrawerOpen = ref(false)
    const aiTreeData = ref<TreeWithAi | null>(null)
    const fieldMeasurement = ref<Measurement>()
    const fieldWireHeight = ref<number>()
    let treeDetailsRequest = 0
    const aiDetailsError = ref('')
    const aiPredictionState = ref<'loading' | 'available' | 'unavailable' | 'error'>('loading')

    watch(
      aiDrawerOpen,
      (isOpen) => {
        if (isOpen) return

        // Respostas iniciadas antes de fechar não podem repovoar o card oculto.
        treeDetailsRequest += 1
      },
      { flush: 'sync' },
    )

    /* ---------- Computed ---------- */
    const categoryFilteredTrees = computed(() =>
      selectTreeMapTrees(
        densityTrees.value,
        'ALL',
        selectedSpecies.value === 'all' ? treeDensityDimension.value : 'species',
        selectedSpecies.value === 'all' ? treeDensityCategory.value : selectedSpecies.value,
      ),
    )
    const filteredTrees = computed(() =>
      selectTreeMapTrees(
        densityTrees.value,
        activeFilter.value,
        selectedSpecies.value === 'all' ? treeDensityDimension.value : 'species',
        selectedSpecies.value === 'all' ? treeDensityCategory.value : selectedSpecies.value,
      ),
    )
    const statusFilteredTrees = computed(() =>
      densityTrees.value.filter(
        (tree) => activeFilter.value === 'ALL' || tree.status === activeFilter.value,
      ),
    )
    const treeDensityCategories = computed(() =>
      getTreeDensityCategories(statusFilteredTrees.value, treeDensityDimension.value),
    )
    const treeDensityHeatPoints = computed(() =>
      getTreeDensityHeatPoints(filteredTrees.value, treeDensityDimension.value, 'all'),
    )
    const treeDensityCells = computed(() =>
      buildTreeDensityCells(filteredTrees.value, treeDensityDimension.value, 250, 'all'),
    )
    const topDensityCell = computed(() => treeDensityCells.value[0] || null)
    const speciesDistribution = computed(() => countTreesBySpecies(statusFilteredTrees.value))
    const crownAreaEstimate = computed(() => estimateTotalCrownAreaM2(filteredTrees.value))
    const densityDimensionItems: Array<{ title: string; value: TreeDensityDimension }> = [
      { title: 'Espécie', value: 'species' },
      { title: 'Status', value: 'status' },
      { title: 'Vigor', value: 'vigor' },
      { title: 'Risco operacional', value: 'proximity' },
      { title: `${NEST_ICON} Ninhos registrados`, value: 'nests' },
      { title: 'Área de copa estimada', value: 'canopy' },
    ]

    // Contagens rápidas respeitam status e categoria; a camada de inventário usa a mesma seleção.
    const treeCount = computed(() => filteredTrees.value.length)
    const allFilterCount = computed(() => categoryFilteredTrees.value.length)
    const dangerCount = computed(
      () =>
        categoryFilteredTrees.value.filter((tree) =>
          ['CRITICAL', 'TO_PRUNE', 'DANGER'].includes(tree.status.toUpperCase()),
        ).length,
    )
    const criticalCount = computed(
      () => categoryFilteredTrees.value.filter((tree) => tree.status === 'CRITICAL').length,
    )
    const toPruneCount = computed(
      () => categoryFilteredTrees.value.filter((tree) => tree.status === 'TO_PRUNE').length,
    )
    const markedCount = computed(() => markedLocations.value.length)
    // Refs reativas para bounds do mapa (para tornar visibleTreeCount reativo)
    const mapBounds = ref<L.LatLngBounds | null>(null)
    const mapZoom = ref<number>(DEFAULT_ZOOM)

    // Contador de árvores visíveis na tela (bounds atual do mapa).
    // Os bounds só mudam no 'moveend', não a cada frame. Conta com loop simples, sem alocar
    // array intermediário, para suportar volumes grandes sem travar.
    const visibleTreeCount = computed(() => {
      const list = filteredTrees.value
      const bounds = mapBounds.value
      if (!map || !bounds) return list.length
      let count = 0
      for (let i = 0; i < list.length; i++) {
        const t = list[i]!
        if (bounds.contains([t.latitude, t.longitude])) count++
      }
      return count
    })

    /* ---------- Notificação ---------- */
    const notify = (text: string, color = 'success') => {
      snackbarText.value = text
      snackbarColor.value = color
      snackbar.value = true
    }

    const routeStopIcon = (order: number): L.DivIcon =>
      L.divIcon({
        html: `<div class="daily-route-stop-icon"><span>${order}</span></div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        className: 'daily-route-marker',
      })

    const renderDailyRoute = () => {
      if (!dailyRouteLayer || !map) return
      dailyRouteLayer.clearLayers()
      if (dailyRoadRoutingControl && map) {
        map.removeControl(dailyRoadRoutingControl)
        dailyRoadRoutingControl = null
      }
      if (!dailyRouteStops.value.length) return
      treeClusterGroup?.clearLayers()

      const points = dailyRouteStops.value.map((stop) => L.latLng(stop.latitude, stop.longitude))

      if (points.length > 1) {
        // Linha de referência imediata enquanto o provedor calcula o trajeto por ruas.
        L.polyline(points, {
          color: '#2563EB',
          weight: 4,
          opacity: 0.28,
          dashArray: '8 8',
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(dailyRouteLayer)

        // O Routing Machine transforma os waypoints em um trajeto viário real.
        dailyRoadRoutingControl = L.Routing.control({
          plan: L.Routing.plan(points, {
            addWaypoints: false,
            draggableWaypoints: false,
            createMarker: () => false,
          }),
          lineOptions: {
            extendToWaypoints: false,
            missingRouteTolerance: 0,
            styles: [
              { color: '#0F2F5F', opacity: 0.18, weight: 11 },
              { color: '#2563EB', opacity: 0.92, weight: 6 },
            ],
          },
          addWaypoints: false,
          fitSelectedRoutes: true,
          showAlternatives: false,
          show: false,
        }).addTo(map)

        dailyRoadRoutingControl.on('routingerror', () => {
          notify(
            'Não foi possível calcular o trajeto pelas ruas. A sequência das paradas continua disponível.',
            'warning',
          )
        })
      }

      dailyRouteStops.value.forEach((stop) => {
        const marker = L.marker([stop.latitude, stop.longitude], {
          icon: routeStopIcon(stop.order),
          zIndexOffset: 1200,
        })
        marker.bindTooltip(`Parada ${stop.order}`, {
          direction: 'top',
          offset: [0, -15],
          className: 'daily-route-tooltip',
        })
        marker.bindPopup(
          `
          <div style="min-width:180px;font-family:system-ui,sans-serif;">
            <strong style="color:var(--mt-status-success);">Parada ${stop.order}</strong>
            <p style="margin:6px 0 2px;font-weight:700;">${escapeHtml(stop.label || `Árvore #${stop.id.slice(-6)}`)}</p>
            <p style="margin:0;color:var(--mt-text-muted);font-size:12px;">${stop.latitude.toFixed(5)}, ${stop.longitude.toFixed(5)}</p>
          </div>
        `,
          { className: 'daily-route-popup' },
        )
        dailyRouteLayer!.addLayer(marker)
      })

      if (points.length > 1)
        map.fitBounds(L.latLngBounds(points), { padding: [80, 80], maxZoom: 16 })
      else map.setView(points[0]!, 17)
    }

    const loadDailyRoute = async () => {
      const request = ++dailyRouteRequest
      const date = dailyRouteDate.value
      dailyRouteStops.value = []
      dailyRouteState.value = 'loading'
      renderDailyRoute()
      if (!date) return

      try {
        const schedules = await getDailyRouteSchedules(date)
        if (isDestroyed || request !== dailyRouteRequest) return
        dailyRouteStops.value = getPendingMapStops(schedules)
        if (dailyRouteStops.value.length) dailyRouteState.value = 'ready'
        else if (schedules.some((stop) => stop.status === 'PENDING'))
          dailyRouteState.value = 'empty'
        else
          dailyRouteState.value = schedules.some((stop) => stop.status === 'COMPLETED')
            ? 'completed'
            : 'empty'
        renderDailyRoute()
      } catch {
        if (!isDestroyed && request === dailyRouteRequest) dailyRouteState.value = 'error'
      }
    }

    const exitDailyRoute = () => {
      const query = { ...currentRoute.query }
      delete query.routeDate
      void router.replace({ query })
    }

    const refreshVisibleDailyRoute = () => {
      if (dailyRouteDate.value && document.visibilityState === 'visible') void loadDailyRoute()
    }

    const openExternalNavigation = (stop: DailyRouteStopSnapshot | null) => {
      if (!stop) return
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${stop.latitude},${stop.longitude}`)}&travelmode=driving`
      window.open(url, '_blank', 'noopener,noreferrer')
    }

    watch(dailyRouteDate, loadDailyRoute)

    /* ---------- Ícones ---------- */
    const createTreeIcon = (status: string, species: string): L.DivIcon => {
      const cfg = getStatusCfg(status)
      return L.divIcon({
        html: `<div style="
          background: linear-gradient(135deg, ${cfg.bg}, ${cfg.border});
          border: 2px solid white;
          border-radius: 50% 50% 50% 0;
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          transform: rotate(-45deg);
          box-shadow: -3px 3px 8px rgba(0,0,0,0.4);
          cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        " onmouseover="this.style.transform='rotate(-45deg) scale(1.15)'" onmouseout="this.style.transform='rotate(-45deg) scale(1)'">
          <span aria-hidden="true" style="transform: rotate(45deg); font-size: 18px; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));">${speciesIcon(species)}</span>
        </div>`,
        iconSize: [38, 38],
        iconAnchor: [19, 38],
        popupAnchor: [0, -38],
        className: 'tree-icon-marker',
      })
    }

    const createLocationEditIcon = (): L.DivIcon =>
      L.divIcon({
        html: `<div aria-hidden="true" style="
          width:42px;height:42px;border:4px solid #fff;border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;
          background:#f59e0b;box-shadow:0 0 0 5px rgba(245,158,11,.35),0 4px 12px rgba(0,0,0,.45);
          font-size:20px;cursor:grab;
        "><span style="transform:rotate(45deg)">↕</span></div>`,
        iconSize: [46, 46],
        iconAnchor: [23, 42],
        popupAnchor: [0, -42],
        className: 'tree-location-edit-marker',
      })

    const createUserIcon = (): L.DivIcon =>
      L.divIcon({
        html: `<div style="
        background:linear-gradient(135deg,#1565C0,#42A5F5);border:3px solid #fff;border-radius:50%;
        width:100%;height:100%;display:flex;align-items:center;justify-content:center;
        font-size:16px;box-shadow:0 0 16px rgba(25,118,210,0.5);animation:userPulse 2s infinite;
      ">📍</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        className: 'user-icon-marker',
      })

    const createMarkIcon = (): L.DivIcon =>
      L.divIcon({
        html: `<div style="
        background:linear-gradient(135deg,#7B1FA2,#CE93D8);border:2px solid #fff;border-radius:50%;
        width:100%;height:100%;display:flex;align-items:center;justify-content:center;
        font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.3);
      ">📌</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
        className: 'mark-icon-marker',
      })

    /* ---------- API ---------- */

    /**
     * Converte dados da API para o formato TreeOnMap
     */
    const parseTreeData = (t: TreeApiRecord): TreeOnMap | null => {
      const latValue = t.lat ?? t.latitude
      const lngValue = t.lng ?? t.longitude
      if (latValue == null || lngValue == null || latValue === '' || lngValue === '') return null
      const lat = Number(latValue)
      const lng = Number(lngValue)
      if (!isValidGeoPoint(lat, lng)) return null

      const latestMeasurement = t.measurements?.find(
        ({ height }) => Number.isFinite(height) && height >= 0,
      )
      const curH =
        t.currentHeight ??
        latestMeasurement?.height ??
        t.estimatedHeight ??
        t.estimated_height_m ??
        t.aiPrediction?.estimated_height_m
      const wireH = t.wireHeight ?? t.wire_height_m ?? t.aiPrediction?.wire_height_m
      const treeStatus = t.effectiveStatus || t.measuredStatus || t.status || 'NORMAL'
      const isDanger = ['CRITICAL', 'TO_PRUNE', 'DANGER'].includes(treeStatus.toUpperCase())
      const pruningDate = t.lastPruneDate ? Date.parse(t.lastPruneDate) : NaN
      const pruningLabel = Number.isFinite(pruningDate)
        ? `Última poda em ${pruningDateFormatter.format(pruningDate)}`
        : t.status === 'PRUNED'
          ? 'Poda registrada'
          : undefined

      // Extrair dados de solo se disponíveis
      const soilQuality = t.soil?.quality || t.soilQuality || 'UNKNOWN'
      const vigor = t.vigor || t.soil?.vigor || 'UNKNOWN'
      const nestObservation = Array.isArray(t.nestObservations) ? t.nestObservations[0] : null

      return {
        id: t.id,
        createdById: t.createdById || undefined,
        updatedAt: t.updatedAt
          ? t.updatedAt instanceof Date
            ? t.updatedAt.toISOString()
            : String(t.updatedAt)
          : undefined,
        latitude: lat,
        longitude: lng,
        address: t.address ?? undefined,
        status: treeStatus,
        registeredStatus: t.status || undefined,
        lastPruneDate: t.lastPruneDate ?? null,
        pruningLabel,
        speciesName: t.species?.commonName || 'Espécie não identificada',
        scientificName: t.species?.scientificName || '',
        family: t.species?.family || '',
        nearPowerLine: isDanger,
        soilQuality: soilQuality,
        soilStatus: t.soilStatus,
        vigor: vigor,
        currentHeight: curH,
        wireHeight: wireH,
        ...(latestMeasurement &&
        Number.isFinite(latestMeasurement.canopyWidth) &&
        latestMeasurement.canopyWidth > 0
          ? { canopyWidthMeters: latestMeasurement.canopyWidth }
          : {}),
        ...(nestObservation
          ? {
              nestCount: Number(nestObservation.quantity),
              nestAgeYears: Number.isFinite(nestObservation.estimatedAgeYears)
                ? nestObservation.estimatedAgeYears
                : undefined,
              averageNestSizeCm: Number.isFinite(nestObservation.averageSizeCm)
                ? nestObservation.averageSizeCm
                : undefined,
            }
          : {}),
      }
    }

    /**
     * Carrega árvores próximas ao usuário com raio progressivo
     * Inicia com 2km e permite expandir até o máximo definido
     */
    const fetchTreesNearby = async (reset = false, silent = false) => {
      if (isMobile.value) return fetchTreesInBounds(silent, true)
      console.log(
        '[PruningMap] fetchTreesNearby chamado. userLat:',
        userLat.value,
        'userLng:',
        userLng.value,
      )
      if (!userLat.value || !userLng.value) {
        // Se não tem localização, usa o endpoint tradicional
        console.log('[PruningMap] Sem localização, usando fetchTreesLegacy()')
        return fetchTreesLegacy(silent)
      }

      loadingTrees.value = true
      try {
        if (reset) {
          // Reset: limpa cache e começa do raio inicial
          clearTreeLoadCache()
          trees.value = []
          loadRadius.value = 2
        }

        const limit = loadRadius.value <= 2 ? 500 : loadRadius.value <= 5 ? 2000 : 5000
        const res = await apiConnect.getTreesNearby(
          userLat.value,
          userLng.value,
          loadRadius.value,
          limit,
        )

        const newTrees: TreeOnMap[] = []
        let duplicates = 0

        ;(res.data || []).forEach((t: TreeApiRecord) => {
          if (loadedTreeIds.has(t.id)) {
            duplicates++
            return
          }
          const parsed = parseTreeData(t)
          if (parsed) {
            loadedTreeIds.add(t.id)
            newTrees.push(parsed)
          }
        })

        // Adiciona novas árvores à lista existente
        trees.value = [...trees.value, ...newTrees]

        // Verifica se há mais árvores para carregar
        totalTreesInArea.value = res.data?.length || 0
        hasMoreTrees.value = loadRadius.value < maxRadius.value && totalTreesInArea.value >= limit

        console.log(
          `Raio ${loadRadius.value}km: ${newTrees.length} novas, ${duplicates} duplicatas, total: ${trees.value.length}`,
        )
        if (!silent) notify(`${trees.value.length} árvore(s) próximas carregada(s)`, 'success')

        // Centraliza no usuário na primeira carga
        if (reset && map && trees.value.length > 0) {
          map.setView([userLat.value, userLng.value], 15)
        }
      } catch (err: unknown) {
        console.error('Erro ao buscar árvores próximas:', err)
        const status = isAxiosError(err) ? err.response?.status : undefined
        if (status === 500 || status === 404) {
          console.log('[PruningMap] API /trees/nearby indisponível, usando fallback /trees')
          if (isMobile.value) return fetchTreesInBounds(silent, true)
          if (!silent) notify('Usando modo de compatibilidade para carregar árvores', 'warning')
          return fetchTreesLegacy(silent) // Fallback para endpoint tradicional
        }
        if (!silent) notify('Erro ao carregar árvores próximas', 'error')
      } finally {
        loadingTrees.value = false
      }
    }

    /**
     * Expande o raio de busca e carrega mais árvores
     */
    const loadMoreTrees = async () => {
      if (loadRadius.value < 5) loadRadius.value = 5
      else if (loadRadius.value < 10) loadRadius.value = 10
      else if (loadRadius.value < 20) loadRadius.value = 20
      else loadRadius.value = maxRadius.value

      await fetchTreesNearby(false)
    }

    const zoomInToSeeMoreTrees = () => map?.zoomIn()

    /**
     * Carrega árvores da área visível no mapa (bounds)
     * Útil quando usuário navega para outra região
     */
    const fetchTreesInBounds = async (silent = false, replaceVisibleArea = isMobile.value) => {
      if (!map) return false

      const bounds = map.getBounds()
      const north = bounds.getNorth()
      const south = bounds.getSouth()
      const east = bounds.getEast()
      const west = bounds.getWest()
      const requestId = ++boundsRequestId
      boundsRequestController?.abort()
      const controller = new AbortController()
      boundsRequestController = controller

      loadingTrees.value = true
      try {
        const res = await apiConnect.getTreesInBounds(
          north,
          south,
          east,
          west,
          500,
          controller.signal,
        )
        if (requestId !== boundsRequestId || isDestroyed || !map || !map.getBounds().equals(bounds))
          return false

        const records = res.data || []
        const areaTrees = uniqueTreeMapPoints(
          records
            .map((tree: TreeApiRecord) => parseTreeData(tree))
            .filter((tree): tree is TreeOnMap => tree !== null),
        )
        partialBoundsView.value = records.length >= 500
        totalTreesInArea.value = records.length
        hasMoreTrees.value = partialBoundsView.value

        if (replaceVisibleArea) {
          clearTreeLoadCache()
          areaTrees.forEach((tree) => loadedTreeIds.add(tree.id))
          trees.value = areaTrees
        } else {
          const current = new Map(trees.value.map((tree) => [tree.id, tree]))
          areaTrees.forEach((tree) => {
            current.set(tree.id, tree)
            loadedTreeIds.add(tree.id)
          })
          trees.value = [...current.values()]
        }

        if (!silent) {
          notify(
            partialBoundsView.value
              ? 'Exibindo até 500 árvores. Aproxime o mapa para detalhar esta área.'
              : `${areaTrees.length} árvore(s) da área visível carregada(s)`,
            partialBoundsView.value ? 'info' : 'success',
          )
        }
        return true
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error('Erro ao buscar árvores na área:', err)
          if (!silent) notify('Não foi possível carregar as árvores desta área.', 'error')
        }
        return false
      } finally {
        if (requestId === boundsRequestId) {
          loadingTrees.value = false
          boundsRequestController = null
        }
      }
    }

    const focusInitialTreeCluster = () => {
      if (!map || trees.value.length === 0 || !isInitialLoad.value) return

      const cluster = getDensestTreeMapCluster(trees.value)
      if (cluster.length === 0) return

      if (cluster.length === 1) {
        const tree = cluster[0]!
        map.setView([tree.latitude, tree.longitude], 14)
      } else {
        map.fitBounds(L.latLngBounds(cluster.map((tree) => [tree.latitude, tree.longitude])), {
          padding: [50, 50],
          maxZoom: 15,
        })
      }

      isInitialLoad.value = false
    }

    /**
     * Fallback: endpoint tradicional quando não há geolocalização
     */
    const fetchTreesLegacy = async (silent = false) => {
      console.log('[PruningMap] fetchTreesLegacy() - chamando /trees')
      loadingTrees.value = true
      try {
        const res = await apiConnect.get<TreeApiRecord[]>('/trees')
        console.log('[PruningMap] /trees resposta:', res.data?.length || 0, 'árvores brutas')
        const rawTrees = res.data || []
        const withCoords = rawTrees.filter(
          (t: TreeApiRecord) =>
            (t.latitude != null || t.lat != null) && (t.longitude != null || t.lng != null),
        )
        console.log('[PruningMap] Árvores com coordenadas:', withCoords.length)
        trees.value = uniqueTreeMapPoints(
          withCoords
            .map((t: TreeApiRecord) => parseTreeData(t))
            .filter((t): t is TreeOnMap => t !== null),
        )
        clearTreeLoadCache()
        trees.value.forEach((tree) => loadedTreeIds.add(tree.id))
        console.log('[PruningMap] Árvores parseadas válidas:', trees.value.length)

        if (!silent) notify(`${trees.value.length} árvore(s) carregada(s)`, 'success')

        focusInitialTreeCluster()
      } catch (err: unknown) {
        console.error('[PruningMap] Erro ao buscar árvores no fallback:', err)
        // Último recurso: dados mockados para demonstração
        console.log('[PruningMap] Gerando árvores mockadas para demonstração...')
        trees.value = getMockTrees()
        console.log('[PruningMap] Árvores mockadas geradas:', trees.value.length)
        if (!silent)
          notify(
            `Modo offline: ${trees.value.length} árvores de demonstração carregadas`,
            'warning',
          )
        if (map && trees.value.length > 0) {
          const bounds = L.latLngBounds(trees.value.map((t) => [t.latitude, t.longitude]))
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
        }
      } finally {
        loadingTrees.value = false
      }
    }

    // Dados mockados de árvores para demonstração quando API falha completamente
    const getMockTrees = (): TreeOnMap[] => {
      const centerLat = userLat.value || -3.7319
      const centerLng = userLng.value || -38.5267
      const statuses: Array<TreeOnMap['status']> = [
        'NORMAL',
        'TO_PRUNE',
        'UNDER_OBSERVATION',
        'PRUNED',
        'CRITICAL',
      ]
      const species = [
        'Mangueira',
        'Ipê Amarelo',
        'Flamboyant',
        'Cajueiro',
        'Coconut Palm',
        'Acacia',
      ]
      const mockTrees: TreeOnMap[] = []
      for (let i = 0; i < 50; i++) {
        const angle = (i / 50) * Math.PI * 2
        const radius = 0.005 + Math.random() * 0.01
        mockTrees.push({
          id: `mock-${i}`,
          latitude: centerLat + Math.cos(angle) * radius,
          longitude: centerLng + Math.sin(angle) * radius,
          speciesName: species[Math.floor(Math.random() * species.length)] ?? 'Mangueira',
          scientificName: 'Mockus treeus',
          family: 'Mockaceae',
          status: statuses[Math.floor(Math.random() * statuses.length)] ?? 'NORMAL',
          nearPowerLine: false,
          vigor: ['EXCELLENT', 'GOOD', 'POOR'][Math.floor(Math.random() * 3)] ?? 'GOOD',
          currentHeight: 5 + Math.random() * 10,
          wireHeight: 8 + Math.random() * 5,
          isDemoData: true,
        })
      }
      return mockTrees
    }

    // Alias para compatibilidade com código existente
    const fetchTrees = fetchTreesNearby

    /* ---------- Carregamento por Região ---------- */
    const fetchTreesByRegion = async (region: Region, reset = true, preserveViewport = false) => {
      if (reset) {
        trees.value = []
        clearTreeLoadCache()
        regionTrees.value.clear()
        selectedRegion.value = region
      }

      loadingRegion.value = true
      try {
        // Verifica se já temos dados desta região em cache
        const cached = regionTrees.value.get(region.id)
        if (cached && !reset) {
          const newTrees = cached.filter((t) => !loadedTreeIds.has(t.id))
          newTrees.forEach((t) => loadedTreeIds.add(t.id))
          trees.value = [...trees.value, ...newTrees]
          notify(`${newTrees.length} árvores da região ${region.name} (cache)`, 'success')
          return
        }

        // Tenta usar endpoint de cidade (mais eficiente) ou fallback para bounds
        let regionTreeList: TreeOnMap[] = []

        try {
          // Primeiro tenta o endpoint específico de cidade
          const cityRes = await apiConnect.getTreesByCity(region.id, 10000)
          regionTreeList = (cityRes.data.trees || [])
            .map((t: TreeApiRecord) => parseTreeData(t))
            .filter((t): t is TreeOnMap => t !== null)
        } catch {
          // Fallback: usa bounds se endpoint de cidade não existir ou falhar
          const res = await apiConnect.getTreesInBounds(
            region.bounds.north,
            region.bounds.south,
            region.bounds.east,
            region.bounds.west,
            10000,
          )
          regionTreeList = (res.data || [])
            .map((t: TreeApiRecord) => parseTreeData(t))
            .filter((t): t is TreeOnMap => t !== null)
        }

        // Armazena em cache
        regionTrees.value.set(region.id, regionTreeList)

        // Adiciona à lista global
        regionTreeList.forEach((t) => {
          if (!loadedTreeIds.has(t.id)) {
            loadedTreeIds.add(t.id)
            trees.value.push(t)
          }
        })

        notify(`${regionTreeList.length} árvores carregadas de ${region.name}`, 'success')

        // Centraliza no mapa
        if (map && !preserveViewport) {
          map.flyTo([region.center.lat, region.center.lng], 13, { duration: 1 })
        }
      } catch (err) {
        console.error('Erro ao carregar região:', err)
        notify('Erro ao carregar dados da região', 'error')
      } finally {
        loadingRegion.value = false
      }
    }

    /* ---------- Carregar Estatísticas de Cidade ---------- */
    const loadCityStats = async (region: Region | string) => {
      // Se receber string (ID), busca o objeto completo
      let regionObj: Region | null = null
      if (typeof region === 'string') {
        regionObj = availableRegions.value.find((r) => r.id === region) || null
        if (!regionObj) {
          notify('Região não encontrada', 'error')
          return null
        }
      } else {
        regionObj = region
      }

      selectedRegion.value = regionObj

      try {
        const res = await apiConnect.getCityStats(regionObj.id)
        const stats = res.data
        cityStats.value = stats

        // Atualiza contadores na UI (pode ser usado para mostrar preview)
        notify(`${stats.name}: ${stats.total} árvores (${stats.withRisk} em risco)`, 'info')

        return stats
      } catch {
        // Silencioso - estatísticas são opcionais
        cityStats.value = null
        return null
      }
    }

    const onRegionSelected = async (region: Region) => {
      selectedRegion.value = region
      if (map) {
        map.flyTo([region.center.lat, region.center.lng], 13, { duration: 1 })
      }
      if (isMobile.value) {
        await loadCityStats(region)
        return
      }
      await Promise.all([loadCityStats(region), fetchTreesByRegion(region, true)])
    }

    /* ---------- Carregamento por Tiles (Dinâmico) ---------- */
    let isLoadingTiles = false
    const loadVisibleTiles = async (silent = false) => {
      if (!map || isLoadingTiles) return false

      if (isMobile.value) return fetchTreesInBounds(silent, true)

      const bounds = map.getBounds()
      const zoom = map.getZoom()

      if (zoom < 8) {
        if (!silent) notify('Aproxime o mapa para carregar árvores individuais', 'info')
        return false
      }

      if (zoom < 12) {
        await fetchTreesInBounds(silent)
        return true
      }

      const visibleTiles = getVisibleTiles(
        {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        },
        Math.min(zoom, 16),
      ) // Limita zoom para tiles

      isLoadingTiles = true
      loadingTrees.value = true
      let newTreesCount = 0

      for (const tileCoord of visibleTiles.slice(0, 20)) {
        // Máximo 20 tiles por vez (aumentado para grandes volumes)
        const tileKey = getTileKey(tileCoord)

        // Pula se já está em cache
        if (tileCache.value.has(tileKey)) continue

        const tileData = await loadTileData(tileCoord)
        if (!tileData || !tileData.trees) continue

        // Processa árvores do tile
        const tileTrees = tileData.trees
          .map((t: TreeApiRecord) => parseTreeData(t))
          .filter((t): t is TreeOnMap => t !== null)

        tileCache.value.set(tileKey, tileTrees)

        // Adiciona árvores novas
        for (const tree of tileTrees) {
          if (!loadedTreeIds.has(tree.id)) {
            loadedTreeIds.add(tree.id)
            trees.value.push(tree)
            newTreesCount++
          }
        }
      }

      loadingTrees.value = false
      isLoadingTiles = false

      if (silent) {
        return true
      }

      if (newTreesCount > 0) {
        notify(`${newTreesCount} árvores carregadas da área visível`, 'success')
      } else {
        notify('Área já carregada ou sem árvores novas', 'info')
      }
      return true
    }

    // Dados mockados de solo para demonstração quando API falha
    const getMockSoilData = (): SoilMapPoint[] => {
      const centerLat = -3.7319
      const centerLng = -38.5267
      const soilTypes = ['ARGISSOLO', 'LATOSSOLO', 'NEOSSOLO', 'CAMBISSOLO', 'GLEISSOLO']
      const qualities = ['GOOD', 'REGULAR', 'BAD']
      const statuses = ['NORMAL', 'TO_PRUNE', 'UNDER_OBSERVATION']
      const species = ['Mangueira', 'Ipê Amarelo', 'Oiti', 'Castanhola', 'Palmeira Imperial']

      const getRandomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!

      const mockPoints: SoilMapPoint[] = []
      for (let i = 0; i < 50; i++) {
        const angle = (i / 50) * Math.PI * 2
        const radius = 0.005 + Math.random() * 0.01

        mockPoints.push({
          treeId: `mock-tree-${i}`,
          lat: centerLat + Math.cos(angle) * radius + (Math.random() - 0.5) * 0.005,
          lng: centerLng + Math.sin(angle) * radius + (Math.random() - 0.5) * 0.005,
          status: getRandomItem(statuses),
          species: getRandomItem(species),
          soilType: getRandomItem(soilTypes),
          soilQuality: getRandomItem(qualities),
          soilDepth: Math.floor(Math.random() * 200) + 50,
          clay: Math.floor(Math.random() * 40) + 10,
          sand: Math.floor(Math.random() * 60) + 20,
          ph: Number((5.5 + Math.random() * 2).toFixed(1)),
          hasSoilData: true,
          markerColor: undefined,
        })
      }
      return mockPoints
    }

    const fetchSoilData = async () => {
      loadingSoil.value = true
      console.log('[PruningMap] Carregando dados de solo...')
      try {
        const res = await apiConnect.get<SoilMapPoint[]>('/soil/map')
        soilPoints.value = res.data || []
        console.log(`[PruningMap] ${soilPoints.value.length} pontos de solo carregados da API`)
        if (soilPoints.value.length === 0) {
          notify('Nenhum dado de solo disponível na região. Usando dados de demonstração.', 'info')
          soilPoints.value = getMockSoilData()
        }
      } catch (err: unknown) {
        console.error('[PruningMap] Erro ao carregar solo:', err)
        // Se 401, 403 ou qualquer erro, usar dados mockados
        const status = isAxiosError(err) ? err.response?.status : undefined
        if (status === 401) {
          notify('Sessão expirada ou sem autorização. Usando dados de demonstração.', 'warning')
        } else if (status === 403) {
          notify(
            'Sem permissão para acessar dados de solo (apenas Admin/Gestor). Usando dados de demonstração.',
            'warning',
          )
        } else {
          notify('Erro ao carregar dados de solo. Usando dados de demonstração.', 'warning')
        }
        soilPoints.value = getMockSoilData()
        console.log(`[PruningMap] ${soilPoints.value.length} pontos de solo mockados gerados`)
      } finally {
        loadingSoil.value = false
      }
    }

    const renderSoilLayerLocal = () => {
      if (!soilLayer || !map) {
        console.log('[PruningMap] Não pode renderizar: soilLayer ou map não existe')
        return
      }
      soilLayer.clearLayers()
      if (!showSoilLayer.value) {
        console.log('[PruningMap] Camada de solo desativada')
        return
      }

      console.log(`[PruningMap] Renderizando ${soilPoints.value.length} pontos de solo`)

      // Converte SoilMapPoint para SoilPoint
      const points = soilPoints.value.map((p) => ({
        lat: p.lat,
        lng: p.lng,
        soilType: p.soilType,
        soilQuality: p.soilQuality,
      }))

      // Usa o novo sistema de renderização
      renderSoilLayer(map, soilLayer, points, soilRenderMode.value, {
        opacity: 0.2,
        interactive: true,
        showLabels: true,
      })

      console.log('[PruningMap] Renderização de solo concluída')
    }

    const changeSoilRenderMode = (mode: SoilRenderMode) => {
      soilRenderMode.value = mode
      renderSoilLayerLocal()
      notify(`Modo de visualização de solo: ${mode}`, 'info')
    }

    const toggleSoilControls = () => {
      showSoilControls.value = !showSoilControls.value
    }

    const detectAndLoadRegion = async () => {
      if (!userLat.value || !userLng.value) {
        notify('Localização não disponível. Ative a geolocalização.', 'warning')
        await goToUserLocation()
        return
      }

      const region = findRegionAtLocation(userLat.value, userLng.value)
      if (region) {
        selectedRegion.value = region
        await fetchTreesByRegion(region, true)
        notify(`Região detectada: ${region.name}`, 'success')
      } else {
        notify('Você está fora das regiões mapeadas. Usando carregamento por raio.', 'info')
        await fetchTreesNearby(true)
      }
    }

    const toggleSoilLayer = async () => {
      console.log('[PruningMap] toggleSoilLayer chamado. Estado atual:', showSoilLayer.value)
      showSoilLayer.value = !showSoilLayer.value
      console.log(
        '[PruningMap] Novo estado:',
        showSoilLayer.value,
        'soilPoints:',
        soilPoints.value.length,
      )

      if (showSoilLayer.value && soilPoints.value.length === 0) {
        console.log('[PruningMap] Carregando dados de solo...')
        await fetchSoilData()
        console.log('[PruningMap] Dados carregados. Total:', soilPoints.value.length)
      }

      renderSoilLayerLocal()
      notify(showSoilLayer.value ? 'Camada de solo ativada' : 'Camada de solo oculta', 'info')
    }

    const toggleSimulationMode = () => {
      isSimulationMode.value = !isSimulationMode.value
      if (isSimulationMode.value) {
        notify(
          'Modo Simulação Ativo: Clique em qualquer lugar do mapa para definir sua posição.',
          'info',
        )
      } else {
        notify('Modo Simulação Desativado.', 'info')
      }
    }

    /* ---------- Renderização ---------- */
    const renderTrees = () => {
      console.log(
        '[PruningMap] renderTrees() - treeClusterGroup:',
        !!treeClusterGroup,
        'filteredTrees:',
        filteredTrees.value.length,
      )
      if (!treeClusterGroup) {
        console.error('[PruningMap] treeClusterGroup não existe!')
        return
      }
      if (dailyRouteVisible.value) {
        treeClusterGroup.clearLayers()
        treeMarkerCache.clear()
        return
      }

      const visibleIds = new Set(filteredTrees.value.map((tree) => tree.id))
      for (const [id, cached] of treeMarkerCache) {
        if (visibleIds.has(id)) continue
        treeClusterGroup.removeLayer(cached.marker)
        treeMarkerCache.delete(id)
      }

      const markersArray: L.Marker[] = []
      filteredTrees.value.forEach((t) => {
        if (isNaN(t.latitude) || isNaN(t.longitude)) return
        const signature = JSON.stringify(t)
        const existing = treeMarkerCache.get(t.id)
        if (existing?.signature === signature) {
          if (!treeClusterGroup!.hasLayer(existing.marker)) markersArray.push(existing.marker)
          return
        }
        if (existing) treeClusterGroup!.removeLayer(existing.marker)

        const icon = createTreeIcon(t.status, t.speciesName)
        const marker = L.marker([t.latitude, t.longitude], {
          icon,
          title: t.speciesName,
          alt: t.speciesName,
          keyboard: true,
        })
        marker.on('add', () => {
          const element = marker.getElement()
          if (!element) return
          element.setAttribute('role', 'button')
          element.setAttribute('aria-label', `Analisar ${t.speciesName}, identificação ${t.id}`)
          element.tabIndex = 0
          element.addEventListener('keydown', (event) => {
            if (event.key !== ' ') return
            event.preventDefault()
            void openAiDrawer(t)
          })
        })
        marker.on('click', () => void openAiDrawer(t))
        marker.on('contextmenu', () => void openAiDrawer(t))

        markersArray.push(marker)
        treeMarkerCache.set(t.id, { marker, signature })
      })
      if (markersArray.length) treeClusterGroup.addLayers(markersArray)
    }

    const renderTreeDensity = () => {
      const heatVisible = showTreeDensityLayer.value && !dailyRouteDate.value
      treeDensityLayer?.setLatLngs(heatVisible ? treeDensityHeatPoints.value : [])
    }

    const drawPowerLines = () => {
      if (!powerLinesLayer) return
      powerLinesLayer.clearLayers()
    }

    /* ---------- Geolocalização ---------- */
    /**
     * Obtém a posição do usuário.
     * Se followUserPosition=true, move o mapa para a posição.
     * Se false, apenas atualiza o marcador sem mover o mapa.
     */
    const goToUserLocation = (moveMapOnSuccess = false): Promise<boolean> => {
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          locationError.value = 'Geolocalização não suportada neste navegador'
          resolve(false)
          return
        }
        locating.value = true
        locationError.value = ''

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude, accuracy } = pos.coords
            userLat.value = latitude
            userLng.value = longitude

            if (map) {
              // SEMPRE move o mapa para o usuário na inicialização
              const shouldMoveMap = moveMapOnSuccess || followUserPosition.value

              if (shouldMoveMap) {
                map.flyTo([latitude, longitude], 17, { duration: 1.5 })
              }

              if (userMarker) {
                userMarker.setLatLng([latitude, longitude])
              } else {
                userMarker = L.marker([latitude, longitude], {
                  icon: createUserIcon(),
                  zIndexOffset: 1000,
                })
                  .addTo(map)
                  .bindPopup(
                    '<div style="text-align:center;font-weight:600;">📍 Você está aqui</div>',
                  )
              }

              if (userAccuracyCircle) {
                userAccuracyCircle.setLatLng([latitude, longitude]).setRadius(accuracy)
              } else {
                userAccuracyCircle = L.circle([latitude, longitude], {
                  radius: accuracy,
                  color: '#1976D2',
                  fillColor: '#1976D2',
                  fillOpacity: 0.08,
                  weight: 1,
                }).addTo(map)
              }

              userMarker.openPopup()
            }

            notify('📍 Localização encontrada!')
            locating.value = false
            resolve(true)
          },
          (err) => {
            const msgs: Record<number, string> = {
              1: 'Permissão de localização negada pelo navegador',
              2: 'Localização indisponível no momento',
              3: 'Tempo esgotado ao buscar localização',
            }
            locationError.value = msgs[err.code] || 'Erro desconhecido'

            // As árvores carregam em paralelo com a geolocalização. Se já
            // chegaram, enquadra o grupo local mais denso e ignora outliers.
            if (trees.value.length > 0) {
              focusInitialTreeCluster()
              notify('Não foi possível obter sua posição. Centralizando nas árvores.', 'warning')
            } else {
              notify(locationError.value, 'warning')
            }

            locating.value = false
            resolve(false)
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
        )
      })
    }

    const startWatchingPosition = () => {
      if (!navigator.geolocation) return
      locationWatchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (isDestroyed || !map) return
          const { latitude, longitude, accuracy } = pos.coords
          userLat.value = latitude
          userLng.value = longitude
          if (userMarker) userMarker.setLatLng([latitude, longitude])
          if (userAccuracyCircle)
            userAccuracyCircle.setLatLng([latitude, longitude]).setRadius(accuracy)

          if (followUserPosition.value && map) {
            map.panTo([latitude, longitude], { animate: true, duration: 0.5 })
          }

        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000 },
      )
    }

    /* ---------- Busca de endereço (Nominatim) ---------- */
    const searchAddress = async () => {
      const query = searchQuery.value.trim()
      if (!query || query.length < 2) return
      if (query.length > 100) {
        notify('Endereço muito longo', 'warning')
        return
      }
      searching.value = true
      try {
        const q = encodeURIComponent(query.substring(0, 100))
        const resp = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${q}&countrycodes=br&limit=1`,
          {
            headers: { 'Accept-Language': 'pt-BR' },
          },
        )
        const results = await resp.json()
        if (results.length > 0) {
          const { lat, lon, display_name } = results[0]
          map?.flyTo([parseFloat(lat), parseFloat(lon)], 17, { duration: 1.5 })
          notify(`📍 ${display_name.split(',').slice(0, 2).join(',')}`)
        } else {
          notify('Endereço não encontrado', 'warning')
        }
      } catch {
        notify('Erro ao buscar endereço', 'error')
      } finally {
        searching.value = false
      }
    }

    /* ---------- Ações ---------- */
    const toggleMarkMode = () => {
      if (treeRegistrationMode.value) toggleTreeRegistrationMode(false)
      markMode.value = !markMode.value
      notify(
        markMode.value
          ? '📌 Modo marcação ativado — clique no mapa'
          : '📌 Modo marcação desativado',
        'info',
      )
    }

    const removeQuickTreeMunicipalityLayer = () => {
      if (quickTreeMunicipalityLayer && map) {
        map.removeLayer(quickTreeMunicipalityLayer)
      }
      quickTreeMunicipalityLayer = null
    }

    const drawQuickTreeMunicipalityLayer = (geometry: MunicipalityGeometry) => {
      if (!map || isDestroyed) return
      removeQuickTreeMunicipalityLayer()
      const paneName = 'quickTreeMunicipalityPane'
      if (!map.getPane(paneName)) map.createPane(paneName)
      const pane = map.getPane(paneName)
      if (pane) pane.style.zIndex = '420'

      quickTreeMunicipalityLayer = L.geoJSON(geometry as unknown as GeoJSON.GeoJsonObject, {
        pane: paneName,
        interactive: false,
        style: () => ({
          color: '#16803c',
          weight: 3,
          opacity: 0.96,
          dashArray: '8 5',
          fillColor: '#4caf50',
          fillOpacity: 0.13,
        }),
      }).addTo(map)

      const bounds = quickTreeMunicipalityLayer.getBounds()
      if (!bounds.isValid()) return
      const leftPadding = !isMobile.value && sidebarOpen.value ? 360 : 32
      map.fitBounds(bounds.pad(0.04), {
        paddingTopLeft: [leftPadding, 32],
        paddingBottomRight: [32, 32],
        maxZoom: 12,
        animate: false,
      })
    }

    const loadQuickTreeMunicipalityBoundary = async () => {
      if (!quickTreeRequiresMunicipalityBoundary.value) return
      quickTreeBoundaryError.value = ''
      if (quickTreeMunicipalityGeometry.value) {
        drawQuickTreeMunicipalityLayer(quickTreeMunicipalityGeometry.value)
        return
      }
      if (quickTreeBoundaryLoading.value) return

      quickTreeBoundaryLoading.value = true
      try {
        const { data: profile } = await apiConnect.get<{
          organizationId?: string | null
          organization?: { id?: string | null }
        }>('/users/me/profile')
        const organizationId = profile.organization?.id ?? profile.organizationId
        if (!organizationId) {
          throw new Error('Sua conta precisa estar vinculada a uma empresa com município configurado.')
        }

        const { data: organization } = await apiConnect.get<QuickTreeOrganizationBoundary>(
          `/organizations/${encodeURIComponent(organizationId)}`,
        )
        if (!isMunicipalityGeometry(organization.municipalityGeometry)) {
          throw new Error('O limite municipal oficial da empresa não está configurado.')
        }
        if (isDestroyed) return

        quickTreeMunicipalityGeometry.value = organization.municipalityGeometry
        quickTreeMunicipalityName.value =
          [organization.municipalityName?.trim(), organization.municipalityUf?.trim()]
            .filter(Boolean)
            .join(' / ') || 'município da empresa'
        drawQuickTreeMunicipalityLayer(organization.municipalityGeometry)
      } catch (error: unknown) {
        if (isDestroyed) return
        const response = (error as { response?: unknown })?.response
        quickTreeBoundaryError.value =
          !response && error instanceof Error
            ? error.message
            : getApiErrorMessage(
                error,
                'Não foi possível carregar o limite municipal oficial da empresa.',
              )
      } finally {
        quickTreeBoundaryLoading.value = false
      }
    }

    const treeRegistrationPinIcon = (outsideMunicipality: boolean) =>
      L.divIcon({
        html: `<div class="tree-registration-pin${outsideMunicipality ? ' tree-registration-pin--outside' : ''}"><span>+</span></div>`,
        iconSize: [38, 44],
        iconAnchor: [19, 42],
        className: 'tree-registration-pin-shell',
      })

    const setTreeRegistrationPoint = (point: L.LatLng) => {
      if (
        quickTreeRequiresMunicipalityBoundary.value &&
        !quickTreeMunicipalityGeometry.value
      ) {
        notify(
          quickTreeBoundaryError.value || 'Aguarde o carregamento do limite municipal oficial.',
          'warning',
        )
        return
      }

      treeRegistrationPoint.value = { lat: point.lat, lng: point.lng }
      quickTreeSaveError.value = ''
      const outsideMunicipality = quickTreePointOutsideMunicipality.value
      if (treeRegistrationMarker) {
        treeRegistrationMarker.setLatLng(point)
        treeRegistrationMarker.setIcon(treeRegistrationPinIcon(outsideMunicipality))
        return
      }
      treeRegistrationMarker = L.marker(point, {
        icon: treeRegistrationPinIcon(outsideMunicipality),
        keyboard: true,
        title: 'Local escolhido para cadastro da árvore',
      }).addTo(map!)
    }

    const toggleTreeRegistrationMode = (enabled = !treeRegistrationMode.value) => {
      treeRegistrationMode.value = enabled
      markMode.value = false
      isSimulationMode.value = false
      if (!enabled) {
        treeRegistrationPoint.value = null
        if (treeRegistrationMarker && map) map.removeLayer(treeRegistrationMarker)
        treeRegistrationMarker = null
        quickTreeSaveError.value = ''
        removeQuickTreeMunicipalityLayer()
      } else {
        quickSpeciesDialog.value = true
        void loadQuickTreeSpecies()
        void loadQuickTreeMunicipalityBoundary()
      }
      notify(
        enabled
          ? 'Escolha a espécie para iniciar o cadastro rápido.'
          : 'Cadastro pelo mapa cancelado.',
        'info',
      )
    }

    const loadQuickTreeSpecies = async () => {
      quickSpeciesLoading.value = true
      quickSpeciesError.value = ''
      try {
        const { data } = await apiConnect.get<Array<{ id: string; commonName: string; scientificName?: string; family?: string }>>(
          '/species',
          { params: { page: 1, limit: 100 } },
        )
        quickTreeSpecies.value = (data || []).sort((a, b) =>
          a.commonName.localeCompare(b.commonName, 'pt-BR'),
        )
      } catch {
        quickSpeciesError.value = 'Não foi possível carregar as espécies. Tente novamente.'
      } finally {
        quickSpeciesLoading.value = false
      }
    }

    const confirmQuickTreeSpecies = () => {
      if (!quickTreeSpeciesId.value) return
      quickSpeciesDialog.value = false
      notify('Agora toque no ponto da árvore e confirme o cadastro.', 'info')
    }

    const confirmTreeRegistrationLocation = () => {
      if (!treeRegistrationPoint.value || !map) return
      const profileBase = currentRoute.path.startsWith('/admin')
        ? '/admin'
        : currentRoute.path.startsWith('/manager')
          ? '/manager'
          : '/user'
      const mapPath = profileBase === '/user' ? '/user/mapUser' : `${profileBase}/map`
      const center = map.getCenter()
      const point = treeRegistrationPoint.value
      const query: Record<string, string> = {
        latitude: String(point.lat),
        longitude: String(point.lng),
        returnMap: mapPath,
        treeMapLat: String(center.lat),
        treeMapLng: String(center.lng),
        treeMapZoom: String(map.getZoom()),
        treeMapFilter: activeFilter.value,
        treeMapDimension: treeDensityDimension.value,
        treeMapCategory: treeDensityCategory.value,
        treeMapHeat: String(showTreeDensityLayer.value),
      }
      if (selectedRegion.value) query.treeMapRegion = selectedRegion.value.id
      if (dailyRouteDate.value) query.routeDate = dailyRouteDate.value
      void router.push({ path: `${profileBase}/trees/new`, query })
    }

    const saveQuickTree = async () => {
      const point = treeRegistrationPoint.value
      const selectedSpecies = selectedQuickTreeSpecies.value
      if (!point || !selectedSpecies || !quickTreeCanSave.value) return

      const payload = {
        idSpecies: selectedSpecies.id,
        latitude: point.lat,
        longitude: point.lng,
        status: 'NORMAL',
        vigor: 'GOOD',
      }
      const key = await getTreeCreateAttemptKey(payload)
      quickTreeSaving.value = true
      quickTreeSaveError.value = ''
      try {
        const { data } = await apiConnect.createTree<{
          id?: string
          createdById?: string
          soilStatus?: string
        }>(payload, key)
        if (!data?.id) throw new Error('A API não confirmou o identificador da árvore.')
        const savedTree: TreeOnMap = {
          id: data.id,
          createdById: data.createdById || appStore.user?.id || undefined,
          latitude: point.lat,
          longitude: point.lng,
          status: 'NORMAL',
          speciesName: selectedSpecies.commonName,
          scientificName: selectedSpecies.scientificName || '',
          family: selectedSpecies.family || '',
          nearPowerLine: false,
          soilQuality: 'UNKNOWN',
          soilStatus: data.soilStatus || 'PENDING',
          vigor: 'GOOD',
        }
        trees.value = [...trees.value.filter(({ id }) => id !== savedTree.id), savedTree]
        renderTrees()
        clearTreeCreateAttemptKey(key)

        treeRegistrationPoint.value = null
        if (treeRegistrationMarker && map) map.removeLayer(treeRegistrationMarker)
        treeRegistrationMarker = null
        notify(`Árvore cadastrada · ${selectedSpecies.commonName}. Solo em processamento.`, 'success')
      } catch (error) {
        const response = (error as {
          response?: { status?: number; data?: { message?: string | string[] } }
        })?.response
        const responseMessage = Array.isArray(response?.data?.message)
          ? response.data.message.join(' ')
          : response?.data?.message || ''
        quickTreeSaveError.value =
          response?.status === 400 && /localização.*(município|limite)/i.test(responseMessage)
            ? `O ponto precisa estar dentro do limite oficial de ${quickTreeMunicipalityName.value}. Escolha outro local no mapa.`
            : getApiErrorMessage(
                error,
                'Não foi possível confirmar o cadastro. Tente novamente no mesmo ponto.',
              )
      } finally {
        quickTreeSaving.value = false
      }
    }

    const openTreePruning = (tree: TreeOnMap) => {
      const profileBase = currentRoute.path.startsWith('/admin')
        ? '/admin'
        : currentRoute.path.startsWith('/manager')
          ? '/manager'
          : '/user'
      void router.push({
        path: `${profileBase}/podas/nova`,
        query: { treeId: tree.id, date: dailyRouteDate.value || localDate() },
      })
    }

    const canEditTree = (tree: TreeOnMap) =>
      appStore.user?.role === 'USER' &&
      Boolean(appStore.user.id) &&
      tree.createdById === appStore.user.id

    const canEditTreeLocation = (tree: TreeOnMap) => {
      const user = appStore.user
      if (!user?.id) return false
      if (user.role === 'MANAGER') return true
      return user.role === 'USER' && tree.createdById === user.id
    }

    const updateTreeCaches = (updatedTree: TreeOnMap) => {
      const replace = (items: TreeOnMap[]) =>
        items.map((tree) => tree.id === updatedTree.id ? updatedTree : tree)
      trees.value = replace(trees.value)
      for (const [regionId, items] of regionTrees.value) {
        regionTrees.value.set(regionId, replace(items))
      }
      for (const [tileId, items] of tileCache.value) {
        tileCache.value.set(tileId, replace(items))
      }
      if (selectedTree.value?.id === updatedTree.id) selectedTree.value = updatedTree
    }

    const finishTreeLocationEdit = (restoreOriginal: boolean) => {
      const marker = locationEditMarker
      if (marker) {
        if (restoreOriginal && locationOriginalPosition.value) {
          marker.setLatLng([
            locationOriginalPosition.value.latitude,
            locationOriginalPosition.value.longitude,
          ])
        }
        if (locationDragListener) marker.off('drag', locationDragListener)
        if (locationDragEndListener) marker.off('dragend', locationDragEndListener)
        marker.dragging?.disable()
        if (locationOriginalIcon) marker.setIcon(locationOriginalIcon)
        marker.setZIndexOffset(locationOriginalZIndex)
      }

      locationEditMarker = null
      locationOriginalIcon = undefined
      locationDragListener = null
      locationDragEndListener = null
      locationEditTree.value = null
      locationDraft.value = null
      locationOriginalPosition.value = null
      locationLatitudeInput.value = ''
      locationLongitudeInput.value = ''
      locationAddressInput.value = ''
      locationEditDialog.value = false
      locationEditError.value = ''
      locationEditConflict.value = false
    }

    const openTreeLocationEdit = async (tree: TreeOnMap) => {
      if (!canEditTreeLocation(tree) || locationEditLoading.value || locationEditTree.value) return

      closeAiDrawer()
      locationEditLoading.value = true
      locationEditError.value = ''
      try {
        const { data } = await apiConnect.get<TreeApiRecord>(`/trees/${encodeURIComponent(tree.id)}`)
        const freshTree = parseTreeData(data)
        if (freshTree && !canEditTreeLocation(freshTree)) {
          throw new Error('Você não tem permissão para alterar a localização desta árvore.')
        }
        if (!freshTree?.updatedAt || !Number.isFinite(new Date(freshTree.updatedAt).getTime())) {
          throw new Error('A API não retornou a versão atual da árvore. Recarregue o mapa e tente novamente.')
        }

        updateTreeCaches(freshTree)
        renderTrees()
        const marker = treeMarkerCache.get(freshTree.id)?.marker
        if (!marker) throw new Error('O marcador não está visível no mapa. Aplique os filtros e tente novamente.')

        locationEditTree.value = freshTree
        locationEditMarker = marker
        locationOriginalIcon = marker.options.icon
        locationOriginalZIndex = marker.options.zIndexOffset ?? 0
        locationOriginalPosition.value = {
          latitude: freshTree.latitude,
          longitude: freshTree.longitude,
        }
        locationDraft.value = { ...locationOriginalPosition.value }
        locationLatitudeInput.value = String(freshTree.latitude)
        locationLongitudeInput.value = String(freshTree.longitude)
        locationAddressInput.value = freshTree.address || ''
        locationEditConflict.value = false
        marker.setIcon(createLocationEditIcon())
        marker.setZIndexOffset(1200)
        marker.dragging?.enable()

        const syncDraftFromMarker = () => {
          const point = marker.getLatLng()
          locationLatitudeInput.value = String(point.lat)
          locationLongitudeInput.value = String(point.lng)
          locationDraft.value = { latitude: point.lat, longitude: point.lng }
        }
        locationDragListener = syncDraftFromMarker
        locationDragEndListener = () => {
          syncDraftFromMarker()
          locationEditError.value = ''
          locationEditDialog.value = true
        }
        marker.on('drag', locationDragListener)
        marker.on('dragend', locationDragEndListener)
        map?.closePopup()
      } catch (error) {
        locationEditError.value = getApiErrorMessage(
          error,
          error instanceof Error ? error.message : 'Não foi possível abrir a edição da localização.',
        )
        notify(locationEditError.value, 'error')
      } finally {
        locationEditLoading.value = false
      }
    }

    const reviewTreeLocation = () => {
      if (!locationEditTree.value) return
      locationEditDialog.value = true
    }

    const cancelTreeLocationEdit = () => finishTreeLocationEdit(true)

    const reloadTreeAfterLocationConflict = async () => {
      const tree = locationEditTree.value
      if (!tree) return
      locationEditLoading.value = true
      try {
        const { data } = await apiConnect.get<TreeApiRecord>(`/trees/${encodeURIComponent(tree.id)}`)
        const latestTree = parseTreeData(data)
        finishTreeLocationEdit(false)
        if (latestTree) {
          updateTreeCaches(latestTree)
          renderTrees()
          if (dailyRouteDate.value) void loadDailyRoute()
        }
        notify('A localização atual foi recarregada. Confira o marcador antes de editar novamente.', 'warning')
      } catch (error) {
        locationEditError.value = getApiErrorMessage(error, 'Não foi possível recarregar a árvore atualizada.')
      } finally {
        locationEditLoading.value = false
      }
    }

    const saveTreeLocation = async () => {
      const tree = locationEditTree.value
      const draft = locationDraft.value
      if (!tree?.updatedAt || !draft || !canSaveLocation.value) return

      locationSaving.value = true
      locationEditError.value = ''
      locationEditConflict.value = false
      try {
        const { data } = await apiConnect.patch<TreeApiRecord>(
          `/trees/${encodeURIComponent(tree.id)}/location`,
          {
            latitude: draft.latitude,
            longitude: draft.longitude,
            address: locationAddressInput.value.trim(),
            expectedUpdatedAt: tree.updatedAt,
          },
        )
        const savedTree = parseTreeData(data)
        if (!savedTree) throw new Error('A API não confirmou a nova localização da árvore.')

        finishTreeLocationEdit(false)
        updateTreeCaches(savedTree)
        renderTrees()
        if (dailyRouteDate.value) void loadDailyRoute()
        notify('Localização da árvore atualizada e registrada no histórico.', 'success')
      } catch (error) {
        const status = isAxiosError(error) ? error.response?.status : undefined
        if (status === 409) {
          locationEditConflict.value = true
          locationEditError.value = 'Outra pessoa atualizou esta árvore enquanto você editava. Recarregue a versão atual para revisar a posição.'
        } else {
          locationEditError.value = getApiErrorMessage(
            error,
            error instanceof Error ? error.message : 'Não foi possível salvar a localização. Seus dados continuam no rascunho.',
          )
        }
      } finally {
        locationSaving.value = false
      }
    }

    const openTreeEdit = (tree: TreeOnMap) => {
      const user = appStore.user
      if (user?.role !== 'USER' || !user.id || tree.createdById !== user.id) return

      const query: Record<string, string> = { returnMap: '/user/mapUser' }
      for (const key of [
        'treeMapLat',
        'treeMapLng',
        'treeMapZoom',
        'treeMapRegion',
        'treeMapFilter',
        'treeMapDimension',
        'treeMapCategory',
        'treeMapHeat',
        'routeDate',
      ]) {
        const value = currentRoute.query[key]
        if (typeof value === 'string' && value) query[key] = value
      }
      if (map) {
        const center = map.getCenter()
        query.treeMapLat = String(center.lat)
        query.treeMapLng = String(center.lng)
        query.treeMapZoom = String(map.getZoom())
        query.treeMapFilter = activeFilter.value
        query.treeMapDimension = treeDensityDimension.value
        query.treeMapCategory = treeDensityCategory.value
        query.treeMapHeat = String(showTreeDensityLayer.value)
      }

      void router.push({
        path: `/user/trees/${encodeURIComponent(tree.id)}/edit`,
        query,
      })
    }

    const showTreesNearPowerLine = () => {
      treeDensityDimension.value = 'proximity'
      treeDensityCategory.value = 'Risco operacional ativo'
      showTreeDensityLayer.value = true
      activeFilter.value = 'ALL'
      activeTab.value = 'arvores'
      sidebarOpen.value = true
    }

    const setSpeciesFilter = (speciesName: string) => {
      const nextSpecies = selectedSpecies.value === speciesName ? 'all' : speciesName
      if (treeDensityDimension.value !== 'species') treeDensityDimension.value = 'species'
      treeDensityCategory.value = nextSpecies
      selectedSpecies.value = nextSpecies
    }

    const removeMarkedLocation = (id: string) => {
      const loc = markedLocations.value.find((m) => m.id === id)
      if (loc?.marker) markedMarkersLayer?.removeLayer(loc.marker as unknown as L.Layer)
      markedLocations.value = markedLocations.value.filter((m) => m.id !== id)
    }

    const createMarkingAt = (latlng: L.LatLng, notes: string) => {
      const marker = L.marker([latlng.lat, latlng.lng], { icon: createMarkIcon() })
      marker.bindPopup(
        `
        <div style="min-width:160px;font-family:system-ui;">
          <div style="font-weight:700;color:var(--mt-status-info);margin-bottom:4px;">📌 Marcação</div>
          <p style="margin:2px 0;font-size:13px;">${escapeHtml(notes || 'Sem nota')}</p>
          <p style="margin:2px 0;font-size:11px;color:var(--mt-text-muted);">${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}</p>
        </div>
      `,
        { className: 'marked-location-popup' },
      )
      markedMarkersLayer!.addLayer(marker)
      marker.openPopup()
      markedLocations.value.push({
        id: String(Date.now()),
        lat: latlng.lat,
        lng: latlng.lng,
        notes: notes || '',
        timestamp: new Date(),
        marker,
      })
      notify('📌 Marcação adicionada!', 'info')
    }

    const confirmMarking = () => {
      if (pendingMarkLatLng) {
        createMarkingAt(pendingMarkLatLng, noteText.value)
      }
      noteDialog.value = false
      pendingMarkLatLng = null
    }

    const cancelMarking = () => {
      noteDialog.value = false
      pendingMarkLatLng = null
    }

    const toggleExpand = () => {
      isExpanded.value = !isExpanded.value
      nextTick(() => {
        map?.invalidateSize()
      })
    }

    const toggleMapStyle = () => {
      if (!map || !streetLayer || !satelliteLayer) return
      if (mapStyle.value === 'street') {
        map.removeLayer(streetLayer)
        map.addLayer(satelliteLayer)
        mapStyle.value = 'satellite'
      } else {
        map.removeLayer(satelliteLayer)
        map.addLayer(streetLayer)
        mapStyle.value = 'street'
      }
    }

    const setFollowUserPosition = (enabled: boolean | null) => {
      followUserPosition.value = Boolean(enabled)

      if (followUserPosition.value) {
        userHasMovedMap.value = false
        goToUserLocation().then((success) => {
          if (success) notify('Seguindo sua posição em tempo real', 'info')
        })
      } else {
        notify('Modo de seguir posição desativado', 'info')
      }
    }

    const flyToTree = (t: TreeOnMap) => {
      map?.flyTo([t.latitude, t.longitude], 18, { duration: 1 })
      selectedTree.value = t
      if (isMobile.value) sidebarOpen.value = false
    }

    const refreshData = async (reset = false, silent = false) => {
      await fetchTreesNearby(reset, silent)
      renderTrees()
    }

    /* ---------- IA Import ---------- */
    const importingIA = ref(false)
    const syncIA = async () => {
      importingIA.value = true
      try {
        await apiConnect.importExternalData()
        notify('Sincronização de IA concluída!', 'success')
        await refreshData(false, true)
      } catch (err) {
        console.error(err)
        notify('Erro ao sincronizar dados da IA', 'error')
      } finally {
        importingIA.value = false
      }
    }

    const importCsvMode = ref(false)
    const csvPath = ref('/home/walter/maptree.csv')
    const syncCsvIA = async () => {
      importingIA.value = true
      try {
        await apiConnect.importMapTreeCsv(csvPath.value)
        notify('Importação CSV concluída!', 'success')
        importCsvMode.value = false
        await refreshData(false, true)
      } catch (err) {
        console.error(err)
        notify('Erro ao importar CSV', 'error')
      } finally {
        importingIA.value = false
      }
    }

    /* ---------- IA Drawer ---------- */
    const toTreeWithAiSummary = (
      tree: TreeOnMap,
      details: Partial<TreeApiRecord> = {},
      aiPrediction: TreeWithAi['aiPrediction'] = null,
    ): TreeWithAi => ({
      id: tree.id,
      commonName: details.species?.commonName || tree.speciesName || 'Árvore Independente',
      status: (details.status ?? tree.registeredStatus ?? tree.status) as TreeWithAi['status'],
      effectiveStatus: details.effectiveStatus ?? details.measuredStatus ?? tree.status,
      lastPruneDate:
        details.lastPruneDate !== undefined ? details.lastPruneDate : (tree.lastPruneDate ?? null),
      aiPrediction,
      soil: details.soil || details.solo?.[0],
      vigor: (details.vigor || details.soil?.vigor || tree.vigor) as TreeWithAi['vigor'],
      measurements: details.measurements || [],
      maintenanceSchedule: details.maintenanceSchedule || [],
    })

    const openAiDrawer = async (t: TreeOnMap, savedMeasurement?: Measurement) => {
      const request = ++treeDetailsRequest
      const isCurrent = () => !isDestroyed && request === treeDetailsRequest
      selectedTree.value = t
      aiDrawerOpen.value = true
      aiDetailsError.value = ''
      aiPredictionState.value = 'loading'
      aiTreeData.value = toTreeWithAiSummary(t)
      fieldMeasurement.value = savedMeasurement
      if (!savedMeasurement) fieldWireHeight.value = undefined

      try {
        // LAZY LOAD: Busca detalhes completos apenas ao abrir a gaveta
        const res = await apiConnect.get<TreeApiRecord>(`/trees/${t.id}`)
        if (!isCurrent()) return
        const data: Partial<TreeApiRecord> = res.data || {}
        const updatedTree = parseTreeData({
          ...t,
          ...data,
          id: t.id,
          latitude: data.latitude ?? data.lat ?? t.latitude,
          longitude: data.longitude ?? data.lng ?? t.longitude,
        } as TreeApiRecord)
        if (updatedTree) {
          updateTreeCaches(updatedTree)
          selectedTree.value = updatedTree
          renderTrees()
        }
        const summaryTree = updatedTree ?? t
        const isValidPrediction = (
          prediction: unknown,
        ): prediction is NonNullable<TreeWithAi['aiPrediction']> => {
          if (!prediction || typeof prediction !== 'object') return false
          const candidate = prediction as { estimated_height_m?: unknown; wire_height_m?: unknown }
          const estimatedHeight = candidate.estimated_height_m
          const wireHeight = candidate.wire_height_m
          return (
            typeof estimatedHeight === 'number' &&
            Number.isFinite(estimatedHeight) &&
            estimatedHeight > 0 &&
            typeof wireHeight === 'number' &&
            Number.isFinite(wireHeight) &&
            wireHeight > 0
          )
        }

        let aiPrediction = isValidPrediction(data.aiPrediction) ? data.aiPrediction : null
        aiTreeData.value = toTreeWithAiSummary(summaryTree, data, aiPrediction)
        aiPredictionState.value = aiPrediction ? 'available' : 'loading'

        fieldMeasurement.value =
          data.measurements?.find(({ height }) => Number.isFinite(height) && height >= 0) ??
          savedMeasurement
        fieldWireHeight.value = data.wireHeight ?? data.wire_height_m

        // Se não tiver predição nos dados básicos, tenta buscar no novo endpoint
        if (!aiPrediction) {
          try {
            const referenceWireHeightM = Number(data.wireHeight ?? data.wire_height_m)
            const predRes = await apiConnect.getAiPrediction(
              t.id,
              Number.isFinite(referenceWireHeightM) && referenceWireHeightM > 0
                ? referenceWireHeightM
                : undefined,
            )
            if (!isCurrent()) return
            aiPrediction = isValidPrediction(predRes.data) ? predRes.data : null
            aiPredictionState.value = aiPrediction ? 'available' : 'unavailable'
          } catch (pErr) {
            if (!isCurrent()) return
            const predictionStatus = isAxiosError(pErr) ? pErr.response?.status : undefined
            aiPredictionState.value = predictionStatus === 404 ? 'unavailable' : 'error'
            if (predictionStatus !== 404)
              console.warn('Falha ao consultar previsão da árvore', pErr)
          }
        }

        if (!isCurrent()) return
        aiTreeData.value = toTreeWithAiSummary(summaryTree, data, aiPrediction)
      } catch (err) {
        if (!isCurrent()) return
        console.error('Erro ao buscar dados completos da árvore:', err)
        aiDetailsError.value = savedMeasurement
          ? 'Medição registrada. Não foi possível atualizar os detalhes agora.'
          : getApiErrorMessage(err, 'Não foi possível consultar os detalhes da árvore.')
        aiPredictionState.value = 'error'
      }
    }

    const retryAiAnalysis = () => {
      const tree = selectedTree.value
      if (tree) void openAiDrawer(tree)
    }

    const fieldMeasurementSaved = (measurement: Measurement) => {
      const tree = selectedTree.value
      if (tree?.id === measurement.treeId && aiDrawerOpen.value) {
        void openAiDrawer(tree, measurement)
      }
    }

    const closeAiDrawer = () => {
      aiDrawerOpen.value = false
    }

    const openNestObservationDialog = () => {
      if (!selectedTree.value) return
      nestObservationForm.value = {
        quantity:
          selectedTree.value.nestCount === undefined ? '' : String(selectedTree.value.nestCount),
        estimatedAgeYears:
          selectedTree.value.nestAgeYears === undefined
            ? ''
            : String(selectedTree.value.nestAgeYears),
        averageSizeCm:
          selectedTree.value.averageNestSizeCm === undefined
            ? ''
            : String(selectedTree.value.averageNestSizeCm),
        notes: '',
      }
      nestObservationDialog.value = true
    }

    const submitNestObservation = async () => {
      const tree = selectedTree.value
      const form = nestObservationForm.value
      if (!tree) return
      const quantity = Number(form.quantity)
      const age = form.estimatedAgeYears.trim() ? Number(form.estimatedAgeYears) : undefined
      const size = form.averageSizeCm.trim() ? Number(form.averageSizeCm) : undefined
      if (form.quantity.trim() === '' || !Number.isInteger(quantity) || quantity < 0) {
        notify('Informe uma quantidade inteira igual ou maior que zero.', 'error')
        return
      }
      if (quantity > 0 && age !== undefined && (!Number.isFinite(age) || age < 0)) {
        notify('Informe uma idade estimada válida em anos.', 'error')
        return
      }
      if (quantity > 0 && size !== undefined && (!Number.isFinite(size) || size <= 0)) {
        notify('Informe um tamanho médio válido em centímetros.', 'error')
        return
      }

      const payload = {
        quantity,
        ...(quantity > 0 && age !== undefined ? { estimatedAgeYears: age } : {}),
        ...(quantity > 0 && size !== undefined ? { averageSizeCm: size } : {}),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      }

      savingNestObservation.value = true
      try {
        await apiConnect.post(`/trees/${encodeURIComponent(tree.id)}/nest-observations`, payload)
        tree.nestCount = quantity
        tree.nestAgeYears = quantity > 0 ? age : undefined
        tree.averageNestSizeCm = quantity > 0 ? size : undefined
        nestObservationDialog.value = false
        notify('Vistoria de ninhos registrada.', 'success')
      } catch (error) {
        console.error('Erro ao registrar vistoria de ninhos:', error)
        notify('Não foi possível registrar a vistoria. Tente novamente.', 'error')
      } finally {
        savingNestObservation.value = false
      }
    }

    /* ---------- Watcher Reativo para Render ---------- */
    let renderTimeout: ReturnType<typeof setTimeout> | null = null
    watch(filteredTrees, () => {
      if (renderTimeout) clearTimeout(renderTimeout)
      renderTimeout = setTimeout(() => {
        renderTrees()
        renderTimeout = null
      }, 100)
    })
    watch([showTreeDensityLayer, treeDensityHeatPoints, dailyRouteDate], renderTreeDensity)
    watch(dailyRouteVisible, () => {
      renderTrees()
      renderTreeDensity()
    })
    watch(
      treeDensityDimension,
      () => {
        treeDensityCategory.value = 'all'
        selectedSpecies.value = 'all'
      },
      { flush: 'sync' },
    )
    watch(
      [treeDensityDimension, treeDensityCategory],
      ([dimension, category]) => {
        if (dimension === 'species') selectedSpecies.value = category
      },
      { flush: 'sync' },
    )

    /* ---------- Teclado / Resize ---------- */
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded.value) toggleExpand()
    }

    const handleResize = () => {
      isMobile.value = window.innerWidth < 768
    }

    /* ---------- Init ---------- */
    const initMap = () => {
      console.log('[PruningMap] initMap() - inicializando mapa...')
      const container = document.getElementById('pruning-map-container')
      console.log('[PruningMap] Container do mapa:', container ? 'encontrado' : 'NÃO ENCONTRADO!')

      if (!container) {
        console.error('[PruningMap] Container pruning-map-container não existe no DOM!')
        return
      }

      const restoredLatitude = Number(currentRoute.query.treeMapLat)
      const restoredLongitude = Number(currentRoute.query.treeMapLng)
      const hasRestoredMapPosition = isValidGeoPoint(restoredLatitude, restoredLongitude)
      const restoredZoom = Number(currentRoute.query.treeMapZoom)
      const initialZoom =
        Number.isFinite(restoredZoom) && restoredZoom >= 3 && restoredZoom <= 20
          ? restoredZoom
          : DEFAULT_ZOOM
      if (hasRestoredMapPosition) isInitialLoad.value = false
      map = L.map('pruning-map-container', { zoomControl: false }).setView(
        hasRestoredMapPosition ? [restoredLatitude, restoredLongitude] : [DEFAULT_LAT, DEFAULT_LNG],
        initialZoom,
      )
      console.log('[PruningMap] Mapa criado:', !!map)

      // Inicializa bounds e zoom reativos
      mapBounds.value = map.getBounds()
      mapZoom.value = map.getZoom()

      streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
        detectRetina: true,
      })

      satelliteLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; Esri',
          maxZoom: 20,
          maxNativeZoom: 18,
        },
      )

      streetLayer.addTo(map)

      L.control.zoom({ position: 'bottomright' }).addTo(map)
      L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map)

      treeClusterGroup = L.markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        disableClusteringAtZoom: 18,
        chunkedLoading: true,
        removeOutsideVisibleBounds: true,
        iconCreateFunction: (cluster: L.MarkerCluster) => {
          const count = cluster.getChildCount()
          const size = count < 10 ? 40 : count < 50 ? 50 : 60
          return L.divIcon({
            html: `<div style="
              background:linear-gradient(135deg,#173d2a,#245a39);
              color:#fff;font-weight:700;font-size:14px;
              border-radius:50%;width:100%;height:100%;
              display:flex;align-items:center;justify-content:center;
              gap:4px;
              box-shadow:0 2px 10px rgba(0,0,0,0.3);
              border:3px solid rgba(255,255,255,0.7);
            "><i class="mdi mdi-tree" aria-hidden="true"></i><span>${count}</span></div>`,
            className: 'tree-cluster-icon',
            iconSize: [size, size],
          })
        },
      })
      map.addLayer(treeClusterGroup)
      dailyRouteLayer = L.layerGroup().addTo(map)
      void loadDailyRoute()

      markedMarkersLayer = L.layerGroup().addTo(map)
      powerLinesLayer = L.layerGroup().addTo(map)
      // Criar pane para solo com z-index maior que o menu (1001) para ficar na frente
      map.createPane('soilPane')
      map.getPane('soilPane')!.style.zIndex = '1100'
      soilLayer = L.layerGroup([], { pane: 'soilPane' } as L.LayerOptions).addTo(map)
      map.createPane('densityPane')
      map.getPane('densityPane')!.style.zIndex = '450'
      treeDensityLayer = new HeatLayer([], {
        pane: 'densityPane',
        radius: 42,
        blur: 20,
        minOpacity: 0.42,
        max: 1,
        gradient: { 0.15: '#16803c', 0.4: '#b5d928', 0.68: '#ff9e1b', 1: '#bd1028' },
      })
      // Leaflet.heat ships Leaflet 2 declarations; at runtime it supports Leaflet 1.9,
      // which this app uses, so bridge the declaration mismatch at the adapter boundary.
      map.addLayer(treeDensityLayer as unknown as L.Layer)
      renderTreeDensity()
      drawPowerLines()

      // Clique para marcação / simulação
      map.on('click', (ev: L.LeafletMouseEvent) => {
        if (isSimulationMode.value) {
          userLat.value = ev.latlng.lat
          userLng.value = ev.latlng.lng

          if (userMarker) {
            userMarker.setLatLng(ev.latlng)
          } else {
            userMarker = L.marker(ev.latlng, { icon: createUserIcon(), zIndexOffset: 1000 }).addTo(
              map!,
            )
          }

          if (userAccuracyCircle) {
            userAccuracyCircle.setLatLng(ev.latlng).setRadius(10)
          }

          notify('📍 Posição definida manualmente!', 'success')
          isSimulationMode.value = false
          return
        }

        if (treeRegistrationMode.value) {
          setTreeRegistrationPoint(ev.latlng)
          return
        }

        if (!markMode.value) return
        pendingMarkLatLng = ev.latlng
        noteText.value = ''
        noteDialog.value = true
      })

      // Carrega o inventário sem esperar os até 10s da geolocalização.
      console.log('[PruningMap] Iniciando mapa...')
      void goToUserLocation(!hasRestoredMapPosition).then((success) => {
        console.log('[PruningMap] Localização:', success ? 'obtida' : 'falhou/indisponível')
        startWatchingPosition()
      })
      console.log('[PruningMap] Carregando árvores...')
      const loadInitialTrees = async () => {
        if (dailyRouteDate.value) {
          trees.value = []
          isInitialMapLoading.value = false
          return
        }
        if (isMobile.value) {
          await fetchTreesInBounds(true, true)
          return
        }
        const regionId = currentRoute.query.treeMapRegion
        if (typeof regionId === 'string' && regionId) {
          let region = availableRegions.value.find((item) => item.id === regionId)
          if (!region) {
            await loadRegionsFromApi()
            region = availableRegions.value.find((item) => item.id === regionId)
          }
          if (region) {
            selectedRegion.value = region
            void loadCityStats(region)
            await fetchTreesByRegion(region, true, hasRestoredMapPosition)
            return
          }
        }
        await fetchTrees()
      }
      void loadInitialTrees()
        .then(() => {
          console.log(`[PruningMap] Árvores carregadas: ${trees.value.length}`)
          renderTrees()
          console.log('[PruningMap] Marcadores renderizados no cluster')
          if (!hasRestoredMapPosition && (!userLat.value || !userLng.value))
            focusInitialTreeCluster()
        })
        .catch((err) => {
          console.error('[PruningMap] Erro ao carregar árvores:', err)
        })
        .finally(() => {
          isInitialMapLoading.value = false
        })
      // Refresh automático a cada 5 minutos (sem resetar - só atualiza dados existentes)
      refreshInterval = setInterval(() => refreshData(false, true), 300000)

      // Carregamento dinâmico: Carrega tiles quando usuário navega/zoom
      // (tileLoadTimeout agora é declarado no escopo do setup)

      // Detecta quando usuário move o mapa manualmente (drag)
      map.on('dragstart', () => {
        userHasMovedMap.value = true
        // Desativa followUserPosition quando usuário navega manualmente
        if (followUserPosition.value) {
          followUserPosition.value = false
          notify('Modo de seguir usuário desativado (você navegou no mapa)', 'info')
        }
      })

      // Atualiza bounds e zoom reativos sempre que o mapa se move
      const updateMapState = () => {
        if (!map) return
        mapBounds.value = map.getBounds()
        mapZoom.value = map.getZoom()
      }

      // IMPORTANTE (performance): NÃO atualizamos o estado reativo durante
      // 'move'/'zoom'. Esses eventos disparam dezenas de vezes por segundo e
      // cada atualização de bounds força o computed visibleTreeCount a percorrer
      // todas as árvores, travando o mapa durante o arraste. Atualizamos apenas
      // quando o movimento termina ('moveend').
      map.on('moveend', () => {
        updateMapState()

        // Debounce para carregamento automático
        if (tileLoadTimeout) clearTimeout(tileLoadTimeout)
        tileLoadTimeout = setTimeout(() => {
          // Aborta se o componente já foi desmontado (evita vnode null)
          if (isDestroyed || !map) return

          const zoom = mapZoom.value
          const currentBounds = mapBounds.value

          if (autoLoadOnZoom.value && currentBounds) {
            // Verifica se já carregamos desta área recentemente (evita recarregar mesma área)
            if (
              lastLoadedBounds &&
              lastLoadedBounds.contains(currentBounds) &&
              lastLoadedZoom === zoom
            ) {
              return // Já temos dados desta área
            }

            // Carrega área visível (com ou sem região selecionada)
            loadVisibleTiles(true).then((loaded) => {
              // Promise pode resolver após sair da rota: não toca em nada
              if (isDestroyed || !map) return
              if (loaded) {
                lastLoadedBounds = currentBounds
                lastLoadedZoom = zoom
              }
              // Atualiza bounds após carregar
              updateMapState()
              // Só notifica se carregou árvores novas
              const newCount = visibleTreeCount.value
              if (newCount > 0) {
                notify(`${newCount} árvores visíveis na área`, 'info')
              }
            })
          }
        }, 400) // Aguarda 400ms após parar de mover
      })
    }

    /* ---------- Lifecycle ---------- */
    onMounted(() => {
      initMap()
      window.addEventListener('keydown', handleKeydown)
      window.addEventListener('resize', handleResize)
      document.addEventListener('visibilitychange', refreshVisibleDailyRoute)
    })

    onUnmounted(() => {
      // Marca como destruído ANTES de limpar, para que qualquer callback
      // assíncrono pendente aborte em vez de mexer em estado/mapa destruído.
      isDestroyed = true

      if (locationWatchId !== null) navigator.geolocation.clearWatch(locationWatchId)
      if (refreshInterval) clearInterval(refreshInterval)
      if (renderTimeout) clearTimeout(renderTimeout)
      if (tileLoadTimeout) clearTimeout(tileLoadTimeout)
      window.removeEventListener('keydown', handleKeydown)
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('visibilitychange', refreshVisibleDailyRoute)

      // Remove todos os listeners do Leaflet antes de destruir o mapa,
      // para que eventos em voo (moveend etc.) não disparem após o unmount.
      if (map) {
        if (dailyRoadRoutingControl) map.removeControl(dailyRoadRoutingControl)
        map.off()
        map.remove()
        map = null
      }
      quickTreeMunicipalityLayer = null
      dailyRoadRoutingControl = null
      dailyRouteLayer = null
    })

    return {
      speciesIcon,
      NEST_ICON,
      trees,
      filteredTrees,
      densityTrees,
      markedLocations,
      markMode,
      isExpanded,
      showTreeDensityLayer,
      treeDensityDimension,
      treeDensityCategory,
      selectedSpecies,
      setSpeciesFilter,
      treeDensityCategories,
      treeDensityHeatPoints,
      topDensityCell,
      speciesDistribution,
      crownAreaEstimate,
      densityDimensionItems,
      noteDialog,
      noteText,
      confirmMarking,
      cancelMarking,
      loadingTrees,
      partialBoundsView,
      zoomInToSeeMoreTrees,
      blockingMapLoading,
      locating,
      locationError,
      searchQuery,
      searching,
      sidebarOpen,
      activeFilter,
      mapStyle,
      snackbar,
      snackbarText,
      snackbarColor,
      selectedTree,
      locationEditTree,
      locationLatitudeInput,
      locationLongitudeInput,
      locationAddressInput,
      locationEditDialog,
      locationOriginalPosition,
      locationEditLoading,
      locationSaving,
      locationEditError,
      locationEditConflict,
      locationInputsValid,
      canSaveLocation,
      reviewTreeLocation,
      cancelTreeLocationEdit,
      reloadTreeAfterLocationConflict,
      saveTreeLocation,
      treeCount,
      allFilterCount,
      visibleTreeCount,
      dangerCount,
      criticalCount,
      toPruneCount,
      markedCount,
      isMobile,
      goToUserLocation,
      toggleMarkMode,
      treeRegistrationMode,
      treeRegistrationPoint,
      quickTreeRequiresMunicipalityBoundary,
      quickTreeMunicipalityName,
      quickTreeBoundaryLoading,
      quickTreeBoundaryError,
      quickTreeMunicipalityGeometry,
      quickTreePointOutsideMunicipality,
      quickTreeCanSave,
      toggleTreeRegistrationMode,
      confirmTreeRegistrationLocation,
      saveQuickTree,
      quickTreeSpecies,
      quickTreeSpeciesId,
      quickSpeciesDialog,
      quickSpeciesLoading,
      quickSpeciesError,
      quickTreeSaving,
      quickTreeSaveError,
      confirmQuickTreeSpecies,
      loadQuickTreeSpecies,
      loadQuickTreeMunicipalityBoundary,
      selectedQuickTreeSpecies,
      showTreesNearPowerLine,
      toggleExpand,
      toggleMapStyle,
      setFollowUserPosition,
      refreshData,
      removeMarkedLocation,
      searchAddress,
      flyToTree,
      STATUS_CONFIG,
      isSimulationMode,
      toggleSimulationMode,
      dailyRouteDate,
      dailyRouteStops,
      dailyRouteState,
      nextDailyRouteStop,
      loadDailyRoute,
      exitDailyRoute,
      openExternalNavigation,
      aiDrawerOpen,
      aiTreeData,
      fieldMeasurement,
      fieldWireHeight,
      fieldMeasurementSaved,
      aiDetailsError,
      aiPredictionState,
      retryAiAnalysis,
      openAiDrawer,
      closeAiDrawer,
      openTreePruning,
      openTreeEdit,
      openTreeLocationEdit,
      canEditTree,
      canEditTreeLocation,
      nestObservationDialog,
      savingNestObservation,
      nestObservationForm,
      openNestObservationDialog,
      submitNestObservation,
      showSoilLayer,
      loadingSoil,
      toggleSoilLayer,
      getSoilInfo,
      SOIL_TYPES,
      importingIA,
      syncIA,
      importCsvMode,
      csvPath,
      syncCsvIA,
      // Carregamento progressivo
      loadRadius,
      hasMoreTrees,
      totalTreesInArea,
      loadMoreTrees,
      fetchTreesNearby,
      fetchTreesInBounds,
      autoLoadOnZoom,
      followUserPosition,
      userHasMovedMap,
      // Estado do mapa (reativo)
      mapBounds,
      mapZoom,
      // Sistema de regiões e solo
      availableRegions,
      selectedRegion,
      loadingRegion,
      cityStats,
      fetchTreesByRegion,
      loadRegionsFromApi,
      loadCityStats,
      onRegionSelected,
      loadVisibleTiles,
      detectAndLoadRegion,
      soilRenderMode,
      changeSoilRenderMode,
      showSoilControls,
      toggleSoilControls,
      // UI - Abas do novo sidebar v2
      expandedPanels,
      activeTab,
    }
  },
})
</script>

<template>
  <div :class="['map-root', { 'map-expanded': isExpanded }]">
    <!-- LEGENDA FLUTUANTE DE SOLOS (MODERNA) -->
    <v-fade-transition>
      <div v-if="showSoilLayer && !isMobile" class="floating-soil-legend">
        <div class="legend-header">
          <v-icon color="brown-darken-1" size="18" class="mr-2">mdi-layers-triple</v-icon>
          <span>Inteligência Técnica de Solos</span>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="x-small" @click="showSoilLayer = false" />
        </div>
        <div class="legend-content">
          <div v-for="(info, key) in SOIL_TYPES" :key="key" class="legend-item">
            <span class="color-box" :style="{ backgroundColor: info.color }" />
            <div class="item-text">
              <span class="item-name">{{ info.name }}</span>
              <span class="item-impact">{{ info.growthImpact }}</span>
            </div>
          </div>
        </div>
        <div class="legend-footer">Fonte: Embrapa Brasil / Mapeamento IA</div>
      </div>
    </v-fade-transition>

    <!-- =====================================================
         SEÇÃO 1: MAPA LEAFLET (Container Principal)
         - Inicializado via initMap() no onMounted
         - Contém: tiles, marcadores de árvores, rede elétrica,
           camada de solo, marcador do usuário
         ===================================================== -->
    <div id="pruning-map-container" />

    <!-- =====================================================
         SEÇÃO 2: OVERLAY DE LOADING
         - Mostra spinner quando busca localização ou carrega dados iniciais
         ===================================================== -->
    <Transition name="fade">
      <div v-if="blockingMapLoading" class="locating-overlay glass-overlay">
        <v-progress-circular indeterminate color="#C1E328" size="70" width="6" />
        <p
          class="text-white mt-5 font-weight-bold"
          style="font-size: 18px; text-shadow: 0 2px 8px rgba(0, 0, 0, 0.7)"
        >
          {{ locating ? 'Buscando sua localização...' : 'Carregando dados iniciais do mapa...' }}
        </p>
      </div>
    </Transition>

    <!-- ============ ROTA DIÁRIA ============ -->
    <v-card v-if="dailyRouteDate" class="daily-route-map-card" elevation="8">
      <div class="d-flex align-center mb-2">
        <v-avatar color="green-darken-2" size="34" class="mr-2"
          ><v-icon color="white" size="19">mdi-map-marker-path</v-icon></v-avatar
        >
        <div class="flex-grow-1">
          <p class="text-subtitle-2 font-weight-bold mb-0">Rota do dia</p>
          <p class="text-caption text-grey-darken-1 mb-0">
            {{ dailyRouteDate.split('-').reverse().join('/') }}
          </p>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          aria-label="Sair da visualização da rota"
          @click="exitDailyRoute"
        />
      </div>
      <template v-if="dailyRouteState === 'ready'">
        <div class="daily-route-next mb-3">
          <span class="text-caption text-grey-darken-1">
            {{ dailyRouteStops.length }} paradas no mapa · Próxima parada
          </span>
          <strong>
            Parada {{ nextDailyRouteStop?.order }} · {{ nextDailyRouteStop?.label || 'Árvore' }}
          </strong>
        </div>
        <v-btn
          block
          color="blue-darken-2"
          variant="flat"
          class="text-none"
          prepend-icon="mdi-navigation-variant"
          @click="openExternalNavigation(nextDailyRouteStop)"
          >Navegar até a próxima</v-btn
        >
      </template>
      <p v-else-if="dailyRouteState === 'completed'" role="status" class="text-body-2 mb-0">
        Rota concluída. O mapa voltou a mostrar as árvores.
      </p>
      <p v-else-if="dailyRouteState === 'loading'" role="status" class="text-body-2 mb-0">
        Conferindo as paradas da rota…
      </p>
      <p v-else-if="dailyRouteState === 'empty'" role="status" class="text-body-2 mb-0">
        Nenhuma parada pendente com coordenadas disponíveis.
      </p>
      <template v-else>
        <p role="alert" class="text-body-2 mb-1">Não foi possível conferir as paradas da rota.</p>
        <v-btn variant="text" color="primary" @click="loadDailyRoute">Tentar novamente</v-btn>
      </template>
    </v-card>

    <v-card v-if="treeRegistrationMode" class="tree-registration-pick-card" elevation="8">
      <div class="d-flex align-center ga-2 mb-2">
        <v-icon color="green-darken-3">mdi-map-marker-plus-outline</v-icon>
        <strong>Cadastro rápido</strong>
      </div>
      <p class="text-body-2 mb-3">
        <template v-if="selectedQuickTreeSpecies">
          Espécie: <strong>{{ selectedQuickTreeSpecies.commonName }}</strong>. Marque a árvore no
          mapa e confirme para salvar.
        </template>
        <template v-else>Escolha uma espécie para começar.</template>
      </p>
      <v-btn
        v-if="!selectedQuickTreeSpecies"
        size="small"
        variant="tonal"
        class="mb-2"
        prepend-icon="mdi-leaf"
        @click="quickSpeciesDialog = true"
        >Escolher espécie</v-btn
      >
      <v-btn
        v-if="selectedQuickTreeSpecies"
        size="small"
        variant="text"
        class="mb-2 px-0"
        prepend-icon="mdi-pencil"
        @click="quickSpeciesDialog = true"
        >Alterar espécie</v-btn
      >
      <v-alert
        v-if="quickTreeRequiresMunicipalityBoundary && quickTreeBoundaryLoading"
        type="info"
        variant="tonal"
        density="compact"
        class="mb-3"
        role="status"
      >
        Carregando o limite municipal oficial da empresa…
      </v-alert>
      <v-alert
        v-else-if="quickTreeRequiresMunicipalityBoundary && quickTreeBoundaryError"
        type="error"
        variant="tonal"
        density="compact"
        class="mb-3"
        role="alert"
      >
        <div>{{ quickTreeBoundaryError }}</div>
        <v-btn
          variant="text"
          size="small"
          :loading="quickTreeBoundaryLoading"
          @click="loadQuickTreeMunicipalityBoundary"
        >
          Tentar carregar o limite novamente
        </v-btn>
      </v-alert>
      <v-alert
        v-else-if="quickTreeRequiresMunicipalityBoundary && quickTreeMunicipalityGeometry && !quickTreePointOutsideMunicipality"
        type="success"
        variant="tonal"
        density="compact"
        class="mb-3"
        data-testid="quick-tree-boundary-status"
        role="status"
      >
        Área permitida: <strong>{{ quickTreeMunicipalityName }}</strong>. O contorno e o
        preenchimento verdes mostram o limite oficial; escolha um ponto dentro dele.
      </v-alert>
      <v-alert
        v-else-if="!quickTreeRequiresMunicipalityBoundary"
        type="info"
        variant="tonal"
        density="compact"
        class="mb-3"
        role="status"
      >
        Esta conta ADMIN pode cadastrar árvores fora de uma área municipal vinculada.
      </v-alert>
      <v-alert
        v-if="quickTreePointOutsideMunicipality"
        type="error"
        variant="tonal"
        density="compact"
        class="mb-3"
        data-testid="quick-tree-outside-boundary"
        role="alert"
      >
        Este ponto está fora do limite oficial de <strong>{{ quickTreeMunicipalityName }}</strong>.
        Escolha outro local dentro da área verde.
      </v-alert>
      <p v-if="treeRegistrationPoint" class="text-caption mb-3" role="status">
        {{ treeRegistrationPoint.lat.toFixed(6) }}, {{ treeRegistrationPoint.lng.toFixed(6) }}
      </p>
      <v-alert v-if="quickTreeSaveError" type="error" variant="tonal" density="compact" class="mb-3">
        {{ quickTreeSaveError }}
      </v-alert>
      <div class="d-flex flex-wrap justify-end ga-2">
        <v-btn variant="text" :disabled="quickTreeSaving" @click="toggleTreeRegistrationMode(false)">
          Cancelar
        </v-btn>
        <v-btn
          v-if="treeRegistrationPoint"
          variant="outlined"
          prepend-icon="mdi-form-select"
          @click="confirmTreeRegistrationLocation"
          >Cadastro completo</v-btn
        >
        <v-btn
          color="green-darken-3"
          variant="flat"
          prepend-icon="mdi-check"
          :loading="quickTreeSaving"
          :disabled="!quickTreeCanSave"
          @click="saveQuickTree"
          >Salvar e continuar</v-btn
        >
      </div>
    </v-card>

    <v-card
      v-if="locationEditTree && !locationEditDialog"
      class="tree-location-edit-card"
      elevation="10"
      role="region"
      aria-label="Reposicionar marcador da árvore"
    >
      <div class="d-flex align-center ga-2 mb-2">
        <v-icon color="amber-darken-3">mdi-map-marker-move</v-icon>
        <strong>Editar localização</strong>
      </div>
      <p class="text-body-2 mb-3">
        Arraste o marcador dourado até o ponto correto e solte para revisar. Você também pode
        informar as coordenadas manualmente.
      </p>
      <div class="d-flex flex-wrap justify-end ga-2">
        <v-btn variant="text" @click="cancelTreeLocationEdit">Cancelar</v-btn>
        <v-btn color="amber-darken-3" variant="tonal" @click="reviewTreeLocation">
          Revisar posição
        </v-btn>
      </div>
    </v-card>

    <!-- ============ BARRA DE BUSCA DE ENDEREÇO (Nominatim) ============ -->
    <div class="top-search-bar">
      <v-text-field
        v-model="searchQuery"
        density="compact"
        variant="solo"
        rounded
        hide-details
        placeholder="Buscar endereço no Brasil…"
        prepend-inner-icon="mdi-magnify"
        :loading="searching"
        bg-color="surface"
        class="search-input"
        @keyup.enter="searchAddress"
      >
        <template #append-inner>
          <v-btn icon size="small" variant="text" @click="searchAddress" :loading="searching">
            <v-icon>mdi-arrow-right</v-icon>
          </v-btn>
        </template>
      </v-text-field>
    </div>

    <!-- ============ FILTROS RÁPIDOS PRINCIPAIS ============ -->
    <div class="main-filter-bar">
      <v-btn-toggle
        v-model="activeFilter"
        mandatory
        color="green-darken-2"
        rounded="pill"
        class="filter-toggle"
      >
        <v-btn value="CRITICAL" class="toggle-btn" :aria-pressed="activeFilter === 'CRITICAL'">
          <v-icon start color="red">mdi-alert-decagram</v-icon>
          Críticos ({{ criticalCount }})
        </v-btn>
        <v-btn value="TO_PRUNE" class="toggle-btn" :aria-pressed="activeFilter === 'TO_PRUNE'">
          <v-icon start color="orange-darken-2">mdi-content-cut</v-icon>
          Para podar ({{ toPruneCount }})
        </v-btn>
        <v-btn value="ALL" class="toggle-btn" :aria-pressed="activeFilter === 'ALL'">
          <v-icon start>mdi-tree</v-icon>
          Todos ({{ allFilterCount }})
        </v-btn>
      </v-btn-toggle>
    </div>

    <v-alert
      v-if="partialBoundsView && !dailyRouteDate"
      class="bounds-limit-alert"
      type="info"
      density="compact"
      variant="tonal"
      role="status"
    >
      <div class="bounds-limit-content">
        <span>Esta área tem mais de 500 árvores. Aproxime o mapa para ver mais detalhes.</span>
        <v-btn size="small" variant="tonal" @click="zoomInToSeeMoreTrees">Aproximar</v-btn>
      </div>
    </v-alert>

    <v-alert
      v-if="!dailyRouteDate && !loadingTrees && !blockingMapLoading && filteredTrees.length === 0"
      class="map-filter-empty-card"
      type="info"
      variant="tonal"
      density="comfortable"
      role="status"
    >
      Nenhuma árvore para estes filtros
    </v-alert>

    <!-- ============ BOTÕES FLUTUANTES DIREITA ============ -->
    <div class="floating-actions-right">
      <!-- Painel agrupado (estilo mapas modernos) -->
      <div class="map-tools-panel">
        <v-tooltip text="Abrir mapa de calor e espécies" location="left">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              icon
              variant="text"
              class="map-tool-btn"
              :color="showTreeDensityLayer ? 'green-darken-3' : 'grey-darken-3'"
              :aria-label="
                showTreeDensityLayer
                  ? 'Abrir painel do mapa de calor ativo'
                  : 'Ativar mapa de calor e abrir espécies'
              "
              @click="
                () => {
                  showTreeDensityLayer = true
                  activeTab = 'inventario'
                  sidebarOpen = true
                }
              "
            >
              <v-icon>mdi-heat-wave</v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <div class="map-tool-divider" />

        <v-tooltip text="Minha localização" location="left">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              icon
              variant="text"
              class="map-tool-btn"
              :color="locating ? 'primary' : 'grey-darken-3'"
              :loading="locating"
              @click="goToUserLocation"
            >
              <v-icon>mdi-crosshairs-gps</v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <div class="map-tool-divider" />

        <v-tooltip text="Definir minha posição" location="left">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              icon
              variant="text"
              class="map-tool-btn"
              :color="isSimulationMode ? 'amber-darken-3' : 'grey-darken-3'"
              @click="toggleSimulationMode"
            >
              <v-icon>{{
                isSimulationMode ? 'mdi-map-marker-question' : 'mdi-map-marker-account'
              }}</v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <div class="map-tool-divider" />

        <v-tooltip :text="mapStyle === 'street' ? 'Satélite' : 'Mapa'" location="left">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              icon
              variant="text"
              class="map-tool-btn"
              color="grey-darken-3"
              :aria-label="mapStyle === 'street' ? 'Mostrar satélite' : 'Mostrar mapa de ruas'"
              @click="toggleMapStyle"
            >
              <v-icon>{{
                mapStyle === 'street' ? 'mdi-satellite-variant' : 'mdi-map-outline'
              }}</v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <div class="map-tool-divider" />

        <v-tooltip text="Camada de Solo" location="left">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              icon
              variant="text"
              class="map-tool-btn"
              :color="showSoilLayer ? 'brown-darken-2' : 'grey-darken-3'"
              :loading="loadingSoil"
              @click="toggleSoilLayer"
            >
              <v-icon>{{ showSoilLayer ? 'mdi-layers' : 'mdi-layers-outline' }}</v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <div class="map-tool-divider" />

        <v-tooltip :text="markMode ? 'Parar marcação' : 'Marcar no mapa'" location="left">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              icon
              variant="text"
              class="map-tool-btn"
              :color="markMode ? 'warning' : 'grey-darken-3'"
              @click="toggleMarkMode"
            >
              <v-icon>{{ markMode ? 'mdi-map-marker-check' : 'mdi-map-marker-plus' }}</v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <div class="map-tool-divider" />

        <v-tooltip
          :text="
            treeRegistrationMode ? 'Cancelar cadastro pelo mapa' : 'Cadastrar árvore pelo mapa'
          "
          location="left"
        >
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              icon
              variant="text"
              class="map-tool-btn"
              :color="treeRegistrationMode ? 'green-darken-3' : 'grey-darken-3'"
              :aria-pressed="treeRegistrationMode"
              aria-label="Cadastrar árvore pelo mapa"
              @click="toggleTreeRegistrationMode()"
            >
              <v-icon>mdi-map-marker-plus-outline</v-icon>
            </v-btn>
          </template>
        </v-tooltip>
      </div>

      <!-- Botão de expandir, separado (ação de layout) -->
      <v-tooltip :text="isExpanded ? 'Reduzir (ESC)' : 'Expandir'" location="left">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon
            variant="flat"
            class="map-tools-panel map-tools-panel--single"
            :aria-label="isExpanded ? 'Reduzir mapa' : 'Expandir mapa'"
            @click="toggleExpand"
          >
            <v-icon>{{ isExpanded ? 'mdi-fullscreen-exit' : 'mdi-fullscreen' }}</v-icon>
          </v-btn>
        </template>
      </v-tooltip>

    </div>

    <!-- =====================================================
         SEÇÃO 4: MENU LATERAL v2 (Novo - Abril/2025)
         Componentes:
         4.1. Botão Toggle Sidebar (abre/fecha)
         4.2. Dashboard Flutuante (sempre visível quando fechado)
         4.3. Sidebar com Abas:
              - Aba "Carregar": Seleção de região, estatísticas,
                botões de carregamento, controles
              - Aba "Árvores": Lista de árvores com filtros rápidos
              - Aba "Config": IA, importação, legendas, marcações
         ===================================================== -->

    <!-- ============ BOTÃO TOGGLE SIDEBAR ============ -->
    <v-btn
      class="sidebar-toggle-btn"
      icon
      size="small"
      elevation="4"
      color="white"
      :style="{ left: sidebarOpen ? '350px' : '12px' }"
      @click="sidebarOpen = !sidebarOpen"
    >
      <v-icon>{{ sidebarOpen ? 'mdi-chevron-left' : 'mdi-chevron-right' }}</v-icon>
    </v-btn>

    <!-- ============ DASHBOARD FLUTUANTE (Sempre visível) ============ -->
    <Transition name="fade">
      <div v-show="!sidebarOpen" class="floating-dashboard">
        <div class="dashboard-card">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-caption font-weight-bold text-grey-darken-2">
              <v-icon size="16" color="green-darken-2" class="mr-1">mdi-leaf</v-icon>
              Mapa de Podas
            </span>
            <v-chip
              size="x-small"
              color="green"
              variant="flat"
              class="font-weight-bold"
              title="Árvores visíveis / Resultados dos filtros"
            >
              {{ visibleTreeCount }}/{{ treeCount }}
            </v-chip>
          </div>

          <!-- Stats compactos em grid -->
          <div class="d-flex gap-2 align-center">
            <v-btn
              variant="flat"
              size="small"
              color="green-lighten-4"
              class="stat-btn"
              title="Visíveis no mapa (dentro da área atual)"
              @click="
                () => {
                  sidebarOpen = true
                  activeTab = 'arvores'
                }
              "
            >
              <v-icon size="14" color="green-darken-2" class="mr-1">mdi-eye</v-icon>
              <span class="text-caption font-weight-bold text-green-darken-2">{{
                visibleTreeCount
              }}</span>
            </v-btn>

            <v-btn
              variant="flat"
              size="small"
              color="blue-lighten-4"
              class="stat-btn"
              title="Árvores que correspondem aos filtros ativos"
              @click="
                () => {
                  sidebarOpen = true
                  activeTab = 'arvores'
                }
              "
            >
              <v-icon size="14" color="blue-darken-2" class="mr-1">mdi-tree</v-icon>
              <span class="text-caption font-weight-bold text-blue-darken-2">{{ treeCount }}</span>
            </v-btn>

            <v-btn
              variant="flat"
              size="small"
              color="red-lighten-4"
              class="stat-btn"
              @click="
                () => {
                  sidebarOpen = true
                  showTreesNearPowerLine()
                }
              "
            >
              <v-icon size="14" color="red-darken-2" class="mr-1">mdi-alert</v-icon>
              <span class="text-caption font-weight-bold text-red-darken-2">{{ dangerCount }}</span>
            </v-btn>

            <v-btn icon size="small" variant="flat" color="grey" @click="sidebarOpen = true">
              <v-icon size="18">mdi-menu-open</v-icon>
            </v-btn>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ============ SIDEBAR COM ABAS ============ -->
    <Transition name="fade">
      <div v-if="sidebarOpen && isMobile" class="sidebar-backdrop" @click="sidebarOpen = false" />
    </Transition>

    <Transition name="slide">
      <div v-if="sidebarOpen" class="map-sidebar map-sidebar--tabs">
        <!-- Header com título e contador -->
        <div class="sidebar-header pa-3">
          <div class="d-flex align-center justify-space-between">
            <div class="d-flex align-center">
              <v-icon size="22" color="green-darken-2" class="mr-2">mdi-leaf</v-icon>
              <span class="font-weight-bold text-subtitle-1">Mapa de Podas</span>
            </div>
            <v-chip size="small" color="green" variant="flat" class="font-weight-bold">
              {{ visibleTreeCount }} visíveis
            </v-chip>
          </div>
          <div class="text-caption text-grey-darken-1 mt-1 d-flex justify-space-between">
            <span>{{ treeCount }} árvores correspondem aos filtros</span>
            <span v-if="cityStats" class="text-grey-darken-2">
              <v-icon size="12" color="blue" class="mr-1">mdi-city</v-icon>
              {{ cityStats.total }} na cidade
            </span>
          </div>
        </div>

        <!-- Abas de Navegação -->
        <v-tabs
          v-model="activeTab"
          color="green-darken-2"
          density="compact"
          grow
          class="sidebar-tabs"
        >
          <v-tab value="inventario"><span class="text-caption">Espécies</span></v-tab>
          <v-tab value="carregar">
            <span class="text-caption">Carregar</span>
          </v-tab>
          <v-tab value="arvores">
            <span class="text-caption">Árvores</span>
          </v-tab>
          <v-tab value="config">
            <span class="text-caption">Config</span>
          </v-tab>
        </v-tabs>

        <v-divider />

        <!-- Conteúdo das Abas -->
        <div class="sidebar-content">
          <div v-show="activeTab === 'inventario'" class="tab-panel inventory-panel">
            <div class="config-section mb-4">
              <div class="d-flex align-center justify-space-between mb-1">
                <p class="text-subtitle-2 font-weight-bold mb-0">
                  <v-icon size="16" class="mr-1">mdi-heat-wave</v-icon>
                  Mapa de calor
                </p>
                <v-switch
                  v-model="showTreeDensityLayer"
                  color="green-darken-2"
                  density="compact"
                  hide-details
                  inset
                  aria-label="Ativar mapa de concentração de árvores"
                />
              </div>

              <p class="text-caption font-weight-bold text-grey-darken-1 mb-1">
                <v-icon size="16" class="mr-1">mdi-leaf-maple</v-icon>
                Espécies no mapa
              </p>
              <div class="d-flex ga-2 mb-2">
                <v-chip size="small" color="green-darken-2" variant="tonal"
                  >{{ speciesDistribution.length }} espécies</v-chip
                >
                <v-chip size="small" color="blue-darken-2" variant="tonal"
                  >{{ filteredTrees.length }} árvores</v-chip
                >
                <v-chip
                  v-if="crownAreaEstimate.measuredTrees > 0"
                  size="small"
                  color="teal-darken-2"
                  variant="tonal"
                >
                  {{ crownAreaEstimate.areaM2.toFixed(0) }} m² de copa
                </v-chip>
              </div>
              <p v-if="!speciesDistribution.length" class="text-caption">
                {{
                  loadingTrees
                    ? 'Carregando árvores…'
                    : 'Sem árvores cadastradas na área carregada.'
                }}
              </p>
              <v-list density="compact" class="pa-0 species-count-list">
                <v-list-item
                  v-for="species in speciesDistribution"
                  :key="species.name"
                  class="px-1"
                  :class="{
                    'species-count-list__item--selected': selectedSpecies === species.name,
                  }"
                >
                  <template #prepend
                    ><span class="species-symbol" aria-hidden="true">{{
                      speciesIcon(species.name)
                    }}</span></template
                  >
                  <v-list-item-title class="text-body-2">{{ species.name }}</v-list-item-title>
                  <template #append>
                    <v-chip size="x-small" variant="outlined">{{ species.count }}</v-chip>
                    <v-checkbox-btn
                      :model-value="selectedSpecies === species.name"
                      density="compact"
                      color="green-darken-2"
                      :aria-label="`${selectedSpecies === species.name ? 'Limpar filtro de' : 'Filtrar por'} ${species.name}`"
                      @update:model-value="setSpeciesFilter(species.name)"
                    />
                  </template>
                </v-list-item>
              </v-list>
              <p class="text-caption text-grey mt-1 mb-0">
                Resumo dos registros que correspondem aos filtros ativos.
              </p>
              <p class="text-caption text-grey-darken-1 mt-2 mb-0">
                A cor indica onde há mais árvores da categoria selecionada.
              </p>
              <v-alert
                v-if="trees.length > 0 && densityTrees.length === 0"
                type="warning"
                variant="tonal"
                density="compact"
                class="mt-2 mb-0"
              >
                Os pontos de demonstração não entram neste inventário.
              </v-alert>
            </div>

            <!-- Concentração de árvores: calculada sobre os registros carregados no cliente -->
            <div class="config-section tree-density-controls mb-4">
              <v-select
                v-model="treeDensityDimension"
                :items="densityDimensionItems"
                item-title="title"
                item-value="value"
                label="Agrupar por"
                density="compact"
                variant="outlined"
                hide-details
                class="mb-2"
              />
              <v-select
                v-model="treeDensityCategory"
                :items="[
                  { title: 'Todas as categorias', value: 'all' },
                  ...treeDensityCategories.map((title) => ({ title, value: title })),
                ]"
                item-title="title"
                item-value="value"
                label="Categoria"
                @update:model-value="showTreeDensityLayer = true"
                density="compact"
                variant="outlined"
                hide-details
                class="mb-2"
              />
              <div class="density-heat-legend" aria-hidden="true">
                <span>Menor concentração</span><span class="density-heat-gradient" /><span
                  >Maior</span
                >
              </div>
              <p class="text-caption text-grey-darken-1 mt-2 mb-0">
                Árvores da categoria no mapa de calor: {{ treeDensityHeatPoints.length }}.
                <template v-if="topDensityCell">
                  Maior célula de referência (250 m):
                  <template v-if="treeDensityDimension === 'nests'"
                    >{{ topDensityCell.count }} ninho(s).</template
                  >
                  <template v-else-if="treeDensityDimension === 'canopy'"
                    >{{ topDensityCell.count.toFixed(1) }} m² estimados em
                    {{ topDensityCell.treeCount || 0 }} árvore(s).</template
                  >
                  <template v-else
                    >{{ topDensityCell.count }} árvore(s) ({{ topDensityCell.label }}).</template
                  >
                  <template v-if="treeDensityDimension === 'nests' && topDensityCell.treeCount">
                    Em {{ topDensityCell.treeCount }} árvore(s).
                    <template v-if="topDensityCell.averageNestAgeYears !== undefined">
                      Idade estimada média:
                      {{ topDensityCell.averageNestAgeYears.toFixed(1) }} anos.</template
                    >
                    <template v-if="topDensityCell.averageNestSizeCm !== undefined">
                      Tamanho médio: {{ topDensityCell.averageNestSizeCm.toFixed(0) }} cm.</template
                    >
                  </template>
                </template>
                <template v-else>
                  {{
                    treeDensityDimension === 'nests'
                      ? 'Não há vistorias de ninho registradas.'
                      : treeDensityDimension === 'canopy'
                        ? 'Não há medidas de copa válidas.'
                        : 'Não há árvores da categoria selecionada na área carregada.'
                  }}
                </template>
              </p>
              <v-alert
                v-if="
                  (treeDensityDimension === 'nests' || treeDensityDimension === 'canopy') &&
                  treeDensityCategories.length === 0
                "
                type="info"
                variant="tonal"
                density="compact"
                class="mt-2 mb-0"
              >
                {{
                  treeDensityDimension === 'nests'
                    ? 'Ainda não há vistorias de ninho nas árvores carregadas. Registre uma vistoria pela análise da árvore.'
                    : 'A estimativa usa as medidas de largura de copa que já existem; esta área não desconta sobreposição e não equivale à cobertura percentual do município.'
                }}
              </v-alert>
            </div>
          </div>

          <!-- === ABA 1: CARREGAR ÁRVORES === -->
          <div v-show="activeTab === 'carregar'" class="tab-panel">
            <!-- Info da Região -->
            <div v-if="selectedRegion" class="d-flex align-center mb-3">
              <v-icon size="16" color="green-darken-1" class="mr-2">mdi-map-marker</v-icon>
              <span class="text-caption text-grey-darken-1">
                Região: <strong>{{ selectedRegion.name }}</strong>
              </span>
            </div>

            <!-- Seleção de Região -->
            <v-select
              v-model="selectedRegion"
              :items="availableRegions"
              item-title="name"
              return-object
              label="Selecionar cidade/região"
              density="compact"
              variant="outlined"
              class="mb-3"
              clearable
              hide-details
              @update:model-value="(region) => region && onRegionSelected(region)"
            />

            <!-- Estatísticas da Cidade -->
            <div v-if="selectedRegion && cityStats" class="city-stats-card mb-3">
              <div class="d-flex justify-space-between align-center">
                <span class="text-caption font-weight-bold">
                  <v-icon size="14" color="green" class="mr-1">mdi-tree</v-icon>
                  {{ cityStats.total }} árvores
                </span>
                <span v-if="cityStats.withRisk > 0" class="text-caption text-red-darken-2">
                  <v-icon size="14" color="red">mdi-alert</v-icon>
                  {{ cityStats.withRisk }}
                </span>
              </div>
              <v-progress-linear
                v-if="cityStats.total > 0"
                :model-value="(cityStats.withRisk / cityStats.total) * 100"
                color="red"
                height="3"
                class="mt-1"
              />
            </div>

            <!-- Botões de Ação -->
            <div class="action-buttons">
              <v-btn
                block
                size="small"
                variant="flat"
                color="blue-darken-1"
                prepend-icon="mdi-download"
                :loading="loadingRegion"
                :disabled="!selectedRegion"
                @click="selectedRegion && fetchTreesByRegion(selectedRegion, true)"
                class="mb-2"
              >
                Carregar Região
              </v-btn>

              <div class="d-flex gap-2 mb-2">
                <v-btn
                  size="small"
                  variant="flat"
                  color="teal-darken-1"
                  prepend-icon="mdi-crosshairs-gps"
                  @click="detectAndLoadRegion"
                  class="flex-grow-1"
                  density="comfortable"
                >
                  Minha Região
                </v-btn>
                <v-btn
                  size="small"
                  variant="tonal"
                  color="green-darken-1"
                  prepend-icon="mdi-refresh"
                  :loading="loadingTrees"
                  @click="fetchTreesNearby(true)"
                  density="comfortable"
                />
              </div>

              <v-btn
                v-if="hasMoreTrees"
                block
                size="small"
                variant="tonal"
                color="grey-darken-1"
                prepend-icon="mdi-map-marker-radius"
                :loading="loadingTrees"
                @click="loadMoreTrees"
                class="mb-2"
              >
                Expandir raio
              </v-btn>

              <v-btn
                block
                size="small"
                variant="text"
                color="grey-darken-1"
                prepend-icon="mdi-grid"
                :loading="loadingTrees"
                @click="loadVisibleTiles"
                class="mb-2"
              >
                Carregar Área Visível
              </v-btn>
            </div>

            <!-- Controles -->
            <v-divider class="my-3" />
            <div class="controls-section">
              <div class="d-flex align-center justify-space-between mb-2">
                <div class="d-flex align-center">
                  <v-icon size="14" class="mr-1">mdi-refresh-auto</v-icon>
                  <span class="text-caption text-grey-darken-1">Auto-carregar ao ampliar</span>
                  <v-tooltip location="bottom" max-width="250">
                    <template #activator="{ props }">
                      <v-icon v-bind="props" size="12" color="grey-lighten-1" class="ml-1"
                        >mdi-help-circle</v-icon
                      >
                    </template>
                    <span class="text-caption">
                      Quando ativado, o mapa carrega árvores automaticamente quando você dá zoom
                      (amplia) em uma área.<br /><br />
                      <strong>Como funciona:</strong><br />
                      • Detecta quando você para de mover o mapa<br />
                      • Se o zoom for suficiente (nível de rua/bairro)<br />
                      • Carrega as árvores da área visível<br /><br />
                      Isso evita carregar milhares de árvores de uma vez só.
                    </span>
                  </v-tooltip>
                </div>
                <v-switch v-model="autoLoadOnZoom" color="green" density="compact" hide-details />
              </div>
              <div class="follow-control">
                <div class="follow-control__text">
                  <span class="text-caption text-grey-darken-1 d-flex align-center">
                    <v-icon size="14" class="mr-1">mdi-crosshairs-gps</v-icon>
                    Seguir minha posição
                  </span>
                  <span class="follow-control__hint">
                    {{
                      followUserPosition
                        ? 'Ativo: o mapa acompanha seu GPS.'
                        : 'Ative para manter o mapa centralizado no seu GPS.'
                    }}
                  </span>
                </div>
                <v-switch
                  v-model="followUserPosition"
                  color="blue"
                  density="compact"
                  hide-details
                  @update:model-value="setFollowUserPosition"
                />
              </div>
            </div>

            <v-progress-linear
              v-if="loadingTrees"
              indeterminate
              color="green"
              class="mt-3"
              height="2"
            />
          </div>

          <!-- === ABA 2: LISTA DE ÁRVORES === -->
          <div v-show="activeTab === 'arvores'" class="tab-panel">
            <!-- Filtros Rápidos -->
            <div class="filter-section mb-3">
              <p class="text-caption font-weight-bold text-grey-darken-1 mb-2">
                Comece pelo que precisa de poda:
              </p>
              <div class="filter-chips-scroll">
                <v-chip
                  size="small"
                  :variant="activeFilter === 'CRITICAL' ? 'flat' : 'outlined'"
                  :color="activeFilter === 'CRITICAL' ? 'error' : 'grey'"
                  @click="activeFilter = 'CRITICAL'"
                  class="mr-1 mb-1"
                >
                  <v-icon start size="14">mdi-alert-decagram</v-icon>
                  Críticos ({{ criticalCount }})
                </v-chip>
                <v-chip
                  size="small"
                  :variant="activeFilter === 'TO_PRUNE' ? 'flat' : 'outlined'"
                  :color="activeFilter === 'TO_PRUNE' ? 'orange-darken-2' : 'grey'"
                  @click="activeFilter = 'TO_PRUNE'"
                  class="mr-1 mb-1"
                >
                  <v-icon start size="14">mdi-content-cut</v-icon>
                  Para podar ({{ toPruneCount }})
                </v-chip>
                <v-chip
                  size="small"
                  :variant="activeFilter === 'ALL' ? 'flat' : 'outlined'"
                  :color="activeFilter === 'ALL' ? 'green' : 'grey'"
                  @click="activeFilter = 'ALL'"
                  class="mr-1 mb-1"
                >
                  Todos ({{ allFilterCount }})
                </v-chip>
              </div>
            </div>

            <v-divider class="mb-2" />

            <!-- Lista de Árvores -->
            <div class="tree-list-header d-flex justify-space-between align-center mb-2">
              <span class="text-caption font-weight-bold">
                <v-icon size="14" class="mr-1">mdi-tree</v-icon>
                Árvores ({{ filteredTrees.length }})
              </span>
              <v-btn
                v-if="filteredTrees.length > 0"
                size="x-small"
                variant="text"
                color="primary"
                @click="activeFilter = 'ALL'"
              >
                Ver todas
              </v-btn>
            </div>

            <div v-if="filteredTrees.length === 0" class="text-caption text-center text-grey pa-4">
              Nenhuma árvore para estes filtros
            </div>

            <div class="tree-list-scroll-new">
              <v-list density="compact" class="pa-0">
                <v-list-item
                  v-for="tree in filteredTrees.slice(0, 50)"
                  :key="tree.id"
                  :active="selectedTree?.id === tree.id"
                  :color="STATUS_CONFIG[tree.status]?.color || 'green'"
                  @click="
                    () => {
                      flyToTree(tree)
                      openAiDrawer(tree)
                    }
                  "
                  class="tree-list-item-new"
                  two-line
                >
                  <template #prepend>
                    <v-avatar size="32" :color="STATUS_CONFIG[tree.status]?.bg || 'green'">
                      <span class="tree-species-icon" aria-hidden="true">{{
                        speciesIcon(tree.speciesName)
                      }}</span>
                    </v-avatar>
                  </template>

                  <v-list-item-title class="text-body-2">
                    {{ tree.speciesName }}
                  </v-list-item-title>

                  <v-list-item-subtitle class="text-caption">
                    {{ STATUS_CONFIG[tree.status]?.label || tree.status }}
                    <span v-if="tree.nearPowerLine"> · Risco operacional</span>
                  </v-list-item-subtitle>
                  <span v-if="tree.pruningLabel" class="text-caption text-green-darken-3">
                    {{ tree.pruningLabel }}
                  </span>

                  <template #append>
                    <v-icon size="16" color="grey">mdi-chevron-right</v-icon>
                  </template>
                </v-list-item>
              </v-list>

              <div v-if="filteredTrees.length > 50" class="text-caption text-center text-grey pa-2">
                +{{ filteredTrees.length - 50 }} árvores (use filtros para refinar)
              </div>
            </div>
          </div>

          <!-- === ABA 3: CONFIGURAÇÕES === -->
          <div v-show="activeTab === 'config'" class="tab-panel">
            <!-- IA & Importação -->
            <div class="config-section mb-4">
              <p class="text-caption font-weight-bold text-grey-darken-1 mb-2">
                <v-icon size="16" class="mr-1">mdi-brain</v-icon>
                IA & Importação
              </p>
              <v-btn
                block
                size="small"
                variant="flat"
                color="deep-purple-darken-2"
                prepend-icon="mdi-sync"
                :loading="importingIA"
                @click="syncIA"
                class="mb-2"
              >
                Sincronizar IA (396+)
              </v-btn>
              <v-btn
                block
                size="small"
                variant="outlined"
                color="deep-purple-lighten-2"
                prepend-icon="mdi-file-delimited"
                @click="importCsvMode = true"
              >
                Importar CSV MapTree
              </v-btn>
            </div>

            <v-divider class="mb-4" />

            <!-- Legenda -->
            <div class="config-section mb-4">
              <p class="text-caption font-weight-bold text-grey-darken-1 mb-2">
                <v-icon size="16" class="mr-1">mdi-palette</v-icon>
                Legenda de Status
              </p>
              <div class="legend-grid">
                <div v-for="(cfg, key) in STATUS_CONFIG" :key="key" class="legend-item">
                  <span class="legend-dot-new" :style="{ background: cfg.bg }" />
                  <v-icon size="14" :color="cfg.color">{{ cfg.icon }}</v-icon>
                  <span class="text-caption">{{ cfg.label }}</span>
                </div>
                <div class="legend-item">
                  <span class="legend-line-new" />
                  <span class="text-caption">⚡ Rede elétrica</span>
                </div>
              </div>
            </div>

            <!-- Camada de Solo -->
            <div class="config-section">
              <p class="text-caption font-weight-bold text-grey-darken-1 mb-2">
                <v-icon size="16" class="mr-1">mdi-layers</v-icon>
                Camada de Solo
              </p>
              <v-btn-toggle
                v-model="soilRenderMode"
                density="compact"
                variant="outlined"
                divided
                class="w-100 mb-2"
                @update:model-value="changeSoilRenderMode"
              >
                <v-btn value="circles" size="x-small">
                  <v-icon size="14">mdi-circle-outline</v-icon>
                </v-btn>
                <v-btn value="dots" size="x-small">
                  <v-icon size="14">mdi-circle-small</v-icon>
                </v-btn>
                <v-btn value="grid" size="x-small">
                  <v-icon size="14">mdi-grid</v-icon>
                </v-btn>
                <v-btn value="heatmap" size="x-small">
                  <v-icon size="14">mdi-heatmap</v-icon>
                </v-btn>
              </v-btn-toggle>
              <div class="text-caption text-center text-grey mb-2" style="font-size: 10px">
                {{
                  soilRenderMode === 'circles'
                    ? 'Círculos'
                    : soilRenderMode === 'dots'
                      ? 'Pontos'
                      : soilRenderMode === 'grid'
                        ? 'Grid'
                        : 'Heatmap'
                }}
              </div>

              <div v-if="showSoilLayer" class="soil-legend-compact">
                <div v-for="(info, key) in SOIL_TYPES" :key="key" class="soil-item">
                  <span class="soil-dot" :style="{ background: info.color }" />
                  <span class="text-caption" style="font-size: 10px">{{ info.name }}</span>
                </div>
              </div>
            </div>

            <!-- Marcações -->
            <template v-if="markedLocations.length > 0">
              <v-divider class="my-4" />
              <div class="config-section">
                <p class="text-caption font-weight-bold text-grey-darken-1 mb-2">
                  <v-icon size="16" class="mr-1">mdi-map-marker</v-icon>
                  Marcações ({{ markedLocations.length }})
                </p>
                <v-list density="compact" class="pa-0">
                  <v-list-item v-for="loc in markedLocations" :key="loc.id" density="compact">
                    <template #title>
                      <span class="text-caption text-truncate">{{ loc.notes || 'Sem nota' }}</span>
                    </template>
                    <template #append>
                      <v-btn
                        icon
                        size="x-small"
                        variant="text"
                        color="red"
                        @click="removeMarkedLocation(loc.id)"
                      >
                        <v-icon size="14">mdi-close</v-icon>
                      </v-btn>
                    </template>
                  </v-list-item>
                </v-list>
              </div>
            </template>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ============ ALERTA ERRO ============ -->
    <v-alert
      v-if="locationError"
      type="warning"
      density="compact"
      variant="tonal"
      closable
      class="location-error-alert"
      @click:close="locationError = ''"
    >
      <div class="location-error-content">
        <span>{{ locationError }}. A área do mapa continua disponível.</span>
        <v-btn size="small" variant="tonal" :loading="locating" @click.stop="goToUserLocation(true)"
          >Usar minha localização</v-btn
        >
      </div>
    </v-alert>

    <!-- ============ BADGE MODO MARCAÇÃO ============ -->
    <Transition name="fade">
      <div v-if="markMode" class="mark-mode-badge">
        <v-icon size="18" class="mr-1">mdi-map-marker-plus</v-icon>
        Modo Marcação — Clique no mapa para marcar
      </div>
    </Transition>

    <!-- ============ SNACKBAR ============ -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000" location="bottom right">
      {{ snackbarText }}
    </v-snackbar>

    <!-- ============ ANÁLISE DA ÁRVORE ============ -->
    <v-navigation-drawer
      v-if="aiDrawerOpen"
      v-model="aiDrawerOpen"
      location="right"
      temporary
      :width="isMobile ? 320 : 420"
      class="ai-drawer"
      :scrim="false"
    >
      <div class="ai-drawer-header">
        <div class="d-flex align-center">
          <div class="ai-drawer-icon">
            <v-icon size="22" color="white">mdi-tree</v-icon>
          </div>
          <div class="ml-3">
            <h2 class="ai-drawer-title mb-0">Análise da árvore</h2>
            <p class="ai-drawer-subtitle">{{ selectedTree?.speciesName || 'Árvore' }}</p>
            <p v-if="selectedTree" class="ai-drawer-subtitle">Identificação: #{{ selectedTree.id }}</p>
          </div>
        </div>
        <v-btn
          icon
          variant="text"
          size="small"
          aria-label="Fechar análise da árvore"
          @click="closeAiDrawer"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </div>

      <v-divider />

      <div v-if="selectedTree" class="ai-drawer-body">
        <TreeAiStats
          v-if="aiTreeData"
          :key="aiTreeData.id"
          :data="aiTreeData"
          :prediction-state="aiPredictionState"
          :error-message="aiDetailsError"
          @retry="retryAiAnalysis"
        />

        <v-card class="tree-analysis-location mt-4" variant="outlined">
          <v-card-text class="py-3">
            <p class="text-subtitle-2 font-weight-bold mb-2">Localização e solo</p>
            <p class="text-body-2 mb-1">{{ selectedTree.address || 'Endereço não informado' }}</p>
            <p class="text-caption text-medium-emphasis mb-2">
              {{ selectedTree.latitude.toFixed(5) }}, {{ selectedTree.longitude.toFixed(5) }}
            </p>
            <p class="text-body-2 mb-0">
              <strong>Solo:</strong>
              {{
                ['PENDING', 'PROCESSING'].includes(selectedTree.soilStatus || '')
                  ? 'Em processamento'
                  : selectedTree.soilQuality && selectedTree.soilQuality !== 'UNKNOWN'
                    ? getSoilInfo(selectedTree.soilQuality).name
                    : 'Não informado'
              }}
            </p>
          </v-card-text>
        </v-card>

        <v-btn
          v-if="selectedTree"
          block
          class="mt-4"
          color="primary"
          variant="tonal"
          prepend-icon="mdi-content-cut"
          @click="openTreePruning(selectedTree)"
        >
          Registrar poda desta árvore
        </v-btn>
        <v-btn
          v-if="canEditTreeLocation(selectedTree)"
          block
          class="mt-2"
          color="primary"
          variant="outlined"
          prepend-icon="mdi-map-marker-move"
          @click="void openTreeLocationEdit(selectedTree)"
        >
          Editar localização
        </v-btn>
        <v-btn
          v-if="canEditTree(selectedTree)"
          block
          class="mt-2"
          color="primary"
          variant="outlined"
          prepend-icon="mdi-pencil"
          @click="openTreeEdit(selectedTree)"
        >
          Editar árvore
        </v-btn>

        <v-btn
          v-if="selectedTree"
          block
          class="mt-2"
          color="green-darken-2"
          variant="tonal"
          @click="openNestObservationDialog"
        >
          <span class="nest-icon mr-2" aria-hidden="true">{{ NEST_ICON }}</span>
          Registrar vistoria de ninhos
        </v-btn>

        <TreeFieldMeasurement
          v-if="selectedTree && !selectedTree.isDemoData"
          :key="selectedTree.id"
          :tree-id="selectedTree.id"
          :measurement="fieldMeasurement"
          :wire-height="fieldWireHeight"
          @saved="fieldMeasurementSaved"
        />
      </div>
    </v-navigation-drawer>

    <v-dialog v-model="nestObservationDialog" max-width="480">
      <v-card class="rounded-xl">
        <v-card-title class="d-flex align-center ga-2">
          <span class="nest-icon" aria-hidden="true">{{ NEST_ICON }}</span>
          Vistoria de ninhos
        </v-card-title>
        <v-card-subtitle>
          {{ selectedTree?.speciesName || 'Árvore' }} · {{ selectedTree?.latitude.toFixed(5) }},
          {{ selectedTree?.longitude.toFixed(5) }}
        </v-card-subtitle>
        <v-card-text>
          <v-alert type="info" variant="tonal" density="compact" class="mb-4">
            A localização é a coordenada da árvore. Informe zero se a vistoria confirmou que não há
            ninhos; deixe a vistoria sem salvar se não foi possível verificar.
          </v-alert>
          <v-text-field
            v-model="nestObservationForm.quantity"
            label="Quantidade de ninhos observados *"
            type="number"
            min="0"
            step="1"
            variant="outlined"
            prepend-inner-icon="mdi-counter"
          />
          <template v-if="Number(nestObservationForm.quantity) > 0">
            <v-text-field
              v-model="nestObservationForm.estimatedAgeYears"
              label="Idade estimada do ninho (anos, opcional)"
              type="number"
              min="0"
              step="0.1"
              variant="outlined"
              prepend-inner-icon="mdi-calendar-clock"
            />
            <v-text-field
              v-model="nestObservationForm.averageSizeCm"
              label="Tamanho médio do ninho (cm, opcional)"
              type="number"
              min="0.1"
              step="any"
              variant="outlined"
              prepend-inner-icon="mdi-ruler"
            />
          </template>
          <v-textarea
            v-model="nestObservationForm.notes"
            label="Observações (opcional)"
            rows="2"
            auto-grow
            variant="outlined"
          />
          <p class="text-caption text-medium-emphasis mb-0">
            Data da vistoria: {{ new Date().toLocaleDateString('pt-BR') }}
          </p>
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn
            variant="text"
            :disabled="savingNestObservation"
            @click="nestObservationDialog = false"
            >Cancelar</v-btn
          >
          <v-btn
            color="green-darken-2"
            variant="flat"
            :loading="savingNestObservation"
            @click="submitNestObservation"
            >Salvar vistoria</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- =====================================================
         SEÇÃO 5: DRAWER DE IA (Análise de Árvore)
         - Mostra dados de IA da árvore selecionada
         - Componente: TreeAiStats
         - Aberto via openAiDrawer()
         ===================================================== -->

    <!-- =====================================================
         SEÇÃO 6: DIALOG DE IMPORTAÇÃO CSV
         - Importa dados de arquivo CSV do MapTree
         - Caminho do arquivo no servidor
         ===================================================== -->
    <v-dialog v-model="importCsvMode" max-width="400">
      <v-card class="rounded-xl pa-4">
        <v-card-title class="headline d-flex align-center">
          <v-icon color="deep-purple" class="mr-2">mdi-file-import</v-icon>
          Importar CSV
        </v-card-title>
        <v-card-text>
          <p class="text-body-2 mb-4">
            Informe o caminho completo do arquivo CSV no servidor para processamento.
          </p>
          <v-text-field
            v-model="csvPath"
            label="Caminho do Arquivo"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-folder-outline"
            hide-details
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="importCsvMode = false">Cancelar</v-btn>
          <v-btn
            color="deep-purple-darken-1"
            variant="flat"
            @click="syncCsvIA"
            :loading="importingIA"
          >
            Iniciar Importação
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- =====================================================
         MODAL - Nota de nova marcação no mapa
         ===================================================== -->
    <v-dialog v-model="noteDialog" max-width="400">
      <v-card class="rounded-xl pa-4">
        <v-card-title class="headline d-flex align-center"> 📌 Nova marcação </v-card-title>
        <v-card-text>
          <v-text-field
            v-model="noteText"
            label="Nota da marcação"
            variant="outlined"
            autofocus
            @keyup.enter="confirmMarking"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="cancelMarking">Cancelar</v-btn>
          <v-btn color="deep-purple-darken-1" variant="flat" @click="confirmMarking">
            Confirmar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="quickSpeciesDialog" max-width="480" :persistent="quickSpeciesLoading">
      <v-card class="rounded-xl" title="Cadastro rápido · espécie">
        <v-card-text>
          <p class="text-body-2 mb-4">
            A espécie fica selecionada para os próximos pontos. Cada árvore recebe as coordenadas
            confirmadas no mapa.
          </p>
          <v-alert v-if="quickSpeciesError" type="error" variant="tonal" class="mb-4">
            {{ quickSpeciesError }}
            <template #append>
              <v-btn variant="text" :loading="quickSpeciesLoading" @click="loadQuickTreeSpecies">
                Tentar novamente
              </v-btn>
            </template>
          </v-alert>
          <v-autocomplete
            v-model="quickTreeSpeciesId"
            :items="quickTreeSpecies"
            item-title="commonName"
            item-value="id"
            label="Espécie da árvore *"
            variant="outlined"
            :loading="quickSpeciesLoading"
            :disabled="quickSpeciesLoading || quickTreeSaving"
            no-data-text="Nenhuma espécie encontrada"
          >
            <template #item="{ props, item }">
              <v-list-item v-bind="props" :subtitle="item.raw.scientificName" />
            </template>
          </v-autocomplete>
        </v-card-text>
        <v-card-actions class="px-6 pb-5">
          <v-spacer />
          <v-btn :disabled="quickSpeciesLoading" @click="quickSpeciesDialog = false">Fechar</v-btn>
          <v-btn
            color="green-darken-3"
            variant="flat"
            :disabled="!quickTreeSpeciesId || quickSpeciesLoading"
            @click="confirmQuickTreeSpecies"
            >Escolher espécie</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="locationEditDialog" max-width="560" persistent scrollable>
      <v-card class="location-review-card rounded-xl">
        <v-card-title class="flex items-center gap-3 px-6 pt-5">
          <v-avatar color="green-darken-2" size="42">
            <v-icon color="white">mdi-map-marker-tree</v-icon>
          </v-avatar>
          <div class="min-w-0">
            <h2 class="text-h6 font-weight-bold m-0">Revisar nova localização</h2>
            <p class="text-body-2 text-medium-emphasis mb-0">
              {{ locationEditTree?.speciesName || 'Árvore' }}
            </p>
          </div>
        </v-card-title>
        <v-card-text class="location-review-content px-6 pt-4">
          <v-alert
            v-if="locationEditError"
            :type="locationEditConflict ? 'warning' : 'error'"
            variant="tonal"
            class="mb-4"
            role="alert"
          >
            {{ locationEditError }}
            <template v-if="locationEditConflict" #append>
              <v-btn
                variant="text"
                :loading="locationEditLoading"
                @click="reloadTreeAfterLocationConflict"
                >Recarregar versão atual</v-btn
              >
            </template>
          </v-alert>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label for="location-latitude" class="mb-1 block text-sm font-semibold">Latitude</label>
              <v-text-field
                id="location-latitude"
                v-model="locationLatitudeInput"
                aria-label="Latitude"
                type="number"
                step="any"
                inputmode="decimal"
                variant="outlined"
                density="comfortable"
                hide-details="auto"
              />
            </div>
            <div>
              <label for="location-longitude" class="mb-1 block text-sm font-semibold">Longitude</label>
              <v-text-field
                id="location-longitude"
                v-model="locationLongitudeInput"
                aria-label="Longitude"
                type="number"
                step="any"
                inputmode="decimal"
                variant="outlined"
                density="comfortable"
                hide-details="auto"
              />
            </div>
          </div>

          <v-alert
            v-if="!locationInputsValid"
            type="warning"
            variant="tonal"
            density="compact"
            class="mt-1 mb-4"
          >
            Informe latitude entre −90 e 90 e longitude entre −180 e 180.
          </v-alert>

          <div class="mt-2">
            <label for="location-address" class="mb-1 block text-sm font-semibold">Endereço associado</label>
            <v-text-field
              id="location-address"
              v-model="locationAddressInput"
              aria-label="Endereço associado (revise)"
              maxlength="300"
              variant="outlined"
              density="comfortable"
              hide-details
            />
            <div class="mt-1 flex flex-col justify-between gap-1 text-xs text-medium-emphasis sm:flex-row">
              <span>Confira rua e número para a nova posição.</span>
              <span>{{ locationAddressInput.length }}/300 caracteres</span>
            </div>
          </div>

          <div class="mt-4 rounded-lg border px-3 py-2 text-sm text-medium-emphasis">
            <span class="font-semibold">Posição anterior</span>
            <span class="ml-1">
              {{ locationOriginalPosition?.latitude.toFixed(6) }},
              {{ locationOriginalPosition?.longitude.toFixed(6) }}
            </span>
          </div>
        </v-card-text>
        <v-card-actions class="location-review-actions px-6 pb-4 pt-3">
          <v-spacer />
          <v-btn :disabled="locationSaving" @click="cancelTreeLocationEdit">Cancelar</v-btn>
          <v-btn
            color="green-darken-2"
            variant="flat"
            :loading="locationSaving"
            :disabled="!canSaveLocation"
            @click="saveTreeLocation"
            >Salvar localização</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
/* ============ ROOT ============ */
.map-root {
  position: relative;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: var(--mt-canvas);
}

.map-root.map-expanded {
  position: fixed !important;
  top: 0;
  left: 0;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 9999;
}

#pruning-map-container {
  width: 100%;
  height: 100%;
  z-index: 1;
  background: var(--mt-canvas);
}

:global(:root[data-theme='dark'] #pruning-map-container .leaflet-control-zoom a) {
  border-color: var(--mt-border) !important;
  background: var(--mt-surface) !important;
  color: var(--mt-ink) !important;
}

:global(:root[data-theme='dark'] #pruning-map-container .leaflet-control-attribution) {
  background: color-mix(in srgb, var(--mt-surface) 88%, transparent);
  color: var(--mt-text-muted);
}

:global(:root[data-theme='dark'] #pruning-map-container .leaflet-control-attribution a) {
  color: var(--mt-teal) !important;
}

.daily-route-map-card {
  position: absolute;
  top: 72px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1100;
  width: min(360px, calc(100% - 32px));
  padding: 14px;
  border: 1px solid var(--mt-border);
  border-radius: 16px;
  background: var(--mt-surface);
  backdrop-filter: blur(12px);
}
.daily-route-next {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 9px 10px;
  border-radius: 10px;
  background: var(--mt-surface-soft);
}
:global(.daily-route-stop-icon) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 3px solid #fff;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  background: #2e7d32;
  color: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
:global(.daily-route-stop-icon span) {
  transform: rotate(45deg);
  font-size: 13px;
  font-weight: 800;
}
:global(.daily-route-tooltip) {
  border: 0;
  border-radius: 8px;
  color: var(--mt-forest);
  font-weight: 700;
}

/* ============ OVERLAY LOADING ============ */
.locating-overlay {
  position: absolute;
  inset: 0;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(8px);
}

/* ============ BUSCA TOPO ============ */
.top-search-bar {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1001;
  width: 380px;
  max-width: calc(100% - 340px);
}

/* ============ BARRA DE FILTRO PRINCIPAL ============ */
.main-filter-bar {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1001;
  pointer-events: auto;
}

.map-filter-empty-card {
  position: absolute;
  z-index: 1002;
  bottom: 92px;
  left: 50%;
  width: max-content;
  max-width: calc(100% - 24px);
  transform: translateX(-50%);
  box-shadow: 0 6px 24px rgba(15, 23, 42, 0.18);
}

.tree-registration-pick-card {
  position: absolute;
  z-index: 1100;
  top: 72px;
  left: 50%;
  width: min(400px, calc(100% - 24px));
  padding: 16px;
  transform: translateX(-50%);
  border: 1px solid var(--mt-border);
  border-radius: 16px;
}

.tree-location-edit-card {
  position: absolute;
  z-index: 1101;
  top: 72px;
  left: 50%;
  width: min(420px, calc(100% - 24px));
  padding: 16px;
  transform: translateX(-50%);
  border: 1px solid #f59e0b;
  border-radius: 16px;
}

:global(.tree-registration-pin-shell) {
  background: transparent;
  border: 0;
}

:global(.tree-registration-pin) {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border: 3px solid #fff;
  border-radius: 50% 50% 50% 0;
  background: #16803c;
  color: #fff;
  font-size: 24px;
  font-weight: 800;
  box-shadow: 0 3px 12px rgba(15, 23, 42, 0.35);
  transform: rotate(-45deg);
}

:global(.tree-registration-pin--outside) {
  background: #b42318;
}

:global(.tree-registration-pin span) {
  transform: rotate(45deg);
}

.filter-toggle {
  background: var(--mt-surface) !important;
  backdrop-filter: blur(12px);
  border: 1px solid var(--mt-border);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2) !important;
  padding: 4px;
  height: auto !important;
}

.toggle-btn {
  font-weight: 800 !important;
  font-size: 11px !important;
  letter-spacing: 0.5px !important;
  text-transform: uppercase !important;
  height: 40px !important;
  padding: 0 20px !important;
  border-radius: 20px !important;
}

.toggle-btn:not(.v-btn--active) {
  color: var(--mt-forest) !important;
}

@media (max-width: 768px) {
  .main-filter-bar {
    bottom: 20px;
    width: calc(100% - 40px);
  }
  .filter-toggle {
    width: 100%;
    display: flex;
  }
  .toggle-btn {
    flex: 1;
    padding: 0 8px !important;
    font-size: 10px !important;
  }
  .tree-registration-pick-card {
    top: 72px;
  }
  .tree-location-edit-card {
    top: 70px;
  }
  .map-filter-empty-card {
    bottom: 82px;
  }
}

/* ============ BOTÕES FLUTUANTES DIREITA ============ */
.floating-actions-right {
  position: absolute;
  top: 140px;
  right: 14px;
  z-index: 1001;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

/* Painel agrupado dos controles do mapa (estilo Google Maps/Mapbox) */
.map-tools-panel {
  background: var(--mt-surface);
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px;
  overflow: hidden;
}

.map-tools-panel--single {
  padding: 0;
  width: 44px;
  height: 44px;
  border: 1px solid var(--mt-border);
  color: var(--mt-forest);
}

:deep(.map-tools-panel--single .v-icon) {
  color: var(--mt-forest);
}

.map-tool-btn {
  width: 40px !important;
  height: 40px !important;
  border-radius: 10px !important;
}

.map-tool-btn:hover {
  background: var(--mt-surface-soft) !important;
}

/* Divisória sutil entre os botões */
.map-tool-divider {
  width: 22px;
  height: 1px;
  background: var(--mt-border);
  margin: 1px 0;
}

/* ============ SIDEBAR ============ */
.sidebar-toggle-btn {
  position: absolute;
  top: 80px;
  z-index: 1002;
  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.map-sidebar {
  position: absolute;
  top: 88px;
  left: 14px;
  z-index: 1001;
  width: 296px;
  max-height: calc(100% - 104px);
  background: var(--mt-surface);
  border: 1px solid var(--mt-border);
  border-radius: 20px;
  box-shadow: 0 16px 44px rgba(22, 49, 32, 0.2);
  overflow-y: auto;
  overflow-x: hidden;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.map-sidebar:hover {
  box-shadow: 0 18px 48px rgba(22, 49, 32, 0.24);
}

.sidebar-backdrop {
  display: none !important; /* Removemos o backdrop escuro para desktop */
}

.sidebar-section {
  padding: 14px 16px;
}

.sidebar-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--mt-forest);
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.sidebar-subtitle {
  font-size: 13px;
  font-weight: 600;
  color: var(--mt-forest);
  margin-bottom: 8px;
}

/* ============ STATS GRID ============ */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.stat-card {
  background: var(--mt-surface);
  border-radius: 10px;
  padding: 10px;
  text-align: center;
  border: 2px solid var(--mt-border);
  cursor: pointer;
  transition: all 0.2s;
}

.stat-card:hover {
  border-color: var(--accent);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.stat-number {
  font-size: 22px;
  font-weight: 800;
  color: var(--accent);
}

.stat-label {
  font-size: 11px;
  color: var(--mt-text-muted);
  font-weight: 500;
}

/* ============ FILTROS ============ */
.filter-chips {
  display: flex;
  flex-wrap: wrap;
}

/* ============ LISTA DE ÁRVORES ============ */
.tree-list-section {
  padding-bottom: 4px !important;
}

.tree-list-scroll {
  max-height: 250px;
  overflow-y: auto;
}

.tree-list-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.tree-list-item:hover {
  background: var(--mt-surface-soft);
}
.tree-list-item--active {
  background: var(--mt-surface-soft) !important;
}

.tree-list-item--danger {
  background: color-mix(in srgb, rgb(var(--v-theme-error)) 11%, var(--mt-surface));
}

.tree-list-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.tree-list-info {
  flex: 1;
  min-width: 0;
}
.tree-list-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--mt-forest);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tree-list-meta {
  font-size: 11px;
  color: var(--mt-text-muted);
}
.soil-legend-scroll {
  max-height: 160px;
  overflow-y: auto;
  padding-right: 4px;
}
.soil-legend-scroll::-webkit-scrollbar {
  width: 3px;
}
.soil-legend-scroll::-webkit-scrollbar-thumb {
  background: #d7ccc8;
  border-radius: 10px;
}

/* ============ FLOATING SOIL LEGEND ============ */
.floating-soil-legend {
  position: absolute;
  top: 80px;
  left: 20px;
  z-index: 1000;
  width: 240px;
  color: var(--mt-forest);
  background: color-mix(in srgb, var(--mt-surface) 92%, transparent);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(121, 85, 72, 0.2);
  border-radius: 16px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: all 0.3s ease;
}

.legend-header {
  background: var(--mt-surface-soft);
  padding: 10px 14px;
  font-size: 11px;
  font-weight: 800;
  color: var(--mt-forest);
  text-transform: uppercase;
  display: flex;
  align-items: center;
}

.legend-content {
  padding: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.03);
}

.color-box {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  flex-shrink: 0;
}

.item-text {
  display: flex;
  flex-direction: column;
}

.item-name {
  font-size: 11px;
  font-weight: 700;
  color: var(--mt-forest);
}

.item-impact {
  font-size: 9px;
  color: var(--mt-text-muted);
  font-weight: 600;
}

.legend-footer {
  padding: 8px;
  font-size: 9px;
  color: var(--mt-text-muted);
  text-align: center;
  background: var(--mt-surface-soft);
}

/* ============ LEGENDA ============ */
.legend-row {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 8px;
  flex-shrink: 0;
}

.legend-line {
  width: 20px;
  border-top: 3px dashed #e53935;
  margin-right: 8px;
  flex-shrink: 0;
}

/* ============ ALERTA / BADGE ============ */
.bounds-limit-alert {
  position: absolute;
  top: 72px;
  left: 50%;
  z-index: 1001;
  width: min(620px, calc(100% - 24px));
  transform: translateX(-50%);
}

.bounds-limit-content,
.location-error-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.location-error-alert {
  position: absolute;
  /* Acima da barra de filtros (bottom 30px + ~48px de altura), sem sobrepor. */
  bottom: 92px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1001;
  max-width: 360px;
  /* Fundo sólido: o tonal translúcido deixava o texto ilegível sobre o mapa. */
  background: rgb(var(--v-theme-surface)) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
  border: 1px solid rgb(var(--v-theme-warning));
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
}

.mark-mode-badge {
  position: absolute;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1001;
  background: rgb(var(--v-theme-warning));
  color: rgb(var(--v-theme-on-warning));
  padding: 8px 20px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 13px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 12px rgba(255, 143, 0, 0.4);
}

/* ============ ANIMAÇÕES ============ */
@keyframes pulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(255, 59, 59, 0.6);
  }
  50% {
    transform: scale(1.1);
    box-shadow: 0 0 14px 5px rgba(255, 59, 59, 0.25);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(255, 59, 59, 0);
  }
}

@keyframes pulsePin {
  0% {
    transform: rotate(-45deg) scale(1);
    box-shadow: -2px 2px 0 0 rgba(255, 59, 59, 0.6);
  }
  50% {
    transform: rotate(-45deg) scale(1.15);
    box-shadow: -4px 4px 10px 4px rgba(255, 59, 59, 0.4);
  }
  100% {
    transform: rotate(-45deg) scale(1);
    box-shadow: -2px 2px 0 0 rgba(255, 59, 59, 0);
  }
}

@keyframes userPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(25, 118, 210, 0.5);
  }
  50% {
    box-shadow: 0 0 20px 10px rgba(25, 118, 210, 0.12);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(25, 118, 210, 0);
  }
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}

/* ============ OVERRIDES ============ */
:deep(.tree-icon-marker),
:deep(.user-icon-marker),
:deep(.mark-icon-marker),
:deep(.tree-cluster-icon) {
  background: none !important;
  border: none !important;
}

:deep(.leaflet-popup-content-wrapper) {
  padding: 0 !important;
  overflow: hidden;
  border-radius: 12px !important;
  background: var(--mt-surface) !important;
  color: var(--mt-forest);
}

:deep(.leaflet-popup-content) {
  margin: 0 !important;
  width: auto !important;
}

:deep(.leaflet-popup-close-button) {
  color: var(--mt-forest) !important;
  font-size: 16px !important;
  padding: 10px 10px 0 0 !important;
}

:deep(.tree-popup .leaflet-popup-close-button) {
  color: #fff !important;
}

:deep(.tree-popup .leaflet-popup-content-wrapper) {
  border-radius: 12px;
  padding: 0;
  overflow: hidden;
}

:deep(.tree-popup .leaflet-popup-content) {
  margin: 20px;
}

:deep(.leaflet-control-zoom) {
  border: none !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
  border-radius: 8px !important;
}
:deep(.leaflet-routing-container) {
  display: none !important;
}
:deep(.leaflet-control-zoom a) {
  border-radius: 0 !important;
}
:deep(.leaflet-control-zoom a:first-child) {
  border-radius: 8px 8px 0 0 !important;
}
:deep(.leaflet-control-zoom a:last-child) {
  border-radius: 0 0 8px 8px !important;
}

/* Responsive */
@media (max-width: 768px) {
  .map-sidebar {
    width: 280px;
    box-shadow: 6px 0 30px rgba(0, 0, 0, 0.2);
    top: 70px;
  }

  .top-search-bar {
    top: 8px;
    width: calc(100% - 70px);
    max-width: none;
    left: 8px;
    transform: none;
  }

  .floating-actions-right {
    top: 130px;
    right: 8px;
  }

  .sidebar-toggle-btn {
    top: 70px;
    left: 8px !important;
  }

  .mark-mode-badge {
    top: auto;
    bottom: 16px;
    font-size: 12px;
    padding: 6px 14px;
  }

  .location-error-alert {
    /* Barra de filtros no mobile fica em bottom 20px; o aviso sobe acima dela. */
    bottom: 78px;
    max-width: calc(100% - 24px);
  }

  .bounds-limit-alert {
    width: calc(100% - 24px);
    top: calc(env(safe-area-inset-top, 0px) + 64px);
  }

  .bounds-limit-content,
  .location-error-content {
    align-items: stretch;
    flex-direction: column;
  }

  .location-error-content .v-btn {
    align-self: flex-start;
  }

  .stats-grid {
    gap: 6px;
  }

  .stat-number {
    font-size: 18px;
  }

  .tree-list-scroll {
    max-height: 180px;
  }
}

@media (max-width: 400px) {
  .map-sidebar {
    width: 240px;
  }

  .sidebar-section {
    padding: 10px 12px;
  }

  .stat-card {
    padding: 8px 4px;
  }
}

/* Sidebar mobile backdrop */
.sidebar-backdrop {
  position: absolute;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.35);
}

/* =====================================================
   ESTILOS DO NOVO MENU LATERAL v2
   Com Abas, Dashboard Flutuante e Mini Mapa
   ===================================================== */

/* ============ DASHBOARD FLUTUANTE ============ */
.floating-dashboard {
  position: absolute;
  top: 78px;
  left: 12px;
  z-index: 1001;
}

.dashboard-card {
  background: var(--mt-surface);
  border-radius: 16px;
  padding: 13px 14px;
  box-shadow: 0 12px 32px rgba(22, 49, 32, 0.2);
  border: 1px solid var(--mt-border);
  min-width: 226px;
}

.mini-stat {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(var(--accent), 0.1);
  border: 1px solid rgba(var(--accent), 0.2);
  cursor: pointer;
  transition: all 0.2s ease;
}

.mini-stat:hover {
  background: rgba(var(--accent), 0.2);
  transform: translateY(-1px);
}

.mini-stat-number {
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
}

/* ============ DASHBOARD STATS ============ */
.stat-btn {
  min-width: 50px;
  height: 28px;
  padding: 0 8px !important;
  text-transform: none;
  letter-spacing: 0;
  border-radius: 6px;
}

/* ============ SIDEBAR COM ABAS ============ */
.map-sidebar--tabs {
  width: 336px;
  max-height: calc(100% - 104px);
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  padding: 18px !important;
  color: #fff;
  background:
    radial-gradient(circle at 95% 0, rgba(197, 225, 31, 0.2), transparent 32%),
    linear-gradient(125deg, #173d2a, #2c6740);
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
}

.sidebar-header .text-grey-darken-1,
.sidebar-header .text-grey-darken-2 {
  color: rgba(255, 255, 255, 0.76) !important;
}

.sidebar-header :deep(.v-icon) {
  color: #d7ed63 !important;
}

.sidebar-tabs {
  background: var(--mt-surface);
}

.sidebar-tabs :deep(.v-tab) {
  text-transform: none;
  min-width: 0;
  min-height: 52px;
  padding: 8px 10px;
  font-weight: 650;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: var(--mt-surface-soft);
  scrollbar-width: thin;
  scrollbar-color: var(--mt-border) transparent;
}

.tab-panel {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ============ CARDS E STATS ============ */
.city-stats-card {
  background: linear-gradient(135deg, var(--mt-surface), var(--mt-surface-soft));
  border-radius: 12px;
  padding: 12px;
  border: 1px solid var(--mt-border);
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.controls-section {
  background: var(--mt-surface);
  border-radius: 12px;
  padding: 12px;
  border: 1px solid var(--mt-border);
}

.follow-control {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.follow-control__text {
  min-width: 0;
}

.follow-control__hint {
  display: block;
  margin-top: 2px;
  color: var(--mt-text-muted);
  font-size: 10px;
  line-height: 1.25;
}

/* ============ FILTROS ============ */
.filter-section {
  background: var(--mt-surface);
  border-radius: 12px;
  padding: 12px;
  border: 1px solid var(--mt-border);
}

.filter-chips-scroll {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* ============ LISTA DE ÁRVORES NOVA ============ */
.tree-list-header {
  padding: 8px 0;
}

.tree-list-scroll-new {
  max-height: 320px;
  overflow-y: auto;
  border-radius: 8px;
  background: var(--mt-surface);
  border: 1px solid var(--mt-border);
}

.tree-list-item-new {
  border-bottom: 1px solid var(--mt-border);
  cursor: pointer;
  transition: background 0.2s ease;
}

.tree-species-icon {
  font-size: 1.15rem;
  line-height: 1;
}

.nest-icon {
  display: inline-block;
  font-size: 1.1rem;
  line-height: 1;
  vertical-align: -0.1em;
}

.tree-list-item-new:hover {
  background: var(--mt-surface-soft);
}

.tree-list-item-new:last-child {
  border-bottom: none;
}

/* ============ CONFIGURAÇÕES ============ */
.config-section {
  background: var(--mt-surface);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid var(--mt-border);
}

.legend-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-dot-new {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-line-new {
  width: 16px;
  height: 2px;
  background: #ff3b3b;
  flex-shrink: 0;
}

.soil-legend-compact {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin-top: 8px;
}

.species-symbol {
  margin-right: 0.6rem;
}
.species-count-list {
  max-height: 11rem;
  overflow-y: auto;
}
.inventory-panel .config-section:first-child {
  border-top: 3px solid #247052;
}
.density-heat-legend {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #647067;
  font-size: 10px;
}

.density-heat-gradient {
  flex: 1;
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(90deg, #39a96b, #e5c93e, #db4242);
}

.soil-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.soil-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ============ RESPONSIVO PARA NOVO MENU ============ */
@media (max-width: 768px) {
  .floating-dashboard {
    top: 68px;
    left: 8px;
  }

  .dashboard-card {
    min-width: 160px;
    padding: 8px 10px;
  }

  .stat-btn {
    min-width: 44px;
    height: 26px;
    padding: 0 6px !important;
  }

  .map-sidebar--tabs {
    width: auto;
    max-width: 420px;
    max-height: calc(100% - 142px);
    left: 8px;
    right: 8px;
    top: 70px;
    bottom: 72px;
    position: fixed;
  }

  .sidebar-backdrop {
    display: block !important;
  }

  .sidebar-content {
    padding: 12px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    max-height: none;
    min-height: 0;
    flex: 1 1 auto;
  }

  .map-sidebar--tabs {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  .ai-drawer {
    width: 100vw !important;
    height: 100dvh !important;
  }

  .ai-drawer-body {
    height: auto;
    min-height: 0;
    flex: 1 1 auto;
    padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  }

  .tree-list-scroll-new {
    max-height: 200px;
  }
}

@media (max-width: 400px) {
  .map-sidebar--tabs {
    width: calc(100% - 16px);
  }

  .mini-stat-number {
    font-size: 11px;
  }
}

/* ============ AI DRAWER ============ */
.ai-drawer {
  width: min(480px, 100vw) !important;
  max-width: 100vw !important;
  z-index: 2001 !important;
  background: var(--mt-surface) !important;
  color: var(--mt-ink);
}

.ai-drawer :deep(.v-navigation-drawer__content) {
  display: flex;
  min-height: 0;
  flex-direction: column;
}

.location-review-card {
  display: flex;
  max-height: min(760px, calc(100dvh - 24px));
  flex-direction: column;
  overflow: hidden;
  background: var(--mt-surface) !important;
  color: var(--mt-ink);
}

.location-review-content {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.location-review-actions {
  position: sticky;
  bottom: 0;
  flex: 0 0 auto;
  border-top: 1px solid var(--mt-border);
  background: var(--mt-surface);
  padding-bottom: max(16px, env(safe-area-inset-bottom, 0px));
}

.ai-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  color: rgb(var(--v-theme-on-surface));
  background: rgb(var(--v-theme-surface));
}

.ai-drawer-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--mt-green), var(--mt-forest));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ai-drawer-title {
  font-size: 15px;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
  line-height: 1.2;
  margin: 0;
}

.ai-drawer-subtitle {
  font-size: 12px;
  color: var(--mt-text-muted);
  margin-top: 2px;
}

.ai-drawer-body {
  padding: 16px;
  overflow-y: auto;
  height: auto;
  min-height: 0;
  flex: 1 1 auto;
}

.ai-drawer-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
}

.ai-drawer-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
}
/* ===================================
   ESTILOS PREMIUM - SOLO
=================================== */

:deep(.soil-hex-marker) {
  position: relative;
  width: 22px;
  height: 22px;
  background: var(--marker-color);
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  z-index: 2;
}

:deep(.soil-hex-inner) {
  width: 12px;
  height: 12px;
  background: white;
  opacity: 0.3;
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
}

:deep(.soil-hex-pulse) {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--marker-color);
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  opacity: 0.4;
  z-index: -1;
  animation: soilPulse 2s infinite;
}

@keyframes soilPulse {
  0% {
    transform: scale(1);
    opacity: 0.4;
  }
  100% {
    transform: scale(2.5);
    opacity: 0;
  }
}

:deep(.soil-glass-popup) .leaflet-popup-content-wrapper {
  background: color-mix(in srgb, var(--mt-surface) 95%, transparent);
  color: var(--mt-ink);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 0;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
}

:deep(.soil-glass-popup) .leaflet-popup-content {
  margin: 0;
}

:deep(.soil-intelligence-card) {
  padding: 0;
  font-family: 'Outfit', sans-serif;
}

:deep(.soil-card-header) {
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

:deep(.species-tag) {
  font-weight: 800;
  font-size: 14px;
  color: var(--mt-ink);
}

:deep(.quality-badge) {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
  text-transform: uppercase;
}

:deep(.soil-card-body) {
  padding: 16px;
}

:deep(.growth-prediction) {
  background: var(--mt-surface-soft);
  padding: 10px;
  border-radius: 10px;
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
}

:deep(.prediction-label) {
  font-size: 10px;
  font-weight: 600;
  color: var(--mt-text-muted);
  text-transform: uppercase;
}

:deep(.prediction-value) {
  font-size: 14px;
  font-weight: 800;
  margin-top: 2px;
}

:deep(.soil-definition) {
  font-size: 12px;
  color: var(--mt-text-muted);
  line-height: 1.5;
  margin-bottom: 16px;
}

:deep(.metrics-grid) {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

:deep(.metric-item) {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

:deep(.metric-header) {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 700;
  color: var(--mt-ink);
}

:deep(.metric-bar) {
  height: 6px;
  background: var(--mt-border);
  border-radius: 3px;
  overflow: hidden;
}

:deep(.bar-fill) {
  height: 100%;
  border-radius: 3px;
  transition: width 1s ease-out;
}

:deep(.footer-metrics) {
  display: flex;
  border-top: 1px solid var(--mt-border);
  padding-top: 12px;
  gap: 16px;
}

:deep(.footer-item) {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  color: var(--mt-text-muted);
}

:deep(.leaflet-popup-tip) {
  background: var(--mt-surface);
}

:deep(.leaflet-popup-content-wrapper) {
  background: var(--mt-surface);
  color: var(--mt-ink);
}

:deep(.leaflet-popup-content) {
  color: var(--mt-ink);
}

:deep(.tree-popup button:focus-visible) {
  outline: 3px solid var(--mt-focus);
  outline-offset: 2px;
}
</style>
