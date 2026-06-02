<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref, computed, nextTick, watch } from 'vue'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { apiConnect, type TreeWithAi } from '@/plugins/apiConnect'
import TreeAiStats from '@/components/functions/TreeAiStats.vue'
import { SOIL_TYPES, getSoilInfo } from '@/utils/soilData'
import 'leaflet-routing-machine'
import {
  CEARA_REGIONS,
  loadRegionData,
  findRegionAtLocation,
  getVisibleTiles,
  loadTileData,
  getTileKey,
  type Region
} from '@/utils/regionPipeline'
import {
  renderSoilLayer,
  SOIL_RENDER_PRESETS,
  type SoilRenderMode
} from '@/utils/soilRenderers'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'

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
      - drawPowerLines(): Desenha rede elétrica
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

interface ApiTree {
  id: string
  age: string
  latitude: number
  longitude: number
  status: string
  species?: {
    id: string
    commonName: string
    scientificName: string
    family: string
    description: string
  }
  solo?: Array<{
    quality: string
  }>
  vigor: string
}

interface TreeOnMap {
  id: string
  latitude: number
  longitude: number
  status: string
  speciesName: string
  scientificName: string
  family: string
  nearPowerLine: boolean
  soilQuality?: string
  vigor: string
  currentHeight?: number
  wireHeight?: number
}

