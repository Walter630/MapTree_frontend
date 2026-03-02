<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref, computed, inject } from 'vue'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/* ===================================
   TIPOS
=================================== */

interface CityTreeLocation {
  id?: string
  age: Date
  latitude: number
  longitude: number
  status: string
  near_trees?: boolean
}

interface MarkedLocation {
  id: string
  lat: number
  lng: number
  notes: string
  timestamp: Date
}

interface PowerLine {
  id: string
  path: [number, number][]
}

/* ===================================
   CORREÇÃO DO ÍCONE PADRÃO LEAFLET
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

const POWER_LINE_THRESHOLD = 4

const MOCK_POWER_LINES: PowerLine[] = [
  {
    id: 'line-1',
    path: [
      [-23.5508, -46.6336],
      [-23.5515, -46.6324],
      [-23.5522, -46.6312],
    ],
  },
]

/* ===================================
   COMPONENTE
=================================== */

export default defineComponent({
  name: 'PruningMap',

  props: {
    tasks: {
      type: Array as () => CityTreeLocation[],
      required: false,
      default: () => [],
    },
  },

  setup(props) {
    const $api = inject('$api') as {
      get: (url: string, config?: Record<string, unknown>) => Promise<{ data: unknown }>
    }

    /* ---------- Referências do Mapa ---------- */

    let map: L.Map | null = null
    let markersLayer: L.LayerGroup | null = null
    let _userLayer: L.LayerGroup | null = null
    let _markedLayer: L.LayerGroup | null = null
    let powerLinesLayer: L.LayerGroup | null = null

    /* ---------- Estado Reativo ---------- */

    const markMode = ref(false)
    const locationStatus = ref<'idle' | 'requesting' | 'found' | 'denied' | 'error'>('idle')
    const isExpanded = ref(false)
    const cityTrees = ref<CityTreeLocation[]>([])
    const markedLocations = ref<MarkedLocation[]>([])
    const loadingTrees = ref(false)
    const powerLines = ref<PowerLine[]>(MOCK_POWER_LINES)

    /* ---------- Computed ---------- */

    const treeCount = computed(() => cityTrees.value.length)
    const crowdedTreeCount = computed(() => cityTrees.value.filter((t) => t.near_trees).length)
    const markedCount = computed(() => markedLocations.value.length)

    /* ---------- Ícones ---------- */

    const createTreeIcon = (status: string, danger = false): L.DivIcon => {
      let bg = '#4CAF50'
      let border = '#2E7D32'

      if (status === 'TO_PRUNE') {
        bg = '#FFC107'
        border = '#F57F17'
      }

      if (danger) {
        bg = '#FF3B3B'
        border = '#B00000'
      }

      return L.divIcon({
        html: `
          <div style="
            background:${bg};
            border:3px solid ${border};
            border-radius:50%;
            width:100%;
            height:100%;
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:16px;
            animation:${danger ? 'pulse 1.5s infinite' : 'none'};
          ">🌳</div>
        `,
        iconSize: [danger ? 50 : 40, danger ? 50 : 40],
        iconAnchor: [danger ? 25 : 20, danger ? 50 : 40],
        className: 'tree-marker',
      })
    }

    /* ---------- API ---------- */

    const fetchTreesFromApi = async (
      minLat: number,
      minLng: number,
      maxLat: number,
      maxLng: number,
    ) => {
      try {
        const res = await $api.get('/trees', { params: { minLat, minLng, maxLat, maxLng } })
        return (res.data as CityTreeLocation[]).map((t) => ({
          ...t,
          latitude: Number(t.latitude),
          longitude: Number(t.longitude),
        }))
      } catch {
        return []
      }
    }

    /* ---------- Cálculos Geométricos ---------- */

    const distancePointToSegment = (p: L.LatLng, a: L.LatLng, b: L.LatLng): number => {
      const crs = map!.options.crs!
      const pp = crs.project(p)
      const ap = crs.project(a)
      const bp = crs.project(b)

      const dx = bp.x - ap.x
      const dy = bp.y - ap.y
      const t = Math.max(0, Math.min(1, ((pp.x - ap.x) * dx + (pp.y - ap.y) * dy) / (dx * dx + dy * dy)))

      const closest = L.point(ap.x + t * dx, ap.y + t * dy)
      return pp.distanceTo(closest)
    }

    const checkTreesNearPowerLines = () => {
      if (!map) return
      cityTrees.value.forEach((tree) => {
        tree.near_trees = false
        const point = L.latLng(tree.latitude, tree.longitude)

        powerLines.value.forEach((line) => {
          for (let i = 0; i < line.path.length - 1; i++) {
            const start = L.latLng(line.path[i]!)
            const end = L.latLng(line.path[i + 1]!)
            if (distancePointToSegment(point, start, end) < POWER_LINE_THRESHOLD) {
              tree.near_trees = true
              return
            }
          }
        })
      })
    }

    /* ---------- Renderização ---------- */

    const drawRoute = (trees: CityTreeLocation[]) => {
      markersLayer?.clearLayers()
      trees.forEach((t) => {
        const marker = L.marker([t.latitude, t.longitude], {
          icon: createTreeIcon(t.status, t.near_trees),
        })
        marker.bindPopup(`
          <b>Árvore:</b> ${t.id}<br/>
          <b>Risco por fiação:</b> ${t.near_trees ? 'Sim ⚠️' : 'Não'}
        `)
        markersLayer?.addLayer(marker)
      })
    }

    const fetchVisibleData = async () => {
      if (!map) return
      loadingTrees.value = true

      const b = map.getBounds()
      const apiTrees = await fetchTreesFromApi(
        b.getSouthWest().lat,
        b.getSouthWest().lng,
        b.getNorthEast().lat,
        b.getNorthEast().lng,
      )

      cityTrees.value = [...props.tasks, ...apiTrees]
      checkTreesNearPowerLines()
      drawRoute(cityTrees.value)
      loadingTrees.value = false
    }

    /* ---------- Inicialização do Mapa ---------- */

    const initializeMap = () => {
      map = L.map('map-container').setView([-23.5505, -46.6333], 15)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map)

      markersLayer = L.layerGroup().addTo(map)
      _markedLayer = L.layerGroup().addTo(map)
      _userLayer = L.layerGroup().addTo(map)
      powerLinesLayer = L.layerGroup().addTo(map)

      // Desenha linhas de fiação
      powerLines.value.forEach((l) =>
        L.polyline(l.path, { color: '#ff0000', dashArray: '5,5', weight: 3 }).addTo(powerLinesLayer!),
      )

      // Eventos do mapa
      map.on('moveend', fetchVisibleData)
      map.on('click', (ev) => {
        if (!markMode.value) return
        const notes = prompt('Nota da marcação')
        if (!notes) return
        markedLocations.value.push({
          id: String(Date.now()),
          lat: ev.latlng.lat,
          lng: ev.latlng.lng,
          notes,
          timestamp: new Date(),
        })
      })

      fetchVisibleData()
    }

    /* ---------- Lifecycle ---------- */

    onMounted(() => initializeMap())
    onUnmounted(() => map?.remove())

    /* ---------- Retorno ---------- */

    return {
      doLocate: () => map?.locate({ setView: true }),
      toggleMarkMode: () => (markMode.value = !markMode.value),
      treeCount,
      crowdedTreeCount,
      markedCount,
      loadingTrees,
      markMode,
      locationStatus,
      isExpanded,
    }
  },
})
</script>

