<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref, computed, nextTick, watch } from 'vue'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { apiConnect, type TreeWithAi } from '@/plugins/apiConnect'
import TreeAiStats from '@/components/functions/TreeAiStats.vue'
import 'leaflet-routing-machine'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'

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
  soilQuality: string
  soilDepth: number | null
  clay: number | null
  sand: number | null
  ph: number | null
  hasSoilData: boolean
  markerColor: string
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
  // SE ESTIVER EM PERIGO (por altura ou simulação) OU SE O STATUS FOR CRÍTICO/PODA
  if (danger || s === 'CRITICAL' || s === 'DANGER' || s === 'TO_PRUNE') {
    return STATUS_CONFIG['CRITICAL'] || STATUS_CONFIG['DANGER'] || DEFAULT_STATUS
  }
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
    const fetchTrees = async () => {
      loadingTrees.value = true
      try {
        const res = await apiConnect.getTreesMap()
        trees.value = (res.data || [])
          .filter((t: any) => t.latitude != null && t.longitude != null)
          .map((t: any) => {
            const lat = Number(t.latitude)
            const lng = Number(t.longitude)
            const curH = t.currentHeight || 0
            const wireH = t.wireHeight || 6.5
            
            // É PERIGO se: estiver perto da fiação simulada OU se a altura for >= 90% do fio
            const isDanger = checkNearPowerLine(lat, lng) || (curH / wireH >= 0.9)
            
            return {
              id: t.id,
              latitude: lat,
              longitude: lng,
              status: t.status || 'NORMAL',
              speciesName: 'Árvore #' + t.id.slice(-4),
              scientificName: '',
              family: '',
              nearPowerLine: isDanger,
              soilQuality: 'UNKNOWN',
              vigor: 'GOOD',
              currentHeight: curH,
              wireHeight: wireH
            }
          })
        console.log('Total de árvores carregadas:', trees.value.length)
        notify(`${trees.value.length} árvore(s) carregada(s)`, 'success')
        
        // AUTO-CENTER: Centraliza o mapa para mostrar todas as árvores apenas na primeira carga
        if (map && trees.value.length > 0 && isInitialLoad.value) {
          const bounds = L.latLngBounds(trees.value.map(t => [t.latitude, t.longitude]))
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
          isInitialLoad.value = false
        }
      } catch (err) {
        console.error('Erro ao buscar árvores:', err)
        trees.value = []
        notify('Erro ao carregar árvores da API', 'error')
      } finally {
        loadingTrees.value = false
      }
    }

    const fetchSoilData = async () => {
  loadingSoil.value = true
  try {
    const res = await apiConnect.get<SoilMapPoint[]>('/soil/map')
    soilPoints.value = res.data || []
  } catch (err) {
    notify('Erro ao carregar dados de solo', 'error')
  } finally {
    loadingSoil.value = false
  }
}

  const renderSoilLayer = () => {
    if (!soilLayer || !map) return
    soilLayer.clearLayers()
    if (!showSoilLayer.value) return

    soilPoints.value.forEach((point) => {
      // Marcador Visual Premium (Hexágono com pulso)
      const icon = L.divIcon({
        className: 'soil-marker-container',
        html: `
          <div class="soil-hex-marker" style="--marker-color: ${point.markerColor}">
            <div class="soil-hex-inner"></div>
            <div class="soil-hex-pulse"></div>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      })

      const marker = L.marker([point.lat, point.lng], { icon })
      
      // Lógica de Definição e Crescimento
      const qualityInfo: Record<string, { label: string, growth: string, desc: string, icon: string }> = {
        GOOD: { 
          label: 'Solo A+ (Fértil)', 
          growth: 'Acelerado (+20%)', 
          desc: 'Alta capacidade de retenção de nutrientes e profundidade ideal.',
          icon: 'mdi-auto-fix'
        },
        REGULAR: { 
          label: 'Solo B (Médio)', 
          growth: 'Estável (Normal)', 
          desc: 'Composição balanceada, adequada para a maioria das espécies.',
          icon: 'mdi-check-circle-outline'
        },
        BAD: { 
          label: 'Solo C (Pobre)', 
          growth: 'Retardado (-30%)', 
          desc: 'Solo compactado ou muito arenoso. Requer correção nutricional.',
          icon: 'mdi-alert-circle-outline'
        },
        UNKNOWN: { 
          label: 'Sem Dados', 
          growth: 'N/A', 
          desc: 'Dados ainda não processados para esta coordenada.',
          icon: 'mdi-help-circle-outline'
        }
      }

      const info = qualityInfo[point.soilQuality] || qualityInfo.UNKNOWN

      marker.bindPopup(`
        <div class="soil-intelligence-card">
          <div class="soil-card-header" style="border-bottom: 2px solid ${point.markerColor}22">
            <div class="species-tag">${point.species}</div>
            <div class="quality-badge" style="background: ${point.markerColor}22; color: ${point.markerColor}">
              ${info.label}
            </div>
          </div>
          
          <div class="soil-card-body">
            <div class="growth-prediction">
              <span class="prediction-label">Impacto no Crescimento:</span>
              <span class="prediction-value" style="color: ${point.markerColor}">${info.growth}</span>
            </div>
            
            <p class="soil-definition">${info.desc}</p>
            
            <div class="metrics-grid">
              <div class="metric-item">
                <div class="metric-header">
                  <span>Argila</span>
                  <span>${point.clay ? point.clay.toFixed(1) + '%' : '---'}</span>
                </div>
                <div class="metric-bar"><div class="bar-fill" style="width: ${point.clay || 0}%; background: ${point.markerColor}"></div></div>
              </div>
              <div class="metric-item">
                <div class="metric-header">
                  <span>pH</span>
                  <span>${point.ph ? point.ph.toFixed(1) : '---'}</span>
                </div>
                <div class="metric-bar"><div class="bar-fill" style="width: ${(point.ph || 0) * 7}%; background: ${point.markerColor}"></div></div>
              </div>
            </div>

            <div class="footer-metrics">
              <div class="footer-item">
                <v-icon size="14">mdi-arrow-down-bold</v-icon>
                <span>${point.soilDepth ? point.soilDepth.toFixed(1) + 'm' : '---'}</span>
              </div>
              <div class="footer-item">
                <v-icon size="14">mdi-texture-box</v-icon>
                <span>Textura ideal</span>
              </div>
            </div>
          </div>
        </div>
      `, { maxWidth: 300, className: 'soil-glass-popup' })

      soilLayer!.addLayer(marker)
    })
  }

  const toggleSoilLayer = async () => {
    showSoilLayer.value = !showSoilLayer.value

    if (showSoilLayer.value && soilPoints.value.length === 0) {
      await fetchSoilData()
    }

    renderSoilLayer()
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

    const startRouting = (destLat: number, destLng: number, destName: string) => {
      if (!userLat.value || !userLng.value) {
        notify('Sua localização ainda não foi encontrada!', 'warning')
        goToUserLocation()
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
      if (!treeClusterGroup) return
      treeClusterGroup.clearLayers()

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
                background: ${t.soilQuality === 'GOOD' ? '#f0fdf4' : t.soilQuality === 'REGULAR' ? '#fffbeb' : '#fef2f2'};
                border: 1px solid ${t.soilQuality === 'GOOD' ? '#dcfce7' : t.soilQuality === 'REGULAR' ? '#fef3c7' : '#fee2e2'};
                border-radius: 8px;
                padding: 10px;
                margin-bottom: 16px;
                display: flex;
                align-items: center;
                gap: 10px;
              ">
                <div style="font-size: 20px;">${t.soilQuality === 'GOOD' ? '🌱' : t.soilQuality === 'REGULAR' ? '🌿' : '🍂'}</div>
                <div>
                  <p style="margin: 0; font-size: 10px; color: #666; font-weight: 700; text-transform: uppercase;">Inteligência de Solo</p>
                  <p style="margin: 0; font-size: 12px; font-weight: 700; color: ${t.soilQuality === 'GOOD' ? '#166534' : t.soilQuality === 'REGULAR' ? '#92400e' : '#991b1b'};">
                    ${t.soilQuality === 'GOOD' ? 'Qualidade A+ (Fértil)' : t.soilQuality === 'REGULAR' ? 'Qualidade B (Estável)' : t.soilQuality === 'BAD' ? 'Qualidade C (Pobre)' : 'Sem Dados'}
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
        treeClusterGroup!.addLayer(marker)
      })
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
    const goToUserLocation = () => {
      if (!navigator.geolocation) { locationError.value = 'Geolocalização não suportada neste navegador'; return }
      locating.value = true
      locationError.value = ''

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords
          userLat.value = latitude
          userLng.value = longitude

          if (map) {
            map.flyTo([latitude, longitude], 17, { duration: 1.5 })

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
        },
        { enableHighAccuracy: false, timeout: 30000, maximumAge: 10000 },
      )
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
      if (!searchQuery.value.trim()) return
      searching.value = true
      try {
        const q = encodeURIComponent(searchQuery.value.trim())
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

    const flyToTree = (t: TreeOnMap) => {
      map?.flyTo([t.latitude, t.longitude], 18, { duration: 1 })
      selectedTree.value = t
      if (isMobile.value) sidebarOpen.value = false
    }

    const refreshData = async () => {
      await fetchTrees()
      renderTrees()
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
        const data = res.data

        // Montamos o objeto TreeWithAi combinando os dados
        aiTreeData.value = {
          id: t.id,
          commonName: data.species?.commonName || t.speciesName,
          aiPrediction: data.aiPrediction || data,
          soil: data.soil || (data.solo ? data.solo[0] : null),
          vigor: data.vigor || 'GOOD',
          measurements: data.measurements || [],
          maintenanceSchedule: data.maintenanceSchedule || []
        }
      } catch (err) {
        console.error('Erro ao buscar dados completos da árvore:', err)
        notify('Não foi possível carregar os detalhes desta árvore.', 'error')
      } finally {
        loadingAiData.value = false
      }
    }

    const closeAiDrawer = () => {
      aiDrawerOpen.value = false
      aiTreeData.value = null
    }

    /* ---------- Watch filtro ---------- */
    watch(activeFilter, () => renderTrees())

    /* ---------- Teclado / Resize ---------- */
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded.value) toggleExpand()
    }

    const handleResize = () => {
      isMobile.value = window.innerWidth < 768
    }

    /* ---------- Init ---------- */
    const initMap = () => {
      map = L.map('pruning-map-container', { zoomControl: false }).setView([DEFAULT_LAT, DEFAULT_LNG], DEFAULT_ZOOM)

      streetLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO &copy; OSM',
        maxZoom: 20,
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
      soilLayer = L.layerGroup().addTo(map)
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

      // Iniciar
      goToUserLocation()
      startWatchingPosition()
      fetchTrees().then(() => renderTrees())
      refreshInterval = setInterval(refreshData, 60000)
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
      window.removeEventListener('keydown', handleKeydown)
      window.removeEventListener('resize', handleResize)
      map?.remove()
    })

    return {
      trees, filteredTrees, markedLocations, markMode, isExpanded,
      loadingTrees, locating, locationError, searchQuery, searching,
      sidebarOpen, activeFilter, mapStyle, snackbar, snackbarText, snackbarColor,
      selectedTree, treeCount, dangerCount, markedCount, statusCounts, isMobile,
      goToUserLocation, toggleMarkMode, toggleExpand, toggleMapStyle,
      refreshData, removeMarkedLocation, searchAddress, flyToTree,
      STATUS_CONFIG, isRouting, stopRouting, isSimulationMode, toggleSimulationMode,
      loadingRoute, showPowerLines, togglePowerLines,
      aiDrawerOpen, aiTreeData, loadingAiData, openAiDrawer, closeAiDrawer,
      showSoilLayer, loadingSoil, toggleSoilLayer
    }
  },
})
</script>

<template>
  <div :class="['map-root', { 'map-expanded': isExpanded }]">

    <!-- ============ MAPA ============ -->
    <div id="pruning-map-container" />

    <!-- ============ OVERLAY LOADING ============ -->
    <Transition name="fade">
      <div v-if="locating || loadingTrees || loadingRoute" class="locating-overlay glass-overlay">
        <v-progress-circular indeterminate color="#C1E328" size="70" width="6" />
        <p class="text-white mt-5 font-weight-bold" style="font-size: 18px; text-shadow: 0 2px 8px rgba(0,0,0,0.7);">
          {{ locating ? 'Buscando sua localização…' : (loadingRoute ? 'Calculando melhor rota…' : 'Sincronizando dados das árvores…') }}
        </p>
      </div>
    </Transition>

    <!-- ============ BARRA DE BUSCA TOPO ============ -->
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

    <!-- ============ BOTÃO TOGGLE SIDEBAR ============ -->
    <v-btn
      class="sidebar-toggle-btn"
      icon
      size="small"
      elevation="4"
      color="white"
      :style="{ left: sidebarOpen ? '285px' : '12px' }"
      @click="sidebarOpen = !sidebarOpen"
    >
      <v-icon>{{ sidebarOpen ? 'mdi-chevron-left' : 'mdi-chevron-right' }}</v-icon>
    </v-btn>

    <!-- ============ SIDEBAR ============ -->
    <Transition name="fade">
      <div v-if="sidebarOpen && isMobile" class="sidebar-backdrop" @click="sidebarOpen = false" />
    </Transition>

    <Transition name="slide">
      <div v-show="sidebarOpen" class="map-sidebar">

        <!-- Mini dashboard -->
        <div class="sidebar-section">
          <p class="sidebar-title">
            <v-icon size="20" color="green-darken-2" class="mr-1">mdi-leaf</v-icon>
            Mapa de Podas
          </p>
          <div class="stats-grid">
            <div class="stat-card" style="--accent:#4CAF50" @click="activeFilter = 'ALL'">
              <div class="stat-number">{{ treeCount }}</div>
              <div class="stat-label">Total</div>
            </div>
            <div class="stat-card" style="--accent:#FF3B3B" @click="activeFilter = 'DANGER'">
              <div class="stat-number">{{ dangerCount }}</div>
              <div class="stat-label">Risco ⚡</div>
            </div>
            <div class="stat-card" style="--accent:#FF9800" @click="activeFilter = 'TO_PRUNE'">
              <div class="stat-number">{{ statusCounts['TO_PRUNE'] || 0 }}</div>
              <div class="stat-label">Podar ✂️</div>
            </div>
            <div class="stat-card" style="--accent:#9C27B0" @click="activeFilter = 'ALL'">
              <div class="stat-number">{{ markedCount }}</div>
              <div class="stat-label">Marcações</div>
            </div>
          </div>
        </div>

        <v-divider />

        <!-- Filtros -->
        <div class="sidebar-section">
          <p class="sidebar-subtitle">Filtrar por status</p>
          <div class="filter-chips">
            <v-chip
              size="small"
              :variant="activeFilter === 'ALL' ? 'flat' : 'outlined'"
              :color="activeFilter === 'ALL' ? 'green' : 'grey'"
              @click="activeFilter = 'ALL'"
              class="mr-1 mb-1"
            >
              Todos
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
              {{ cfg.emoji }} {{ cfg.label }}
            </v-chip>
          </div>
        </div>

        <v-divider />

        <!-- Botão Atualizar -->
        <div class="sidebar-section">
          <v-btn block size="small" variant="tonal" color="green" prepend-icon="mdi-refresh" :loading="loadingTrees" @click="refreshData">
            Atualizar Árvores
          </v-btn>
          <v-progress-linear v-if="loadingTrees" indeterminate color="green" class="mt-2" />
        </div>

        <v-divider />

        <!-- Lista de árvores -->
        <div class="sidebar-section tree-list-section">
          <p class="sidebar-subtitle">
            🌳 Árvores ({{ filteredTrees.length }})
          </p>

          <div v-if="filteredTrees.length === 0" class="text-caption text-center text-grey pa-4">
            Nenhuma árvore encontrada
          </div>

          <div class="tree-list-scroll">
            <div
              v-for="tree in filteredTrees"
              :key="tree.id"
              class="tree-list-item"
              :class="{ 'tree-list-item--danger': tree.nearPowerLine, 'tree-list-item--active': selectedTree?.id === tree.id }"
              @click="flyToTree(tree); openAiDrawer(tree)"
            >
              <div class="tree-list-icon" :style="{ background: tree.nearPowerLine ? '#FF3B3B' : (STATUS_CONFIG[tree.status]?.bg || '#4CAF50') }">
                {{ tree.nearPowerLine ? '⚠️' : (STATUS_CONFIG[tree.status]?.emoji || '🌳') }}
              </div>
              <div class="tree-list-info">
                <div class="tree-list-name">{{ tree.speciesName }}</div>
                <div class="tree-list-meta">
                  {{ (STATUS_CONFIG[tree.status]?.label || tree.status) }}
                  <span v-if="tree.nearPowerLine" style="color:#D32F2F;"> · ⚡ Fiação</span>
                </div>
              </div>
              <v-icon size="16" color="grey">mdi-chevron-right</v-icon>
            </div>
          </div>
        </div>

        <!-- Marcações -->
        <template v-if="markedLocations.length > 0">
          <v-divider />
          <div class="sidebar-section">
            <p class="sidebar-subtitle">📌 Marcações</p>
            <div
              v-for="loc in markedLocations"
              :key="loc.id"
              class="d-flex align-center justify-space-between py-1"
            >
              <span class="text-caption text-truncate" style="max-width:180px">{{ loc.notes || 'Sem nota' }}</span>
              <v-btn icon size="x-small" variant="text" color="red" @click="removeMarkedLocation(loc.id)">
                <v-icon size="14">mdi-close</v-icon>
              </v-btn>
            </div>
          </div>
        </template>

        <!-- Legenda -->
        <v-divider />
        <div class="sidebar-section">
          <p class="sidebar-subtitle">Legenda</p>
          <div v-for="(cfg, key) in STATUS_CONFIG" :key="key" class="legend-row">
            <span class="legend-dot" :style="{ background: cfg.bg }" />
            <span class="text-caption">{{ cfg.emoji }} {{ cfg.label }}</span>
          </div>
          <div class="legend-row">
            <span class="legend-line" />
            <span class="text-caption">⚡ Rede elétrica</span>
          </div>
          <div class="legend-row">
            <span class="legend-dot" style="background:linear-gradient(135deg,#1565C0,#42A5F5)" />
            <span class="text-caption">📍 Sua posição</span>
          </div>

          <v-divider class="my-2" />
          <p class="text-caption font-weight-bold mb-1">Qualidade do Solo (Grids)</p>
          <div class="legend-row">
            <span class="legend-dot" style="background:#22c55e" />
            <span class="text-caption">🌱 Solo bom</span>
          </div>
          <div class="legend-row">
            <span class="legend-dot" style="background:#f59e0b" />
            <span class="text-caption">🌱 Solo regular</span>
          </div>
          <div class="legend-row">
            <span class="legend-dot" style="background:#ef4444" />
            <span class="text-caption">🌱 Solo ruim</span>
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
      <div class="ai-drawer-body">
        <!-- Loading -->
        <div v-if="loadingAiData" class="ai-drawer-loading">
          <v-progress-circular indeterminate color="deep-purple" size="48" width="4" />
          <p class="mt-4 text-body-2 text-grey-darken-1">Carregando análise de IA...</p>
        </div>

        <!-- Dados da IA -->
        <TreeAiStats v-else-if="aiTreeData" :data="aiTreeData" />

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
  top: 70px;
  right: 14px;
  z-index: 1001;
  display: flex;
  flex-direction: column;
}

/* ============ SIDEBAR ============ */
.sidebar-toggle-btn {
  position: absolute;
  top: 14px;
  z-index: 1002;
  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.map-sidebar {
  position: absolute;
  top: 14px;
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
  transition: background 0.15s;
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
  }

  .top-search-bar {
    top: 8px;
    width: calc(100% - 70px);
    max-width: none;
    left: 8px;
    transform: none;
  }

  .floating-actions-right {
    top: 60px;
    right: 8px;
  }

  .sidebar-toggle-btn {
    top: 8px;
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