interface MarkedLocation {
  id: string
  lat: number
  lng: number
  notes: string
  timestamp: Date
  marker?: L.Marker
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

const POWER_LINE_DISTANCE_METERS = 15
const DEFAULT_LAT = -3.7319
const DEFAULT_LNG = -38.5267
const DEFAULT_ZOOM = 15

interface StatusInfo {
  label: string
  emoji: string
  color: string
  bg: string
  border: string
}

const STATUS_CONFIG: { [key: string]: StatusInfo } = {
  NORMAL:            { label: 'Normal',         emoji: '🌳', color: '#2E7D32', bg: '#2E7D32', border: '#1B5E20' },
  TO_PRUNE:          { label: 'Para Podar',     emoji: '✂️', color: '#EF6C00', bg: '#EF6C00', border: '#E65100' },
  UNDER_OBSERVATION: { label: 'Observação',     emoji: '👁️', color: '#F9A825', bg: '#F9A825', border: '#F57F17' },
  PRUNED:            { label: 'Podada',         emoji: '🌿', color: '#4CAF50', bg: '#4CAF50', border: '#388E3C' },
  DANGER:            { label: 'Risco Fiação',   emoji: '⚠️', color: '#D32F2F', bg: '#D32F2F', border: '#B71C1C' },
  CRITICAL:          { label: 'CRÍTICO',        emoji: '🚨', color: '#D32F2F', bg: '#D32F2F', border: '#B71C1C' },
}

const DEFAULT_STATUS: StatusInfo = { label: 'Normal', emoji: '🌳', color: '#4CAF50', bg: '#4CAF50', border: '#2E7D32' }

function getStatusCfg(status: string, danger: boolean): StatusInfo {
  const s = String(status).toUpperCase()
  
  // SE ESTIVER EM PERIGO (por altura ou fiação), forçamos CRÍTICO (Vermelho)
  if (danger || s === 'CRITICAL' || s === 'DANGER') {
    return STATUS_CONFIG['CRITICAL'] || STATUS_CONFIG['DANGER'] || DEFAULT_STATUS
  }
  
  // SE FOR PARA PODAR, retorna o status laranja/amarelo correto (TO_PRUNE)
  if (s === 'TO_PRUNE') {
    return STATUS_CONFIG['TO_PRUNE'] || DEFAULT_STATUS
  }
  
  // Caso contrário, respeita o status (incluindo TO_PRUNE em amarelo/laranja)
  return STATUS_CONFIG[s] || DEFAULT_STATUS
}

const SIMULATED_POWER_LINES: [number, number][][] = [
  [[-3.7327, -38.5270], [-3.7335, -38.5255], [-3.7342, -38.5240], [-3.7350, -38.5225]],
  [[-3.7310, -38.5280], [-3.7320, -38.5260], [-3.7330, -38.5245]],
]

/* ===================================
   COMPONENTE
=================================== */

export default defineComponent({
  name: 'PruningMap',
  components: { TreeAiStats },

  setup() {
    /* ---------- Map refs ---------- */
    let map: L.Map | null = null
    let treeClusterGroup: L.MarkerClusterGroup | null = null
    let userMarker: L.Marker | null = null
    let userAccuracyCircle: L.Circle | null = null
    let markedMarkersLayer: L.LayerGroup | null = null
    let powerLinesLayer: L.LayerGroup | null = null
    let locationWatchId: number | null = null
    let refreshInterval: ReturnType<typeof setInterval> | null = null
    let streetLayer: L.TileLayer | null = null
    let satelliteLayer: L.TileLayer | null = null
    let routingControl: any = null

    /* ---------- Estado Reativo ---------- */
    const trees = ref<TreeOnMap[]>([])
    const markedLocations = ref<MarkedLocation[]>([])
    const markMode = ref(false)
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
    const activeFilter = ref<string>('ALL')
    const mapStyle = ref<'street' | 'satellite'>('street')
    const snackbar = ref(false)
    const snackbarText = ref('')
    const snackbarColor = ref('success')
    const selectedTree = ref<TreeOnMap | null>(null)
    const isRouting = ref(false)
    const isSimulationMode = ref(false)
    const loadingRoute = ref(false)
    const currentRouteDest = ref<{ lat: number; lng: number } | null>(null)
    const showPowerLines = ref(true)
    let lastPosition: L.LatLng | null = null

    /* ---------- Carregamento Progressivo ---------- */
    const loadRadius = ref(2) // Raio inicial em km
    const maxRadius = ref(50) // Raio máximo em km
    const totalTreesInArea = ref(0) // Total de árvores disponíveis na API
    const hasMoreTrees = ref(false) // Se há mais árvores para carregar
    const loadMode = ref<'radius' | 'bounds' | 'region' | 'tile'>('radius') // Modo de carregamento
    const autoLoadOnZoom = ref(true) // Carregar automaticamente ao ampliar o mapa
    const followUserPosition = ref(false) // Se true, mapa segue o usuário automaticamente
    const userHasMovedMap = ref(false) // Detecta se usuário navegou manualmente no mapa
    const loadedTreeIds = new Set<string>() // Cache para evitar duplicatas
    const blockingMapLoading = computed(() => isInitialMapLoading.value || loadingRoute.value)

    /* ---------- Sistema de Regiões ---------- */
    const availableRegions = ref<Region[]>(CEARA_REGIONS)
    const selectedRegion = ref<Region | null>(null)
    const regionTrees = ref<Map<string, any[]>>(new Map()) // Cache por região
    const tileCache = ref<Map<string, any[]>>(new Map()) // Cache por tile
    const loadingRegion = ref(false)
    const cityStats = ref<{ total: number; withRisk: number; byStatus: Record<string, number> } | null>(null)
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
          availableRegions.value = res.data.map(r => ({
            id: r.slug,
            name: r.name,
            type: r.type as 'city' | 'district' | 'state' | 'quadrant',
            bounds: {
              north: r.north,
              south: r.south,
              east: r.east,
              west: r.west
            },
            center: {
              lat: (r.north + r.south) / 2,
              lng: (r.east + r.west) / 2
            },
            loaded: false
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
    const activeTab = ref<'carregar' | 'arvores' | 'config'>('carregar')

    /* ---------- IA Drawer ---------- */
    const aiDrawerOpen = ref(false)
    const aiTreeData = ref<TreeWithAi | null>(null)
    const loadingAiData = ref(false)

    /* ---------- Computed ---------- */
    const filteredTrees = computed(() => {
      if (activeFilter.value === 'ALL') return trees.value
      if (activeFilter.value === 'CRITICAL') {
        return trees.value.filter(t => t.nearPowerLine || t.status === 'CRITICAL' || t.status === 'TO_PRUNE')
      }
      return trees.value.filter(t => t.status === activeFilter.value)
    })

    const treeCount = computed(() => trees.value.length)
    const dangerCount = computed(() => trees.value.filter(t => t.nearPowerLine).length)
    const criticalCount = computed(() => trees.value.filter(t => t.nearPowerLine || t.status === 'CRITICAL' || t.status === 'TO_PRUNE').length)
    const markedCount = computed(() => markedLocations.value.length)
    const statusCounts = computed(() => {
      const counts: Record<string, number> = { NORMAL: 0, TO_PRUNE: 0, UNDER_OBSERVATION: 0, PRUNED: 0, CRITICAL: 0 }
      trees.value.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1 })
      return counts
    })

    // Refs reativas para bounds do mapa (para tornar visibleTreeCount reativo)
    const mapBounds = ref<L.LatLngBounds | null>(null)
    const mapZoom = ref<number>(DEFAULT_ZOOM)

    // Contador de árvores visíveis na tela (bounds atual do mapa) - AGORA REATIVO
    const visibleTreeCount = computed(() => {
      if (!map || !mapBounds.value) return trees.value.length
      const bounds = mapBounds.value
      return trees.value.filter(t => {
        return bounds.contains([t.latitude, t.longitude])
      }).length
    })

    /* ---------- Notificação ---------- */
    const notify = (text: string, color = 'success') => {
      snackbarText.value = text
      snackbarColor.value = color
      snackbar.value = true
    }

    /* ---------- Ícones ---------- */
    const createTreeIcon = (status: string, danger: boolean): L.DivIcon => {
      const cfg = getStatusCfg(status, danger)
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
          ${danger ? 'animation:pulsePin 1.2s infinite;' : ''}
        " onmouseover="this.style.transform='rotate(-45deg) scale(1.15)'" onmouseout="this.style.transform='rotate(-45deg) scale(1)'">
          <span style="transform: rotate(45deg); font-size: 18px; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));">${cfg.emoji}</span>
        </div>`,
        iconSize: [38, 38],
        iconAnchor: [19, 38],
        popupAnchor: [0, -38],
        className: 'tree-icon-marker',
      })
    }

    const createUserIcon = (): L.DivIcon => L.divIcon({
      html: `<div style="
        background:linear-gradient(135deg,#1565C0,#42A5F5);border:3px solid #fff;border-radius:50%;
        width:100%;height:100%;display:flex;align-items:center;justify-content:center;
        font-size:16px;box-shadow:0 0 16px rgba(25,118,210,0.5);animation:userPulse 2s infinite;
      ">📍</div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      className: 'user-icon-marker',
    })

    const createMarkIcon = (): L.DivIcon => L.divIcon({
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

    /* ---------- Geometria ---------- */
    const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
      const R = 6371000
      const toRad = (v: number) => (v * Math.PI) / 180
      const dLat = toRad(lat2 - lat1)
      const dLng = toRad(lng2 - lng1)
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    }

    const distancePointToSegment = (pLat: number, pLng: number, aLat: number, aLng: number, bLat: number, bLng: number): number => {
      const dx = bLng - aLng
      const dy = bLat - aLat
      if (dx === 0 && dy === 0) return haversineDistance(pLat, pLng, aLat, aLng)
      const t = Math.max(0, Math.min(1, ((pLng - aLng) * dx + (pLat - aLat) * dy) / (dx * dx + dy * dy)))
      return haversineDistance(pLat, pLng, aLat + t * dy, aLng + t * dx)
    }

    const checkNearPowerLine = (lat: number, lng: number): boolean => {
      for (const line of SIMULATED_POWER_LINES) {
        for (let i = 0; i < line.length - 1; i++) {
          const segA = line[i]!
          const segB = line[i + 1]!
          if (distancePointToSegment(lat, lng, segA[0], segA[1], segB[0], segB[1]) < 25) return true
        }
      }
      return false
    }

    /* ---------- API ---------- */

    /**
     * Converte dados da API para o formato TreeOnMap
     */
    const parseTreeData = (t: any): TreeOnMap | null => {
      const lat = Number(t.lat ?? t.latitude ?? 0)
      const lng = Number(t.lng ?? t.longitude ?? 0)
      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return null

      const curH = Number(t.currentHeight || t.estimatedHeight || t.estimated_height_m || t.aiPrediction?.estimated_height_m || 0)
      const wireH = Number(t.wireHeight || t.wire_height_m || t.aiPrediction?.wire_height_m || 6.5)
      const treeStatus = t.status || 'NORMAL'
      const isDanger = checkNearPowerLine(lat, lng) || (wireH > 0 && curH / wireH >= 0.9)

      // Extrair dados de solo se disponíveis
      const soilQuality = t.soil?.quality || t.soilQuality || 'UNKNOWN'
      const vigor = t.vigor || t.soil?.vigor || 'GOOD'

      return {
        id: t.id,
        latitude: lat,
        longitude: lng,
        status: treeStatus,
        speciesName: t.species?.commonName || 'Árvore #' + t.id.slice(-4),
        scientificName: t.species?.scientificName || '',
        family: t.species?.family || '',
        nearPowerLine: isDanger,
        soilQuality: soilQuality,
        vigor: vigor,
        currentHeight: curH,
        wireHeight: wireH
      }
    }

    /**
     * Carrega árvores próximas ao usuário com raio progressivo
     * Inicia com 2km e permite expandir até o máximo definido
     */
    const fetchTreesNearby = async (reset = false, silent = false) => {
      console.log('[PruningMap] fetchTreesNearby chamado. userLat:', userLat.value, 'userLng:', userLng.value)
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
        const res = await apiConnect.getTreesNearby(userLat.value, userLng.value, loadRadius.value, limit)

        const newTrees: TreeOnMap[] = []
        let duplicates = 0

        ;(res.data || []).forEach((t: any) => {
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

        console.log(`Raio ${loadRadius.value}km: ${newTrees.length} novas, ${duplicates} duplicatas, total: ${trees.value.length}`)
        if (!silent) notify(`${trees.value.length} árvore(s) próximas carregada(s)`, 'success')

        // Centraliza no usuário na primeira carga
        if (reset && map && trees.value.length > 0) {
          map.setView([userLat.value, userLng.value], 15)
        }
      } catch (err: any) {
        console.error('Erro ao buscar árvores próximas:', err)
        const status = err.response?.status
        if (status === 500 || status === 404) {
          console.log('[PruningMap] API /trees/nearby indisponível, usando fallback /trees')
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

    /**
     * Carrega árvores da área visível no mapa (bounds)
     * Útil quando usuário navega para outra região
     */
    const fetchTreesInBounds = async (silent = false) => {
      if (!map) return

      const bounds = map.getBounds()
      const north = bounds.getNorth()
      const south = bounds.getSouth()
      const east = bounds.getEast()
      const west = bounds.getWest()

      loadingTrees.value = true
      try {
        const res = await apiConnect.getTreesInBounds(north, south, east, west, 500)

        const newTrees: TreeOnMap[] = []
        ;(res.data || []).forEach((t: any) => {
          if (!loadedTreeIds.has(t.id)) {
            const parsed = parseTreeData(t)
            if (parsed) {
              loadedTreeIds.add(t.id)
              newTrees.push(parsed)
            }
          }
        })

        trees.value = [...trees.value, ...newTrees]
        if (!silent) notify(`${newTrees.length} árvore(s) da área visível carregada(s)`, 'success')
      } catch (err) {
        console.error('Erro ao buscar árvores na área:', err)
      } finally {
        loadingTrees.value = false
      }
    }

    /**
     * Fallback: endpoint tradicional quando não há geolocalização
     */
    const fetchTreesLegacy = async (silent = false) => {
      console.log('[PruningMap] fetchTreesLegacy() - chamando /trees')
      loadingTrees.value = true
      try {
        const res = await apiConnect.get<any[]>('/trees')
        console.log('[PruningMap] /trees resposta:', res.data?.length || 0, 'árvores brutas')
        const rawTrees = res.data || []
        const withCoords = rawTrees.filter((t: any) => (t.latitude != null || t.lat != null) && (t.longitude != null || t.lng != null))
        console.log('[PruningMap] Árvores com coordenadas:', withCoords.length)
        trees.value = withCoords
          .map((t: any) => parseTreeData(t))
          .filter((t): t is TreeOnMap => t !== null)
        console.log('[PruningMap] Árvores parseadas válidas:', trees.value.length)

        if (!silent) notify(`${trees.value.length} árvore(s) carregada(s)`, 'success')

        if (map && trees.value.length > 0 && isInitialLoad.value) {
          const bounds = L.latLngBounds(trees.value.map(t => [t.latitude, t.longitude]))
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
          isInitialLoad.value = false
        }
      } catch (err: any) {
        console.error('[PruningMap] Erro ao buscar árvores no fallback:', err)
        // Último recurso: dados mockados para demonstração
        console.log('[PruningMap] Gerando árvores mockadas para demonstração...')
        trees.value = getMockTrees()
        console.log('[PruningMap] Árvores mockadas geradas:', trees.value.length)
        if (!silent) notify(`Modo offline: ${trees.value.length} árvores de demonstração carregadas`, 'warning')
        if (map && trees.value.length > 0) {
          const bounds = L.latLngBounds(trees.value.map(t => [t.latitude, t.longitude]))
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
      const statuses: Array<TreeOnMap['status']> = ['NORMAL', 'TO_PRUNE', 'UNDER_OBSERVATION', 'PRUNED', 'CRITICAL']
      const species = ['Mangueira', 'Ipê Amarelo', 'Flamboyant', 'Cajueiro', 'Coconut Palm', 'Acacia']
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
          nearPowerLine: Math.random() > 0.8,
          vigor: ['EXCELLENT', 'GOOD', 'POOR'][Math.floor(Math.random() * 3)] ?? 'GOOD',
          currentHeight: 5 + Math.random() * 10,
          wireHeight: 8 + Math.random() * 5
        })
      }
      return mockTrees
    }

    // Alias para compatibilidade com código existente
    const fetchTrees = fetchTreesNearby

    /* ---------- Carregamento por Região ---------- */
    const fetchTreesByRegion = async (region: Region, reset = true) => {
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
          const newTrees = cached.filter(t => !loadedTreeIds.has(t.id))
          newTrees.forEach(t => loadedTreeIds.add(t.id))
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
            .map((t: any) => parseTreeData(t))
            .filter((t): t is TreeOnMap => t !== null)
        } catch {
          // Fallback: usa bounds se endpoint de cidade não existir ou falhar
          const res = await apiConnect.getTreesInBounds(
            region.bounds.north,
            region.bounds.south,
            region.bounds.east,
            region.bounds.west,
            10000
          )
          regionTreeList = (res.data || [])
            .map((t: any) => parseTreeData(t))
            .filter((t): t is TreeOnMap => t !== null)
        }

        // Armazena em cache
        regionTrees.value.set(region.id, regionTreeList)

        // Adiciona à lista global
        regionTreeList.forEach(t => {
          if (!loadedTreeIds.has(t.id)) {
            loadedTreeIds.add(t.id)
            trees.value.push(t)
          }
        })

        notify(`${regionTreeList.length} árvores carregadas de ${region.name}`, 'success')

        // Centraliza no mapa
        if (map) {
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
        regionObj = availableRegions.value.find(r => r.id === region) || null
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
      await Promise.all([
        loadCityStats(region),
        fetchTreesByRegion(region, true)
      ])
    }

    /* ---------- Carregamento por Tiles (Dinâmico) ---------- */
    let isLoadingTiles = false
    const loadVisibleTiles = async (silent = false) => {
      if (!map || isLoadingTiles) return false

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

      const visibleTiles = getVisibleTiles({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      }, Math.min(zoom, 16)) // Limita zoom para tiles

      isLoadingTiles = true
      loadingTrees.value = true
      let newTreesCount = 0

      for (const tileCoord of visibleTiles.slice(0, 20)) { // Máximo 20 tiles por vez (aumentado para grandes volumes)
        const tileKey = getTileKey(tileCoord)

        // Pula se já está em cache
        if (tileCache.value.has(tileKey)) continue

        const tileData = await loadTileData(tileCoord)
        if (!tileData || !tileData.trees) continue

        // Processa árvores do tile
        const tileTrees = tileData.trees
          .map((t: any) => parseTreeData(t))
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
  } catch (err: any) {
    console.error('[PruningMap] Erro ao carregar solo:', err)
    // Se 401, 403 ou qualquer erro, usar dados mockados
    const status = err.response?.status
    if (status === 401) {
      notify('Sessão expirada ou sem autorização. Usando dados de demonstração.', 'warning')
    } else if (status === 403) {
      notify('Sem permissão para acessar dados de solo (apenas Admin/Gestor). Usando dados de demonstração.', 'warning')
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
    const points = soilPoints.value.map(p => ({
      lat: p.lat,
      lng: p.lng,
      soilType: p.soilType,
      soilQuality: p.soilQuality
    }))

    // Usa o novo sistema de renderização
    renderSoilLayer(map, soilLayer, points, soilRenderMode.value, {
      opacity: 0.2,
      interactive: true,
      showLabels: true
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
    console.log('[PruningMap] Novo estado:', showSoilLayer.value, 'soilPoints:', soilPoints.value.length)

    if (showSoilLayer.value && soilPoints.value.length === 0) {
      console.log('[PruningMap] Carregando dados de solo...')
      await fetchSoilData()
      console.log('[PruningMap] Dados carregados. Total:', soilPoints.value.length)
    }

    renderSoilLayerLocal()
    notify(showSoilLayer.value ? 'Camada de solo ativada' : 'Camada de solo oculta', 'info')
  }

    /* ---------- Roteirização ---------- */
    const stopRouting = () => {
      if (routingControl && map) {
        map.removeControl(routingControl)
        routingControl = null
      }
      isRouting.value = false
      currentRouteDest.value = null
      notify('Rota finalizada', 'info')
    }

    const startRouting = async (destLat: number, destLng: number, destName: string) => {
      if (!userLat.value || !userLng.value) {
        notify('Sua localização ainda não foi encontrada!', 'warning')
        await goToUserLocation()
        return
      }

      if (!map) return

      // Limpar rota anterior se houver
      if (routingControl) {
        map.removeControl(routingControl)
      }

      // @ts-ignore - Leaflet Routing Machine extends L
      routingControl = L.Routing.control({
        waypoints: [
          L.latLng(userLat.value, userLng.value),
          L.latLng(destLat, destLng)
        ],
        // @ts-ignore
        lineOptions: {
          styles: [
            { color: '#000', opacity: 0.1, weight: 10 }, // Shadow
            { color: '#007bff', opacity: 0.85, weight: 6 } // Main line
          ]
        },
        addWaypoints: false,
        draggableWaypoints: false,
        priority: 1,
        fitSelectedRoutes: true,
        showAlternatives: false,
        // @ts-ignore
        show: false, // Esconde o painel de instruções branco
        // @ts-ignore
        createMarker: () => null // Não criar marcadores extras, já temos os nossos
      }).addTo(map)

      currentRouteDest.value = { lat: destLat, lng: destLng }
      loadingRoute.value = true
      isRouting.value = true

      // @ts-ignore
      routingControl.on('routesfound', () => {
        loadingRoute.value = false
        notify(`Rota calculada com sucesso para: ${destName}`, 'success')
      })

      // @ts-ignore
      routingControl.on('routingerror', (e: any) => {
        loadingRoute.value = false
        isRouting.value = false
        console.error('Routing error:', e)
        notify('Não foi possível calcular a rota. Servidor OSRM ocupado ou inacessível.', 'error')
      })
      
      // Fechar popups abertos
      if (map) map.closePopup()
    }

    const toggleSimulationMode = () => {
      isSimulationMode.value = !isSimulationMode.value
      if (isSimulationMode.value) {
        notify('Modo Simulação Ativo: Clique em qualquer lugar do mapa para definir sua posição.', 'info')
      } else {
        notify('Modo Simulação Desativado.', 'info')
      }
    }

    /* ---------- Renderização ---------- */
    const renderTrees = () => {
      console.log('[PruningMap] renderTrees() - treeClusterGroup:', !!treeClusterGroup, 'filteredTrees:', filteredTrees.value.length)
      if (!treeClusterGroup) {
        console.error('[PruningMap] treeClusterGroup não existe!')
        return
      }
      treeClusterGroup.clearLayers()

      if (filteredTrees.value.length === 0) {
        console.warn('[PruningMap] Nenhuma árvore para renderizar')
        return
      }

      const markersArray: L.Marker[] = []
      filteredTrees.value.forEach((t) => {
        if (isNaN(t.latitude) || isNaN(t.longitude)) return
        const icon = createTreeIcon(t.status, t.nearPowerLine)
        const marker = L.marker([t.latitude, t.longitude], { icon })
        const cfg = getStatusCfg(t.status, t.nearPowerLine)

        marker.bindPopup(`
          <div style="width:240px; font-family:sans-serif; background:#fff; border-radius:12px; overflow:hidden;">
            <div style="background:${cfg.bg}; color:#fff; padding:14px; text-align:center;">
              <div style="font-size:17px; font-weight:800;">${cfg.emoji} ${t.speciesName}</div>
              <div style="font-size:11px; opacity:0.8; margin-top:2px;">${t.scientificName}</div>
            </div>
            <div style="padding:16px;">
              <div style="display:flex; justify-content:space-between; margin-bottom:12px; border-bottom:1px solid #eee; padding-bottom:8px;">
                <div style="flex:1;">
                  <h3 style="margin:0; font-size:18px; color:#333;">${t.speciesName}</h3>
                  <p style="margin:0; font-size:12px; color:#666; font-style:italic;">${t.scientificName}</p>
                  <p style="margin:4px 0 0; font-size:10px; color:${t.vigor === 'EXCELLENT' ? '#22c55e' : t.vigor === 'GOOD' ? '#84cc16' : t.vigor === 'POOR' ? '#f59e0b' : '#ef4444'}; font-weight:800; border:1px solid currentColor; display:inline-block; padding:0 6px; border-radius:4px;">
                    HEALTH: ${t.vigor}
                  </p>
                </div>
                <div style="text-align:right;">
                  <p style="margin:0; font-size:10px; color:#999; font-weight:700;">FIAÇÃO</p>
                  <p style="margin:0; font-size:12px; font-weight:700; color:${t.nearPowerLine ? '#E53935' : '#43A047'}">${t.nearPowerLine ? '⚠ RISCO' : '✓ SEGURO'}</p>
                </div>
              </div>

              <!-- Novo Bloco de Solo Unificado -->
              <div style="
                background: ${getSoilInfo(t.soilQuality || 'UNKNOWN').color}15;
                border: 1px solid ${getSoilInfo(t.soilQuality || 'UNKNOWN').color}33;
                border-radius: 8px;
                padding: 10px;
                margin-bottom: 16px;
                display: flex;
                align-items: center;
                gap: 10px;
              ">
                <div style="font-size: 20px;">🌱</div>
                <div>
                  <p style="margin: 0; font-size: 10px; color: #666; font-weight: 700; text-transform: uppercase;">Inteligência de Solo</p>
                  <p style="margin: 0; font-size: 12px; font-weight: 700; color: ${getSoilInfo(t.soilQuality || 'UNKNOWN').color};">
                    ${getSoilInfo(t.soilQuality || 'UNKNOWN').name}
                  </p>
                  <p style="margin: 2px 0 0; font-size: 10px; color: #7f8c8d; line-height: 1.2;">
                    ${getSoilInfo(t.soilQuality || 'UNKNOWN').description}
                  </p>
                </div>
              </div>

              <p style="margin:0; font-size:11px; color:#888; text-align:center;">Coordenadas: ${t.latitude.toFixed(5)}, ${t.longitude.toFixed(5)}</p>
              <div style="display:flex; gap:8px; margin-top:16px;">
                <button id="btn-route-${t.id}" style="
                  flex:1; background:#007bff; color:#fff; border:none; 
                  padding:10px; border-radius:8px; cursor:pointer; font-weight:700;
                  font-size:12px; text-transform:uppercase;
                  box-shadow: 0 4px 12px rgba(0,123,255,0.3); transition: transform 0.2s;
                " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                  🚀 ROTA
                </button>
                <button id="btn-ai-${t.id}" style="
                  flex:1; background:linear-gradient(135deg,#7B1FA2,#AB47BC); color:#fff; border:none;
                  padding:10px; border-radius:8px; cursor:pointer; font-weight:700;
                  font-size:12px; text-transform:uppercase;
                  box-shadow: 0 4px 12px rgba(123,31,162,0.3); transition: transform 0.2s;
                " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                  🧠 VER IA
                </button>
              </div>
            </div>
          </div>
        `, { maxWidth: 280, className: 'tree-popup' })

        marker.on('popupopen', () => {
          const btnRoute = document.getElementById(`btn-route-${t.id}`)
          if (btnRoute) {
            btnRoute.onclick = () => startRouting(t.latitude, t.longitude, t.speciesName)
          }
          const btnAi = document.getElementById(`btn-ai-${t.id}`)
          if (btnAi) {
            btnAi.onclick = () => openAiDrawer(t)
          }
        })

        marker.on('click', () => { selectedTree.value = t })
        markersArray.push(marker)
      })
      treeClusterGroup!.addLayers(markersArray)
    }

    const drawPowerLines = () => {
      if (!powerLinesLayer) return
      powerLinesLayer.clearLayers()
      if (!showPowerLines.value) return

      SIMULATED_POWER_LINES.forEach((line) => {
        const polyline = L.polyline(line, { color: '#E53935', weight: 4, dashArray: '10, 8', opacity: 0.85 })
        polyline.bindPopup('<div style="text-align:center;font-weight:600;">⚡ Rede Elétrica<br><span style="font-size:11px;color:#888;">(simulada)</span></div>')
        powerLinesLayer!.addLayer(polyline)
      })
    }

    const togglePowerLines = () => {
      showPowerLines.value = !showPowerLines.value
      drawPowerLines()
      notify(showPowerLines.value ? 'Rede elétrica visível' : 'Rede elétrica oculta', 'info')
    }

    /* ---------- Geolocalização ---------- */
    /**
     * Obtém a posição do usuário.
     * Se followUserPosition=true, move o mapa para a posição.
     * Se false, apenas atualiza o marcador sem mover o mapa.
     */
    const goToUserLocation = (): Promise<boolean> => {
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
              const shouldMoveMap = followUserPosition.value || trees.value.length === 0

              if (shouldMoveMap) {
                map.flyTo([latitude, longitude], 17, { duration: 1.5 })
              }

              if (userMarker) {
                userMarker.setLatLng([latitude, longitude])
              } else {
                userMarker = L.marker([latitude, longitude], { icon: createUserIcon(), zIndexOffset: 1000 })
                  .addTo(map)
                  .bindPopup('<div style="text-align:center;font-weight:600;">📍 Você está aqui</div>')
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
            
            // Fallback: Se falhar a localização, centraliza na primeira árvore
            if (map?.getPane?.('mapPane') && trees.value.length > 0 && trees.value[0]) {
              const first = trees.value[0]
              map.flyTo([first.latitude, first.longitude], 15)
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
          const { latitude, longitude, accuracy } = pos.coords
          userLat.value = latitude
          userLng.value = longitude
          if (userMarker) userMarker.setLatLng([latitude, longitude])
          if (userAccuracyCircle) userAccuracyCircle.setLatLng([latitude, longitude]).setRadius(accuracy)

          if (followUserPosition.value && map) {
            map.panTo([latitude, longitude], { animate: true, duration: 0.5 })
          }

          // Otimização: Só atualiza roteamento se moveu mais de 10 metros
          const currentPos = L.latLng(latitude, longitude)
          if (isRouting.value && routingControl && currentRouteDest.value) {
            const dist = lastPosition ? currentPos.distanceTo(lastPosition) : 999
            if (dist > 10) {
              routingControl.setWaypoints([
                currentPos,
                // @ts-ignore
                L.latLng(currentRouteDest.value.lat, currentRouteDest.value.lng)
              ])
              lastPosition = currentPos
            }
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
        const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&countrycodes=br&limit=1`, {
          headers: { 'Accept-Language': 'pt-BR' },
        })
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
      markMode.value = !markMode.value
      notify(markMode.value ? '📌 Modo marcação ativado — clique no mapa' : '📌 Modo marcação desativado', 'info')
    }

    const removeMarkedLocation = (id: string) => {
      const loc = markedLocations.value.find(m => m.id === id)
      if (loc?.marker) markedMarkersLayer?.removeLayer(loc.marker as unknown as L.Layer)
      markedLocations.value = markedLocations.value.filter(m => m.id !== id)
    }

    const toggleExpand = () => {
      isExpanded.value = !isExpanded.value
      nextTick(() => { map?.invalidateSize() })
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
        const res = await apiConnect.importExternalData()
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
    const openAiDrawer = async (t: TreeOnMap) => {
      selectedTree.value = t
      aiDrawerOpen.value = true
      loadingAiData.value = true
      aiTreeData.value = null

      try {
        // LAZY LOAD: Busca detalhes completos apenas ao abrir a gaveta
        const res = await apiConnect.get<any>(`/trees/${t.id}`)
        const data = res.data || {}

        // Se não tiver predição nos dados básicos, tenta buscar no novo endpoint
        let aiPrediction = data.aiPrediction
        if (!aiPrediction) {
          try {
            const predRes = await apiConnect.getAiPrediction(t.id)
            aiPrediction = predRes.data
          } catch (pErr) {
            console.warn('Predição IA não encontrada para esta árvore', pErr)
          }
        }

        // Montamos o objeto TreeWithAi combinando os dados
        aiTreeData.value = {
          id: t.id,
          commonName: data.species?.commonName || t.speciesName || 'Árvore Independente',
          status: t.status as any,
          aiPrediction: aiPrediction || data, 
          soil: data.soil || (data.solo ? data.solo[0] : null) || null,
          vigor: data.vigor || 'GOOD',
          measurements: data.measurements || [],
          maintenanceSchedule: data.maintenanceSchedule || []
        }
      } catch (err) {
        console.error('Erro ao buscar dados completos da árvore:', err)
        notify('Erro ao carregar detalhes. Tente novamente.', 'error')
        aiDrawerOpen.value = false // Fecha se falhar feio
      } finally {
        loadingAiData.value = false
      }
    }

    const closeAiDrawer = () => {
      aiDrawerOpen.value = false
      // Omitimos o clearing de aiTreeData aqui para evitar erros de "patch node"
      // durante a animação de fechamento do drawer.
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

      map = L.map('pruning-map-container', { zoomControl: false }).setView([DEFAULT_LAT, DEFAULT_LNG], DEFAULT_ZOOM)
      console.log('[PruningMap] Mapa criado:', !!map)

      // Inicializa bounds e zoom reativos
      mapBounds.value = map.getBounds()
      mapZoom.value = map.getZoom()

      streetLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO &copy; OSM',
        maxZoom: 19,
        detectRetina: true,
      })

      satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; Esri',
        maxZoom: 20,
        maxNativeZoom: 18,
      })

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
              background:linear-gradient(135deg,#2E7D32,#66BB6A);
              color:#fff;font-weight:700;font-size:14px;
              border-radius:50%;width:100%;height:100%;
              display:flex;align-items:center;justify-content:center;
              box-shadow:0 2px 10px rgba(0,0,0,0.3);
              border:3px solid rgba(255,255,255,0.7);
            ">🌳 ${count}</div>`,
            className: 'tree-cluster-icon',
            iconSize: [size, size],
          })
        },
      })
      map.addLayer(treeClusterGroup)

      markedMarkersLayer = L.layerGroup().addTo(map)
      powerLinesLayer = L.layerGroup().addTo(map)
      // Criar pane para solo com z-index maior que o menu (1001) para ficar na frente
      map.createPane('soilPane')
      map.getPane('soilPane')!.style.zIndex = '1100'
      soilLayer = L.layerGroup([], { pane: 'soilPane' } as L.LayerOptions).addTo(map)
      drawPowerLines()

      // Clique para marcação / simulação
      map.on('click', (ev: L.LeafletMouseEvent) => {
        if (isSimulationMode.value) {
          userLat.value = ev.latlng.lat
          userLng.value = ev.latlng.lng
          
          if (userMarker) {
            userMarker.setLatLng(ev.latlng)
          } else {
            userMarker = L.marker(ev.latlng, { icon: createUserIcon(), zIndexOffset: 1000 }).addTo(map!)
          }
          
          if (userAccuracyCircle) {
            userAccuracyCircle.setLatLng(ev.latlng).setRadius(10)
          }
          
          notify('📍 Posição definida manualmente!', 'success')
          isSimulationMode.value = false
          return
        }

        if (!markMode.value) return
        const notes = prompt('📌 Digite uma nota para esta marcação:')
        if (notes === null) return
        const marker = L.marker([ev.latlng.lat, ev.latlng.lng], { icon: createMarkIcon() })
        marker.bindPopup(`
          <div style="min-width:160px;font-family:system-ui;">
            <div style="font-weight:700;color:#7B1FA2;margin-bottom:4px;">📌 Marcação</div>
            <p style="margin:2px 0;font-size:13px;">${notes || 'Sem nota'}</p>
            <p style="margin:2px 0;font-size:11px;color:#888;">${ev.latlng.lat.toFixed(6)}, ${ev.latlng.lng.toFixed(6)}</p>
          </div>
        `)
        markedMarkersLayer!.addLayer(marker)
        marker.openPopup()
        markedLocations.value.push({ id: String(Date.now()), lat: ev.latlng.lat, lng: ev.latlng.lng, notes: notes || '', timestamp: new Date(), marker })
        notify('📌 Marcação adicionada!', 'info')
      })

      // Iniciar: Primeiro obtém localização, depois carrega árvores
      console.log('[PruningMap] Iniciando mapa...')
      goToUserLocation().then((success) => {
        console.log('[PruningMap] Localização:', success ? 'obtida' : 'falhou/indisponível')
        startWatchingPosition()
        // Carrega árvores mesmo se localização falhou (usa fallback)
        console.log('[PruningMap] Carregando árvores...')
        fetchTrees().then(() => {
          console.log(`[PruningMap] Árvores carregadas: ${trees.value.length}`)
          renderTrees()
          console.log(`[PruningMap] Marcadores renderizados no cluster`)
        }).catch((err) => {
          console.error('[PruningMap] Erro ao carregar árvores:', err)
        }).finally(() => {
          isInitialMapLoading.value = false
        })
      })
      // Refresh automático a cada 5 minutos (sem resetar - só atualiza dados existentes)
      refreshInterval = setInterval(() => refreshData(false, true), 300000)

      // Carregamento dinâmico: Carrega tiles quando usuário navega/zoom
      let tileLoadTimeout: ReturnType<typeof setTimeout> | null = null

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
        console.log(`[PruningMap] Mapa atualizado - Zoom: ${mapZoom.value}, Árvores visíveis: ${visibleTreeCount.value}`)
      }

      map.on('move', updateMapState)      // Atualiza em tempo real durante movimento
      map.on('zoom', updateMapState)      // Atualiza durante zoom
      map.on('moveend', () => {
        updateMapState()

        // Debounce para carregamento automático
        if (tileLoadTimeout) clearTimeout(tileLoadTimeout)
        tileLoadTimeout = setTimeout(() => {
          const zoom = mapZoom.value
          const currentBounds = mapBounds.value

          if (autoLoadOnZoom.value && currentBounds) {
            // Verifica se já carregamos desta área recentemente (evita recarregar mesma área)
            if (lastLoadedBounds && lastLoadedBounds.contains(currentBounds) && lastLoadedZoom === zoom) {
              return // Já temos dados desta área
            }

            // Carrega área visível (com ou sem região selecionada)
            loadVisibleTiles(true).then((loaded) => {
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
    })

    onUnmounted(() => {
      if (locationWatchId !== null) navigator.geolocation.clearWatch(locationWatchId)
      if (refreshInterval) clearInterval(refreshInterval)
      if (renderTimeout) clearTimeout(renderTimeout)
      window.removeEventListener('keydown', handleKeydown)
      window.removeEventListener('resize', handleResize)
      map?.remove()
    })

    return {
      trees, filteredTrees, markedLocations, markMode, isExpanded,
      loadingTrees, blockingMapLoading, locating, locationError, searchQuery, searching,
      sidebarOpen, activeFilter, mapStyle, snackbar, snackbarText, snackbarColor,
      selectedTree, treeCount, visibleTreeCount, dangerCount, criticalCount, markedCount, statusCounts, isMobile,
      goToUserLocation, toggleMarkMode, toggleExpand, toggleMapStyle, setFollowUserPosition,
      refreshData, removeMarkedLocation, searchAddress, flyToTree,
      STATUS_CONFIG, isRouting, stopRouting, isSimulationMode, toggleSimulationMode,
      loadingRoute, showPowerLines, togglePowerLines,
      aiDrawerOpen, aiTreeData, loadingAiData, openAiDrawer, closeAiDrawer,
      showSoilLayer, loadingSoil, toggleSoilLayer, getSoilInfo, SOIL_TYPES,
      importingIA, syncIA, importCsvMode, csvPath, syncCsvIA,
      // Carregamento progressivo
      loadRadius, hasMoreTrees, totalTreesInArea, loadMoreTrees, fetchTreesNearby, fetchTreesInBounds, autoLoadOnZoom, followUserPosition, userHasMovedMap,
      // Estado do mapa (reativo)
      mapBounds, mapZoom,
      // Sistema de regiões e solo
      availableRegions, selectedRegion, loadingRegion, cityStats, fetchTreesByRegion,
      loadRegionsFromApi, loadCityStats, onRegionSelected, loadVisibleTiles, detectAndLoadRegion,
      soilRenderMode, changeSoilRenderMode, showSoilControls, toggleSoilControls,
      // UI - Abas do novo sidebar v2
      expandedPanels, activeTab
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
        <div class="legend-footer">
          Fonte: Embrapa Brasil / Mapeamento IA
        </div>
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
         - Mostra spinner quando: buscando localização,
           carregando árvores, calculando rota
         ===================================================== -->
    <Transition name="fade">
      <div v-if="blockingMapLoading" class="locating-overlay glass-overlay">
        <v-progress-circular indeterminate color="#C1E328" size="70" width="6" />
        <p class="text-white mt-5 font-weight-bold" style="font-size: 18px; text-shadow: 0 2px 8px rgba(0,0,0,0.7);">
          {{ loadingRoute ? 'Calculando melhor rota...' : (locating ? 'Buscando sua localização...' : 'Carregando dados iniciais do mapa...') }}
        </p>
      </div>
    </Transition>

    <!-- =====================================================
         SEÇÃO 3: BARRA DE BUSCA DE ENDEREÇO (Nominatim)
         - Busca endereços no Brasil via API Nominatim
         - Centraliza o mapa no resultado encontrado
         ===================================================== -->
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
        bg-color="white"
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
        <v-btn value="ALL" class="toggle-btn">
          <v-icon start>mdi-tree</v-icon>
          Todas ({{ treeCount }})
        </v-btn>
        <v-btn value="CRITICAL" class="toggle-btn">
          <v-icon start color="red">mdi-alert-decagram</v-icon>
          Críticos ({{ criticalCount }})
        </v-btn>
        <v-btn value="UNDER_OBSERVATION" class="toggle-btn">
          <v-icon start color="amber">mdi-eye</v-icon>
          Obs. ({{ statusCounts['UNDER_OBSERVATION'] || 0 }})
        </v-btn>
      </v-btn-toggle>
    </div>

    <!-- ============ BOTÕES FLUTUANTES DIREITA ============ -->
    <div class="floating-actions-right">
      <v-tooltip text="Minha localização" location="left">
        <template #activator="{ props }">
          <v-btn v-bind="props" icon color="primary" :size="isMobile ? 'default' : 'large'" elevation="4" :loading="locating" @click="goToUserLocation" class="mb-2">
            <v-icon>mdi-crosshairs-gps</v-icon>
          </v-btn>
        </template>
      </v-tooltip>

      <v-tooltip text="Definir minha posição" location="left">
        <template #activator="{ props }">
          <v-btn v-bind="props" icon :color="isSimulationMode ? 'amber-darken-3' : 'blue-grey-darken-1'" :size="isMobile ? 'default' : 'large'" elevation="4" @click="toggleSimulationMode" class="mb-2">
            <v-icon>{{ isSimulationMode ? 'mdi-map-marker-question' : 'mdi-map-marker-account' }}</v-icon>
          </v-btn>
        </template>
      </v-tooltip>

      <v-tooltip :text="mapStyle === 'street' ? 'Satélite' : 'Mapa'" location="left">
        <template #activator="{ props }">
          <v-btn v-bind="props" icon color="blue-grey-darken-2" :size="isMobile ? 'default' : 'large'" elevation="4" @click="toggleMapStyle" class="mb-2">
            <v-icon>{{ mapStyle === 'street' ? 'mdi-satellite-variant' : 'mdi-map-outline' }}</v-icon>
          </v-btn>
        </template>
      </v-tooltip>

      <v-tooltip :text="showPowerLines ? 'Ocultar Rede Elétrica' : 'Mostrar Rede Elétrica'" location="left">
        <template #activator="{ props }">
          <v-btn v-bind="props" icon :color="showPowerLines ? 'red-darken-1' : 'blue-grey-darken-1'" :size="isMobile ? 'default' : 'large'" elevation="4" @click="togglePowerLines" class="mb-2">
            <v-icon>{{ showPowerLines ? 'mdi-flash-off' : 'mdi-flash' }}</v-icon>
          </v-btn>
        </template>
      </v-tooltip>

      <v-tooltip text="Camada de Solo" location="left">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon
            :color="showSoilLayer ? 'brown-darken-2' : 'blue-grey-darken-1'"
            :size="isMobile ? 'default' : 'large'"
            elevation="4"
            :loading="loadingSoil"
            @click="toggleSoilLayer"
            class="mb-2"
          >
            <v-icon>{{ showSoilLayer ? 'mdi-layers' : 'mdi-layers-outline' }}</v-icon>
          </v-btn>
        </template>
      </v-tooltip>

      <v-tooltip :text="markMode ? 'Parar marcação' : 'Marcar no mapa'" location="left">
        <template #activator="{ props }">
          <v-btn v-bind="props" icon :color="markMode ? 'warning' : 'purple'" :size="isMobile ? 'default' : 'large'" elevation="4" @click="toggleMarkMode" class="mb-2">
            <v-icon>{{ markMode ? 'mdi-map-marker-check' : 'mdi-map-marker-plus' }}</v-icon>
          </v-btn>
        </template>
      </v-tooltip>

      <v-tooltip :text="isExpanded ? 'Reduzir (ESC)' : 'Expandir'" location="left">
        <template #activator="{ props }">
          <v-btn v-bind="props" icon :color="isExpanded ? 'red' : 'blue-grey'" :size="isMobile ? 'default' : 'large'" elevation="4" @click="toggleExpand">
            <v-icon>{{ isExpanded ? 'mdi-fullscreen-exit' : 'mdi-fullscreen' }}</v-icon>
          </v-btn>
        </template>
      </v-tooltip>

      <!-- BOTÃO CANCELAR ROTA -->
      <v-fade-transition>
        <v-btn
          v-if="isRouting"
          icon
          color="red"
          :size="isMobile ? 'default' : 'large'"
          elevation="4"
          class="mt-2"
          @click="stopRouting"
        >
          <v-icon>mdi-close-thick</v-icon>
          <v-tooltip activator="parent" location="left">Cancelar Rota</v-tooltip>
        </v-btn>
      </v-fade-transition>
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
      :style="{ left: sidebarOpen ? '320px' : '12px' }"
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
            <v-chip size="x-small" color="green" variant="flat" class="font-weight-bold">
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
              @click="sidebarOpen = true; activeTab = 'arvores'"
            >
              <v-icon size="14" color="green-darken-2" class="mr-1">mdi-eye</v-icon>
              <span class="text-caption font-weight-bold text-green-darken-2">{{ visibleTreeCount }}</span>
            </v-btn>

            <v-btn
              variant="flat"
              size="small"
              color="blue-lighten-4"
              class="stat-btn"
              @click="sidebarOpen = true; activeTab = 'arvores'"
            >
              <v-icon size="14" color="blue-darken-2" class="mr-1">mdi-tree</v-icon>
              <span class="text-caption font-weight-bold text-blue-darken-2">{{ treeCount }}</span>
            </v-btn>

            <v-btn
              variant="flat"
              size="small"
              color="red-lighten-4"
              class="stat-btn"
              @click="sidebarOpen = true; activeFilter = 'DANGER'; activeTab = 'arvores'"
            >
              <v-icon size="14" color="red-darken-2" class="mr-1">mdi-alert</v-icon>
              <span class="text-caption font-weight-bold text-red-darken-2">{{ dangerCount }}</span>
            </v-btn>

            <v-btn
              icon
              size="small"
              variant="flat"
              color="grey"
              @click="sidebarOpen = true"
            >
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
            <span>{{ treeCount }} árvores carregadas no total</span>
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
          <v-tab value="carregar" prepend-icon="mdi-download">
            <span class="text-caption">Carregar</span>
          </v-tab>
          <v-tab value="arvores" prepend-icon="mdi-tree">
            <span class="text-caption">Árvores</span>
          </v-tab>
          <v-tab value="config" prepend-icon="mdi-cog">
            <span class="text-caption">Config</span>
          </v-tab>
        </v-tabs>

        <v-divider />

        <!-- Conteúdo das Abas -->
        <div class="sidebar-content">

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
                      <v-icon v-bind="props" size="12" color="grey-lighten-1" class="ml-1">mdi-help-circle</v-icon>
                    </template>
                    <span class="text-caption">
                      Quando ativado, o mapa carrega árvores automaticamente quando você dá zoom (amplia) em uma área.<br><br>
                      <strong>Como funciona:</strong><br>
                      • Detecta quando você para de mover o mapa<br>
                      • Se o zoom for suficiente (nível de rua/bairro)<br>
                      • Carrega as árvores da área visível<br><br>
                      Isso evita carregar milhares de árvores de uma vez só.
                    </span>
                  </v-tooltip>
                </div>
                <v-switch v-model="autoLoadOnZoom" color="green" density="compact" hide-details size="small" />
              </div>
              <div class="follow-control">
                <div class="follow-control__text">
                  <span class="text-caption text-grey-darken-1 d-flex align-center">
                    <v-icon size="14" class="mr-1">mdi-crosshairs-gps</v-icon>
                    Seguir minha posição
                  </span>
                  <span class="follow-control__hint">
                    {{ followUserPosition ? 'Ativo: o mapa acompanha seu GPS.' : 'Ative para manter o mapa centralizado no seu GPS.' }}
                  </span>
                </div>
                <v-switch
                  v-model="followUserPosition"
                  color="blue"
                  density="compact"
                  hide-details
                  size="small"
                  @update:model-value="setFollowUserPosition"
                />
              </div>
            </div>

            <v-progress-linear v-if="loadingTrees" indeterminate color="green" class="mt-3" height="2" />
          </div>

          <!-- === ABA 2: LISTA DE ÁRVORES === -->
          <div v-show="activeTab === 'arvores'" class="tab-panel">

            <!-- Filtros Rápidos -->
            <div class="filter-section mb-3">
              <p class="text-caption font-weight-bold text-grey-darken-1 mb-2">Filtrar por status:</p>
              <div class="filter-chips-scroll">
                <v-chip
                  size="small"
                  :variant="activeFilter === 'ALL' ? 'flat' : 'outlined'"
                  :color="activeFilter === 'ALL' ? 'green' : 'grey'"
                  @click="activeFilter = 'ALL'"
                  class="mr-1 mb-1"
                >
                  Todos ({{ treeCount }})
                </v-chip>
                <v-chip
                  v-for="(cfg, key) in STATUS_CONFIG"
                  :key="key"
                  size="small"
                  :variant="activeFilter === key ? 'flat' : 'outlined'"
                  :color="cfg.color"
                  @click="activeFilter = String(key)"
                  class="mr-1 mb-1"
                >
                  {{ cfg.emoji }} {{ cfg.label }} ({{ statusCounts[key] || 0 }})
                </v-chip>
              </div>
            </div>

            <v-divider class="mb-2" />

            <!-- Lista de Árvores -->
            <div class="tree-list-header d-flex justify-space-between align-center mb-2">
              <span class="text-caption font-weight-bold">🌳 Árvores ({{ filteredTrees.length }})</span>
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
              Nenhuma árvore encontrada com este filtro
            </div>

            <div class="tree-list-scroll-new">
              <v-list density="compact" class="pa-0">
                <v-list-item
                  v-for="tree in filteredTrees.slice(0, 50)"
                  :key="tree.id"
                  :active="selectedTree?.id === tree.id"
                  :color="tree.nearPowerLine ? 'red' : 'green'"
                  @click="flyToTree(tree); openAiDrawer(tree)"
                  class="tree-list-item-new"
                  two-line
                >
                  <template #prepend>
                    <v-avatar size="32" :color="tree.nearPowerLine ? 'red' : (STATUS_CONFIG[tree.status]?.bg || '#4CAF50')">
                      <span class="text-caption">{{ tree.nearPowerLine ? '⚠️' : (STATUS_CONFIG[tree.status]?.emoji || '🌳') }}</span>
                    </v-avatar>
                  </template>

                  <v-list-item-title class="text-body-2">
                    {{ tree.speciesName }}
                  </v-list-item-title>

                  <v-list-item-subtitle class="text-caption">
                    {{ STATUS_CONFIG[tree.status]?.label || tree.status }}
                    <span v-if="tree.nearPowerLine" class="text-red"> · ⚡ Fiação</span>
                  </v-list-item-subtitle>

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
                  <span class="text-caption">{{ cfg.emoji }} {{ cfg.label }}</span>
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
              <div class="text-caption text-center text-grey mb-2" style="font-size: 10px;">
                {{ soilRenderMode === 'circles' ? 'Círculos' : soilRenderMode === 'dots' ? 'Pontos' : soilRenderMode === 'grid' ? 'Grid' : 'Heatmap' }}
              </div>

              <div v-if="showSoilLayer" class="soil-legend-compact">
                <div v-for="(info, key) in SOIL_TYPES" :key="key" class="soil-item">
                  <span class="soil-dot" :style="{ background: info.color }" />
                  <span class="text-caption" style="font-size: 10px;">{{ info.name }}</span>
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
                  <v-list-item
                    v-for="loc in markedLocations"
                    :key="loc.id"
                    density="compact"
                  >
                    <template #title>
                      <span class="text-caption text-truncate">{{ loc.notes || 'Sem nota' }}</span>
                    </template>
                    <template #append>
                      <v-btn icon size="x-small" variant="text" color="red" @click="removeMarkedLocation(loc.id)">
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
      {{ locationError }}
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

    <!-- ============ IA DRAWER (Lateral Direita) ============ -->
    <v-navigation-drawer
      v-model="aiDrawerOpen"
      location="right"
      temporary
      :width="isMobile ? 320 : 420"
      class="ai-drawer"
      :scrim="false"
    >
      <!-- Header do Drawer -->
      <div class="ai-drawer-header">
        <div class="d-flex align-center">
          <div class="ai-drawer-icon">
            <v-icon size="22" color="white">mdi-brain</v-icon>
          </div>
          <div class="ml-3">
            <p class="ai-drawer-title">Análise de IA</p>
            <p class="ai-drawer-subtitle">{{ selectedTree?.speciesName || 'Árvore' }}</p>
          </div>
        </div>
        <v-btn icon variant="text" size="small" @click="closeAiDrawer">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </div>

      <v-divider />

      <!-- Conteúdo do Drawer -->
      <div class="ai-drawer-body" v-if="aiDrawerOpen || aiTreeData">
        <!-- Loading -->
        <div v-if="loadingAiData" class="ai-drawer-loading">
          <v-progress-circular indeterminate color="deep-purple" size="48" width="4" />
          <p class="mt-4 text-body-2 text-grey-darken-1">Carregando análise de IA...</p>
        </div>

        <!-- Dados da IA -->
        <TreeAiStats v-else-if="aiTreeData" :key="aiTreeData.id" :data="aiTreeData" />

        <!-- Sem dados -->
        <div v-else class="ai-drawer-empty">
          <v-icon size="64" color="grey-lighten-1">mdi-brain</v-icon>
          <p class="mt-4 text-body-2 text-grey-darken-1 text-center">
            Nenhuma análise de IA disponível para esta árvore.
          </p>
          <p class="text-caption text-grey text-center">
            Execute a importação de dados no painel do Administrador.
          </p>
        </div>
      </div>
    </v-navigation-drawer>

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
          <p class="text-body-2 mb-4">Informe o caminho completo do arquivo CSV no servidor para processamento.</p>
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
  </div>
</template>

<style scoped>
/* ============ ROOT ============ */
.map-root {
  position: relative;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.map-root.map-expanded {
  position: fixed !important;
  top: 0; left: 0;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 9999;
}

#pruning-map-container {
  width: 100%;
  height: 100%;
  z-index: 1;
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

.filter-toggle {
  background: rgba(255, 255, 255, 0.9) !important;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0,0,0,0.2) !important;
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
  color: #555 !important;
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
}

/* ============ BOTÕES FLUTUANTES DIREITA ============ */
.floating-actions-right {
  position: absolute;
  top: 140px;
  right: 14px;
  z-index: 1001;
  display: flex;
  flex-direction: column;
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
  top: 80px;
  left: 14px;
  z-index: 1001;
  width: 280px;
  max-height: calc(100% - 28px);
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
  overflow-x: hidden;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.map-sidebar:hover {
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
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
  color: #1B5E20;
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.sidebar-subtitle {
  font-size: 13px;
  font-weight: 600;
  color: #424242;
  margin-bottom: 8px;
}

/* ============ STATS GRID ============ */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.stat-card {
  background: #fff;
  border-radius: 10px;
  padding: 10px;
  text-align: center;
  border: 2px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.2s;
}

.stat-card:hover {
  border-color: var(--accent);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.stat-number {
  font-size: 22px;
  font-weight: 800;
  color: var(--accent);
}

.stat-label {
  font-size: 11px;
  color: #666;
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

.tree-list-item:hover { background: #f5f5f5; }
.tree-list-item--active { background: #E8F5E9 !important; }

.tree-list-item--danger {
  background: #FFF3F3;
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

.tree-list-info { flex: 1; min-width: 0; }
.tree-list-name { font-size: 13px; font-weight: 600; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tree-list-meta { font-size: 11px; color: #888; }
.soil-legend-scroll {
  max-height: 160px;
  overflow-y: auto;
  padding-right: 4px;
}
.soil-legend-scroll::-webkit-scrollbar {
  width: 3px;
}
.soil-legend-scroll::-webkit-scrollbar-thumb {
  background: #D7CCC8;
  border-radius: 10px;
}

/* ============ FLOATING SOIL LEGEND ============ */
.floating-soil-legend {
  position: absolute;
  top: 80px;
  left: 20px;
  z-index: 1000;
  width: 240px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(121, 85, 72, 0.2);
  border-radius: 16px;
  box-shadow: 0 12px 32px rgba(0,0,0,0.1);
  overflow: hidden;
  transition: all 0.3s ease;
}

.legend-header {
  background: #EFEBE9;
  padding: 10px 14px;
  font-size: 11px;
  font-weight: 800;
  color: #5D4037;
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
  border-bottom: 1px solid rgba(0,0,0,0.03);
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
  color: #333;
}

.item-impact {
  font-size: 9px;
  color: #795548;
  font-weight: 600;
}

.legend-footer {
  padding: 8px;
  font-size: 9px;
  color: #999;
  text-align: center;
  background: #fafafa;
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
  border-top: 3px dashed #E53935;
  margin-right: 8px;
  flex-shrink: 0;
}

/* ============ ALERTA / BADGE ============ */
.location-error-alert {
  position: absolute;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1001;
  max-width: 360px;
}

.mark-mode-badge {
  position: absolute;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1001;
  background: #FF8F00;
  color: #fff;
  padding: 8px 20px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 13px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 12px rgba(255,143,0,0.4);
}

/* ============ ANIMAÇÕES ============ */
@keyframes pulse {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,59,59,0.6); }
  50% { transform: scale(1.1); box-shadow: 0 0 14px 5px rgba(255,59,59,0.25); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,59,59,0); }
}

@keyframes pulsePin {
  0% { transform: rotate(-45deg) scale(1); box-shadow: -2px 2px 0 0 rgba(255,59,59,0.6); }
  50% { transform: rotate(-45deg) scale(1.15); box-shadow: -4px 4px 10px 4px rgba(255,59,59,0.4); }
  100% { transform: rotate(-45deg) scale(1); box-shadow: -2px 2px 0 0 rgba(255,59,59,0); }
}

@keyframes userPulse {
  0% { box-shadow: 0 0 0 0 rgba(25,118,210,0.5); }
  50% { box-shadow: 0 0 20px 10px rgba(25,118,210,0.12); }
  100% { box-shadow: 0 0 0 0 rgba(25,118,210,0); }
}

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-enter-active, .slide-leave-active { transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.slide-enter-from, .slide-leave-to { transform: translateX(-100%); }

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
}

:deep(.leaflet-popup-content) {
  margin: 0 !important;
  width: auto !important;
}

:deep(.leaflet-popup-close-button) {
  color: #fff !important;
  font-size: 16px !important;
  padding: 10px 10px 0 0 !important;
}

:deep(.tree-popup .leaflet-popup-content-wrapper) {
  border-radius: 12px;
  padding: 0;
  overflow: hidden;
}

:deep(.tree-popup .leaflet-popup-content) {
  margin: 20px;
}

:deep(.leaflet-control-zoom) { border: none !important; box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important; border-radius: 8px !important; }
:deep(.leaflet-routing-container) { display: none !important; }
:deep(.leaflet-control-zoom a) { border-radius: 0 !important; }
:deep(.leaflet-control-zoom a:first-child) { border-radius: 8px 8px 0 0 !important; }
:deep(.leaflet-control-zoom a:last-child) { border-radius: 0 0 8px 8px !important; }

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
    bottom: 16px;
    max-width: calc(100% - 24px);
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
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  padding: 12px 14px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(0, 0, 0, 0.05);
  min-width: 180px;
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
  width: 320px;
  max-height: calc(100% - 28px);
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  background: linear-gradient(135deg, #f8faf8, #f0f4f0);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.sidebar-tabs {
  background: #fff;
}

.sidebar-tabs :deep(.v-tab) {
  text-transform: none;
  min-width: 0;
  padding: 8px 12px;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #fafafa;
}

.tab-panel {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ============ CARDS E STATS ============ */
.city-stats-card {
  background: linear-gradient(135deg, #f5f5f5, #fafafa);
  border-radius: 8px;
  padding: 10px 12px;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.controls-section {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid rgba(0, 0, 0, 0.05);
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
  color: #78909c;
  font-size: 10px;
  line-height: 1.25;
}

/* ============ FILTROS ============ */
.filter-section {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid rgba(0, 0, 0, 0.05);
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
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.tree-list-item-new {
  border-bottom: 1px solid rgba(0, 0, 0, 0.03);
  cursor: pointer;
  transition: background 0.2s ease;
}

.tree-list-item-new:hover {
  background: rgba(76, 175, 80, 0.05);
}

.tree-list-item-new:last-child {
  border-bottom: none;
}

/* ============ CONFIGURAÇÕES ============ */
.config-section {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid rgba(0, 0, 0, 0.05);
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
  background: #FF3B3B;
  flex-shrink: 0;
}

.soil-legend-compact {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin-top: 8px;
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
    width: 100%;
    max-height: calc(100% - 140px);
    left: 8px;
    right: 8px;
    top: 70px;
    bottom: 72px;
    position: fixed;
  }

  .sidebar-content {
    padding: 12px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    max-height: calc(100vh - 200px);
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
  z-index: 2001 !important;
}

.ai-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #fafafa;
}

.ai-drawer-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, #7B1FA2, #AB47BC);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ai-drawer-title {
  font-size: 15px;
  font-weight: 700;
  color: #333;
  line-height: 1.2;
}

.ai-drawer-subtitle {
  font-size: 12px;
  color: #888;
  margin-top: 2px;
}

.ai-drawer-body {
  padding: 16px;
  overflow-y: auto;
  height: calc(100% - 74px);
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
  box-shadow: 0 4px 10px rgba(0,0,0,0.3);
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
  top: 0; left: 0; right: 0; bottom: 0;
  background: var(--marker-color);
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  opacity: 0.4;
  z-index: -1;
  animation: soilPulse 2s infinite;
}

@keyframes soilPulse {
  0% { transform: scale(1); opacity: 0.4; }
  100% { transform: scale(2.5); opacity: 0; }
}

:deep(.soil-glass-popup) .leaflet-popup-content-wrapper {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 0;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.15);
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
  color: #1a1a1a;
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
  background: #f8fafc;
  padding: 10px;
  border-radius: 10px;
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
}

:deep(.prediction-label) {
  font-size: 10px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
}

:deep(.prediction-value) {
  font-size: 14px;
  font-weight: 800;
  margin-top: 2px;
}

:deep(.soil-definition) {
  font-size: 12px;
  color: #475569;
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
  color: #334155;
}

:deep(.metric-bar) {
  height: 6px;
  background: #e2e8f0;
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
  border-top: 1px solid #f1f5f9;
  padding-top: 12px;
  gap: 16px;
}

:deep(.footer-item) {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
}

:deep(.leaflet-popup-tip) {
  background: rgba(255, 255, 255, 0.95);
}
</style>