<template>
  <div class="map-wrapper">
    <div id="map-container" />

    <!-- Painel de Controle -->
    <v-card class="map-overlay-panel" elevation="4" rounded="lg">
      <v-card-text class="pa-3">
        <!-- Botões de ação -->
        <div class="d-flex flex-column ga-2 mb-3">
          <v-btn
            size="small"
            variant="tonal"
            color="primary"
            prepend-icon="mdi-crosshairs-gps"
            @click="doLocate"
          >
            Localizar
          </v-btn>
          <v-btn
            size="small"
            :variant="markMode ? 'flat' : 'tonal'"
            :color="markMode ? 'warning' : 'secondary'"
            prepend-icon="mdi-map-marker-plus"
            @click="toggleMarkMode"
          >
            {{ markMode ? 'Marcando...' : 'Marcar' }}
          </v-btn>
        </div>

        <v-divider class="mb-3" />

        <!-- Loading ou Contagens -->
        <v-progress-linear
          v-if="loadingTrees"
          indeterminate
          color="green"
          class="mb-2"
        />
        <div v-else class="text-body-2">
          <div class="d-flex align-center mb-1">
            <v-icon size="16" color="green" class="mr-1">mdi-tree</v-icon>
            <b>Árvores:</b>&nbsp;{{ treeCount }}
          </div>
          <div class="d-flex align-center mb-1">
            <v-icon size="16" color="red" class="mr-1">mdi-alert</v-icon>
            <b>Risco fiação:</b>&nbsp;{{ crowdedTreeCount }}
          </div>
          <div class="d-flex align-center">
            <v-icon size="16" color="orange" class="mr-1">mdi-map-marker</v-icon>
            <b>Marcações:</b>&nbsp;{{ markedCount }}
          </div>
        </div>

        <v-divider class="my-3" />

        <!-- Legenda -->
        <p class="text-caption font-weight-bold mb-2">Legenda</p>
        <div class="d-flex align-center mb-1">
          <span class="legend-dot" style="background: #4CAF50"></span>
          <span class="text-caption">Normal</span>
        </div>
        <div class="d-flex align-center mb-1">
          <span class="legend-dot" style="background: #FFC107"></span>
          <span class="text-caption">Para podar</span>
        </div>
        <div class="d-flex align-center mb-1">
          <span class="legend-dot" style="background: #FF3B3B"></span>
          <span class="text-caption">Risco (fiação)</span>
        </div>
        <div class="d-flex align-center">
          <span class="legend-line"></span>
          <span class="text-caption">Rede elétrica</span>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
.map-wrapper {
  height: 100%;
  position: relative;
}

#map-container {
  height: 100%;
}

.map-overlay-panel {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 1000;
  max-width: 220px;
  background: white;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 8px;
  flex-shrink: 0;
}

.legend-line {
  width: 18px;
  height: 0;
  border-top: 3px dashed #ff0000;
  margin-right: 8px;
  flex-shrink: 0;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}
</style>
