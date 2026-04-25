<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { apiConnect } from '@/plugins/apiConnect'

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
}

interface TreeOnMap {
  id: string
  latitude: number
  longitude: number
  status: string
  speciesName: string
  nearPowerLine: boolean
}

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

const SIMULATED_POWER_LINES: [number, number][][] = [
  [[-3.7327, -38.5270], [-3.7335, -38.5255], [-3.7342, -38.5240], [-3.7350, -38.5225]],
  [[-3.7310, -38.5280], [-3.7320, -38.5260], [-3.7330, -38.5245]],
]

const PRESENTATION_SPECIES = [
  'Mangueira', 'Ipê Amarelo', 'Oiti', 'Castanhola', 'Palmeira Imperial', 'Flamboyant'
]

/* ===================================
   COMPONENTE
=================================== */

export default defineComponent({
  name: 'MiniMap',

  props: {
    filterStatus: {
      type: String,
      default: 'ALL',
    },
  },

  emits: ['tree-count', 'danger-count'],

  setup(props, { emit }) {
    let map: L.Map | null = null
    let treeClusterGroup: L.MarkerClusterGroup | null = null
    let powerLinesLayer: L.LayerGroup | null = null
    let refreshInterval: ReturnType<typeof setInterval> | null = null

    const trees = ref<TreeOnMap[]>([])
    const loadingTrees = ref(false)
    const containerReady = ref(false)

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
          if (distancePointToSegment(lat, lng, segA[0], segA[1], segB[0], segB[1]) < POWER_LINE_DISTANCE_METERS) return true
        }
      }
      return false
    }

    const STATUS_CONFIG: Record<string, { emoji: string; color: string; label: string }> = {
      NORMAL: { emoji: '🌳', color: '#4CAF50', label: 'Normal' },
      TO_PRUNE: { emoji: '✂️', color: '#FF9800', label: 'Para Podar' },
      UNDER_OBSERVATION: { emoji: '👁️', color: '#FFC107', label: 'Observação' },
      PRUNED: { emoji: '🌿', color: '#66BB6A', label: 'Podada' },
      CRITICAL: { emoji: '💣', color: '#D32F2F', label: 'RISCO CRÍTICO' },
    }

    const getCfg = (status: string, danger: boolean): { emoji: string; color: string; label: string } => {
      if (status === 'CRITICAL') return STATUS_CONFIG.CRITICAL!
      if (danger) return { emoji: '⚠️', color: '#FF3B3B', label: 'Risco Fiação' }
      return (STATUS_CONFIG[status] ?? STATUS_CONFIG.NORMAL)!
    }

    const createTreeIcon = (status: string, danger: boolean): L.DivIcon => {
      const cfg = getCfg(status, danger)
      return L.divIcon({
        html: `<div style="
          background:${cfg.color};border:2px solid #fff;border-radius:50%;
          width:100%;height:100%;display:flex;align-items:center;justify-content:center;
          font-size:${(danger || status === 'CRITICAL') ? '14' : '12'}px;box-shadow:0 2px 6px rgba(0,0,0,0.3);
          ${(danger || status === 'CRITICAL') ? 'animation:pulse 1.2s infinite;' : ''}
        ">${cfg.emoji}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        className: 'mini-map-icon',
      })
    }

    const fetchTrees = async () => {
      loadingTrees.value = true
      try {
        const res = await apiConnect.get<ApiTree[]>('/trees')
        const apiTrees = res.data || []
        const parsedTrees: TreeOnMap[] = apiTrees
          .filter((t: ApiTree) => t.latitude != null && t.longitude != null)
          .map((t: ApiTree) => ({
            id: t.id,
            latitude: Number(t.latitude),
            longitude: Number(t.longitude),
            status: t.status || 'NORMAL',
            speciesName: t.species?.commonName || 'Espécie desconhecida',
            nearPowerLine: checkNearPowerLine(Number(t.latitude), Number(t.longitude)),
          }))

        // SE TIVER POUCAS ÁRVORES, GERA SIMULADAS PARA APRESENTAÇÃO
        if (parsedTrees.length < 30) {
          const extraCount = 50 - parsedTrees.length
          for (let i = 0; i < extraCount; i++) {
            const lat = DEFAULT_LAT + (Math.random() - 0.5) * 0.02
            const lng = DEFAULT_LNG + (Math.random() - 0.5) * 0.02
            const statusRoll = Math.random()
            const status = statusRoll > 0.8 ? 'TO_PRUNE' : statusRoll > 0.6 ? 'UNDER_OBSERVATION' : 'NORMAL'
            
            parsedTrees.push({
              id: `sim-${i}`,
              latitude: lat,
              longitude: lng,
              status: status,
              speciesName: PRESENTATION_SPECIES[Math.floor(Math.random() * PRESENTATION_SPECIES.length)] as string,
              nearPowerLine: checkNearPowerLine(lat, lng)
            })
          }
        }

        trees.value = parsedTrees
        const dangerCount = trees.value.filter(t => t.nearPowerLine).length
        emit('tree-count', trees.value.length)
        emit('danger-count', dangerCount)
      } catch (err) {
        console.error('Erro ao buscar árvores:', err)
        trees.value = []
      } finally {
        loadingTrees.value = false
      }
    }

    const renderTrees = () => {
      if (!treeClusterGroup || !map) return
      treeClusterGroup.clearLayers()
      const bounds = L.latLngBounds([])

      const filtered = props.filterStatus === 'ALL'
        ? trees.value
        : props.filterStatus === 'DANGER'
          ? trees.value.filter(t => t.nearPowerLine)
          : trees.value.filter(t => t.status === props.filterStatus)

      filtered.forEach((t) => {
        if (isNaN(t.latitude) || isNaN(t.longitude)) return
        const icon = createTreeIcon(t.status, t.nearPowerLine)
        const marker = L.marker([t.latitude, t.longitude], { icon })
        const cfg = getCfg(t.status, t.nearPowerLine)

        marker.bindPopup(`
          <div id="popup-${t.id}" style="min-width:180px;font-family:system-ui,sans-serif;font-size:12px;">
            <div style="background:${cfg.color};color:#fff;padding:8px 10px;border-radius:8px 8px 0 0;margin:-16px -16px 8px -16px;">
              <div style="font-size:14px;font-weight:700;">${cfg.emoji} ${t.speciesName}</div>
            </div>
            <div style="padding:0 2px 4px;">
              <p style="margin:3px 0;"><b>Status:</b> ${cfg.label || t.status}</p>
              <p style="margin:3px 0;"><b>Fiação:</b> ${t.nearPowerLine ? '<span style="color:#D32F2F;font-weight:700;">PRÓXIMO ⚠️</span>' : '<span style="color:#4CAF50">Seguro</span>'}</p>
            </div>
          </div>
        `, { maxWidth: 220 })

        treeClusterGroup!.addLayer(marker)
        bounds.extend([t.latitude, t.longitude])
      })

      // SE HOUVER ÁRVORES MUITO DISTANTES, AJUSTA O ZOOM AUTOMATICAMENTE
      if (filtered.length > 0 && props.filterStatus !== 'ALL') {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
      }
    }

    const drawPowerLines = () => {
      if (!powerLinesLayer) return
      powerLinesLayer.clearLayers()
      SIMULATED_POWER_LINES.forEach((line) => {
        const polyline = L.polyline(line, { color: '#E53935', weight: 3, dashArray: '8, 6', opacity: 0.7 })
        powerLinesLayer!.addLayer(polyline)
      })
    }

    const refreshData = async () => {
      await fetchTrees()
      renderTrees()
    }

    const focusOn = (lat: number, lng: number) => {
      if (!map) return
      map.setView([lat, lng], 18, { animate: true, duration: 1 })
      
      // Tenta encontrar o marcador para abrir o popup
      if (treeClusterGroup) {
        treeClusterGroup.eachLayer((layer: any) => {
          if (layer instanceof L.Marker) {
            const pos = layer.getLatLng()
            if (Math.abs(pos.lat - lat) < 0.0001 && Math.abs(pos.lng - lng) < 0.0001) {
              layer.openPopup()
            }
          }
        })
      }
    }

    watch(() => props.filterStatus, () => renderTrees())

    const initMap = () => {
      if (!document.getElementById('mini-map-container')) return

      map = L.map('mini-map-container', {
        zoomControl: true,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: true,
      }).setView([DEFAULT_LAT, DEFAULT_LNG], DEFAULT_ZOOM)

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map)

      treeClusterGroup = L.markerClusterGroup({
        maxClusterRadius: 30,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        disableClusteringAtZoom: 17,
        iconCreateFunction: (cluster: L.MarkerCluster) => {
          const count = cluster.getChildCount()
          return L.divIcon({
            html: `<div style="
              background:linear-gradient(135deg,#1B5E20,#4CAF50);
              color:#fff;font-weight:800;font-size:12px;
              border-radius:50%;width:100%;height:100%;
              display:flex;align-items:center;justify-content:center;
              box-shadow:0 4px 12px rgba(0,0,0,0.4);
              border:2px solid rgba(255,255,255,0.9);
            ">${count}</div>`,
            className: 'mini-map-cluster',
            iconSize: [35, 35],
          })
        },
      })
      map.addLayer(treeClusterGroup)

      powerLinesLayer = L.layerGroup().addTo(map)
      drawPowerLines()

      containerReady.value = true
      fetchTrees().then(() => renderTrees())
      refreshInterval = setInterval(refreshData, 60000)
    }

    onMounted(() => {
      nextTick(() => initMap())
    })

    onUnmounted(() => {
      if (refreshInterval) clearInterval(refreshInterval)
      map?.remove()
    })

    return { trees, loadingTrees, containerReady, focusOn }
  },
})
</script>

