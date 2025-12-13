<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref, computed, inject } from 'vue'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'

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

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

export default defineComponent({
  name: 'PruningMap',
  props: {
    tasks: {
      type: Array as () => CityTreeLocation[],
      required: true,
      default: () => [],
    },
  },
  setup(props) {
    const $api = inject('$api') as {
      get: (url: string, config?: Record<string, unknown>) => Promise<{ data: unknown }>
    }

    let map: L.Map | null = null
    let markersLayer: L.LayerGroup | null = null
    let userLayer: L.LayerGroup | null = null
    let markedLayer: L.LayerGroup | null = null
    let powerLinesLayer: L.LayerGroup | null = null

    let userMarker: L.Marker | null = null
    let userAccuracyCircle: L.Circle | null = null
    let watchId: number | null = null
    let fetchTimeout: number | null = null

    const following = ref(true)
    const markMode = ref(false)
    const locationStatus = ref<'idle' | 'requesting' | 'found' | 'denied' | 'error'>('idle')
    const isExpanded = ref(false)

    const cityTrees = ref<CityTreeLocation[]>([])
    const markedLocations = ref<MarkedLocation[]>([])
    const loadingTrees = ref(false)

    const treeCount = computed(() => cityTrees.value.length)
    const crowdedTreeCount = computed(() => cityTrees.value.filter((t) => t.near_trees).length)
    const markedCount = computed(() => markedLocations.value.length)

    const POWER_LINE_THRESHOLD = 4

    const powerLines = ref<PowerLine[]>([
      {
        id: 'line-1',
        path: [
          [-23.5508, -46.6336],
          [-23.5515, -46.6324],
          [-23.5522, -46.6312],
        ],
      },
    ])

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

    const createMarkerIcon = (): L.DivIcon =>
      L.divIcon({
        html: `<div style="background:#9C27B0;border-radius:50%;width:100%;height:100%;display:flex;align-items:center;justify-content:center;">📌</div>`,
        iconSize: [45, 45],
        iconAnchor: [22, 45],
      })

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

    const distancePointToSegment = (p: L.LatLng, a: L.LatLng, b: L.LatLng): number => {
      const crs = map!.options.crs
      const pp = crs.project(p)
      const ap = crs.project(a)
      const bp = crs.project(b)

      const dx = bp.x - ap.x
      const dy = bp.y - ap.y
      const t = ((pp.x - ap.x) * dx + (pp.y - ap.y) * dy) / (dx * dx + dy * dy)
      const clamped = Math.max(0, Math.min(1, t))

      const closest = L.point(ap.x + clamped * dx, ap.y + clamped * dy)
      return pp.distanceTo(closest)
    }

    const checkTreesNearPowerLines = () => {
      if (!map) return
      cityTrees.value.forEach((tree) => {
        tree.near_trees = false
        const point = L.latLng(tree.latitude, tree.longitude)

        powerLines.value.forEach((line) => {
          for (let i = 0; i < line.path.length - 1; i++) {
            const start = L.latLng(line.path[i])
            const end = L.latLng(line.path[i + 1])
            if (distancePointToSegment(point, start, end) < POWER_LINE_THRESHOLD) {
              tree.near_trees = true
              return
            }
          }
        })
      })
    }

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

    const initializeMap = () => {
      map = L.map('map-container').setView([-23.5505, -46.6333], 15)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)

      markersLayer = L.layerGroup().addTo(map)
      markedLayer = L.layerGroup().addTo(map)
      userLayer = L.layerGroup().addTo(map)
      powerLinesLayer = L.layerGroup().addTo(map)

      powerLines.value.forEach((l) =>
        L.polyline(l.path, { color: '#ff0000', dashArray: '5,5', weight: 3 }).addTo(
          powerLinesLayer!,
        ),
      )

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

    onMounted(() => initializeMap())
    onUnmounted(() => map?.remove())

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
    <div id="map-container"></div>

    <div class="map-overlay-panel">
      <button @click="doLocate">📍 Localizar</button>
      <button @click="toggleMarkMode">📌 Marcar</button>

      <div v-if="loadingTrees">Carregando...</div>
      <div v-else>
        <div><b>Árvores:</b> {{ treeCount }}</div>
        <div><b>⚠️ Risco por fiação:</b> {{ crowdedTreeCount }}</div>
        <div><b>📌 Marcações:</b> {{ markedCount }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-wrapper {
  height: 100vh;
  position: relative;
}
#map-container {
  height: 100%;
}
.map-overlay-panel {
  position: absolute;
  top: 12px;
  left: 12px;
  background: white;
  padding: 12px;
  border-radius: 8px;
  z-index: 1000;
}
@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}
</style>
