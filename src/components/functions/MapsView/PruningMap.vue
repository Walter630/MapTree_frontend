<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref, computed, nextTick, watch } from 'vue'
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
  scientificName: string
  family: string
  nearPowerLine: boolean
}

interface MarkedLocation {
  id: string
  lat: number
  lng: number
  notes: string
  timestamp: Date
  marker?: L.Marker
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

interface StatusInfo {
  label: string
  emoji: string
  color: string
  bg: string
  border: string
}

const STATUS_CONFIG: { [key: string]: StatusInfo } = {
  NORMAL:              { label: 'Normal',         emoji: '🌳', color: '#4CAF50', bg: '#4CAF50', border: '#2E7D32' },
  TO_PRUNE:            { label: 'Para Podar',     emoji: '✂️', color: '#FF9800', bg: '#FF9800', border: '#E65100' },
  UNDER_OBSERVATION:   { label: 'Observação',     emoji: '👁️', color: '#FFC107', bg: '#FFC107', border: '#F57F17' },
  PRUNED:              { label: 'Podada',          emoji: '🌿', color: '#66BB6A', bg: '#66BB6A', border: '#388E3C' },
  DANGER:              { label: 'Risco Fiação',   emoji: '⚠️', color: '#FF3B3B', bg: '#FF3B3B', border: '#B00000' },
}

const DEFAULT_STATUS: StatusInfo = { label: 'Normal', emoji: '🌳', color: '#4CAF50', bg: '#4CAF50', border: '#2E7D32' }

function getStatusCfg(status: string, danger: boolean): StatusInfo {
  if (danger) return STATUS_CONFIG['DANGER'] || DEFAULT_STATUS
  return STATUS_CONFIG[status] || DEFAULT_STATUS
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

    /* ---------- Estado Reativo ---------- */
    const trees = ref<TreeOnMap[]>([])
    const markedLocations = ref<MarkedLocation[]>([])
    const markMode = ref(false)
    const isExpanded = ref(false)
    const loadingTrees = ref(false)
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

    /* ---------- Computed ---------- */
    const filteredTrees = computed(() => {
      if (activeFilter.value === 'ALL') return trees.value
      if (activeFilter.value === 'DANGER') return trees.value.filter(t => t.nearPowerLine)
      return trees.value.filter(t => t.status === activeFilter.value)
    })

    const treeCount = computed(() => trees.value.length)
    const dangerCount = computed(() => trees.value.filter(t => t.nearPowerLine).length)
    const markedCount = computed(() => markedLocations.value.length)
    const statusCounts = computed(() => {
      const counts: Record<string, number> = { NORMAL: 0, TO_PRUNE: 0, UNDER_OBSERVATION: 0, PRUNED: 0 }
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
          background:${cfg.bg};border:3px solid ${cfg.border};border-radius:50%;
          width:100%;height:100%;display:flex;align-items:center;justify-content:center;
          font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.35);
          cursor:pointer;transition:transform .15s;
          ${danger ? 'animation:pulse 1.2s infinite;' : ''}
        ">${cfg.emoji}</div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40],
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
          if (distancePointToSegment(lat, lng, segA[0], segA[1], segB[0], segB[1]) < POWER_LINE_DISTANCE_METERS) return true
        }
      }
      return false
    }

    /* ---------- API ---------- */
    const fetchTrees = async () => {
      loadingTrees.value = true
      try {
        const res = await apiConnect.get<ApiTree[]>('/trees')
        trees.value = (res.data || [])
          .filter((t: ApiTree) => t.latitude != null && t.longitude != null)
          .map((t: ApiTree) => {
            const lat = Number(t.latitude)
            const lng = Number(t.longitude)
            return {
              id: t.id,
              latitude: lat,
              longitude: lng,
              status: t.status || 'NORMAL',
              speciesName: t.species?.commonName || 'Espécie desconhecida',
              scientificName: t.species?.scientificName || '',
              family: t.species?.family || '',
              nearPowerLine: checkNearPowerLine(lat, lng),
            }
          })
        notify(`${trees.value.length} árvore(s) carregada(s)`, 'success')
      } catch (err) {
        console.error('Erro ao buscar árvores:', err)
        trees.value = []
        notify('Erro ao carregar árvores da API', 'error')
      } finally {
        loadingTrees.value = false
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
          <div style="min-width:220px;font-family:system-ui,sans-serif;">
            <div style="background:${cfg.bg};color:#fff;padding:10px 14px;border-radius:10px 10px 0 0;margin:-20px -20px 10px -20px;">
              <div style="font-size:20px;font-weight:700;">${cfg.emoji} ${t.speciesName}</div>
              <div style="font-size:11px;opacity:.85;font-style:italic;margin-top:2px;">${t.scientificName}</div>
            </div>
            <div style="padding:0 2px 4px;">
              <p style="margin:4px 0;font-size:13px;"><b>🏷️ Família:</b> ${t.family || '—'}</p>
              <p style="margin:4px 0;font-size:13px;"><b>📊 Status:</b> ${cfg.label}</p>
              <p style="margin:4px 0;font-size:13px;"><b>⚡ Fiação:</b> ${t.nearPowerLine ? '<span style="color:#D32F2F;font-weight:700;">PRÓXIMO ⚠️</span>' : '<span style="color:#4CAF50">Seguro</span>'}</p>
              <p style="margin:4px 0;font-size:11px;color:#888;">📍 ${t.latitude.toFixed(6)}, ${t.longitude.toFixed(6)}</p>
              <p style="margin:4px 0;font-size:11px;color:#999;">🆔 ${t.id.slice(0, 12)}</p>
            </div>
          </div>
        `, { maxWidth: 280, className: 'tree-popup' })

        marker.on('click', () => { selectedTree.value = t })
        treeClusterGroup!.addLayer(marker)
      })
    }

    const drawPowerLines = () => {
      if (!powerLinesLayer) return
      powerLinesLayer.clearLayers()
      SIMULATED_POWER_LINES.forEach((line) => {
        const polyline = L.polyline(line, { color: '#E53935', weight: 4, dashArray: '10, 8', opacity: 0.85 })
        polyline.bindPopup('<div style="text-align:center;font-weight:600;">⚡ Rede Elétrica<br><span style="font-size:11px;color:#888;">(simulada)</span></div>')
        powerLinesLayer!.addLayer(polyline)
      })
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
          notify(locationError.value, 'warning')
          locating.value = false
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
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
      drawPowerLines()

      // Clique para marcação
      map.on('click', (ev: L.LeafletMouseEvent) => {
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
      STATUS_CONFIG,
    }
  },
})
</script>

<template>
  <div :class="['map-root', { 'map-expanded': isExpanded }]">

    <!-- ============ MAPA ============ -->
    <div id="pruning-map-container" />

    <!-- ============ OVERLAY LOADING LOCALIZAÇÃO ============ -->
    <Transition name="fade">
      <div v-if="locating" class="locating-overlay">
        <v-progress-circular indeterminate color="white" size="56" width="5" />
        <p class="text-white text-body-1 mt-4 font-weight-medium">Buscando sua localização…</p>
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

    <!-- ============ BOTÕES FLUTUANTES DIREITA ============ -->
    <div class="floating-actions-right">
      <v-tooltip text="Minha localização" location="left">
        <template #activator="{ props }">
          <v-btn v-bind="props" icon color="primary" :size="isMobile ? 'default' : 'large'" elevation="4" :loading="locating" @click="goToUserLocation" class="mb-2">
            <v-icon>mdi-crosshairs-gps</v-icon>
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
    </div>

    <!-- ============ BOTÃO TOGGLE SIDEBAR ============ -->
    <v-btn
      class="sidebar-toggle-btn"
      icon
      size="small"
      elevation="4"
      color="white"
      :style="{ left: sidebarOpen ? '305px' : '12px' }"
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
              @click="flyToTree(tree)"
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
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
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

.search-input {
  box-shadow: 0 2px 12px rgba(0,0,0,0.15) !important;
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
  top: 0;
  left: 0;
  z-index: 1001;
  width: 300px;
  height: 100%;
  background: rgba(255, 255, 255, 0.97);
  backdrop-filter: blur(12px);
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
  overflow-x: hidden;
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

:deep(.tree-popup .leaflet-popup-content-wrapper) {
  border-radius: 12px;
  padding: 0;
  overflow: hidden;
}

:deep(.tree-popup .leaflet-popup-content) {
  margin: 20px;
}

:deep(.leaflet-control-zoom) { border: none !important; box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important; border-radius: 8px !important; }
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
</style>