<template>
  <div class="mini-map-wrapper">
    <div id="mini-map-container" class="mini-map-container" />
    <div v-if="loadingTrees" class="mini-map-loading">
      <v-progress-circular indeterminate color="primary" size="24" width="2" />
    </div>
  </div>
</template>

<style scoped>
.mini-map-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 200px;
  border-radius: 8px;
  overflow: hidden;
}

.mini-map-container {
  width: 100%;
  height: 100%;
}

.mini-map-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
  z-index: 1000;
}

:deep(.mini-map-icon),
:deep(.mini-map-cluster) {
  background: none !important;
  border: none !important;
}

:deep(.leaflet-control-zoom) {
  border: none !important;
  box-shadow: 0 1px 4px rgba(0,0,0,0.15) !important;
  border-radius: 6px !important;
}

:deep(.leaflet-control-zoom a) {
  border-radius: 0 !important;
}

:deep(.leaflet-control-zoom a:first-child) {
  border-radius: 6px 6px 0 0 !important;
}

:deep(.leaflet-control-zoom a:last-child) {
  border-radius: 0 0 6px 6px !important;
}

@keyframes pulse {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,59,59,0.6); }
  50% { transform: scale(1.1); box-shadow: 0 0 10px 4px rgba(255,59,59,0.25); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,59,59,0); }
}
</style>
