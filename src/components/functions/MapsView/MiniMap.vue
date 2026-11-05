<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import * as L from 'leaflet'
import { HeatLayer } from 'leaflet.heat'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { speciesIcon } from '@/utils/speciesDisplay'
import { buildTreeDensityCells, isValidGeoPoint } from '@/utils/treeDensity'

interface DashboardTree {
  id: string
  latitude?: number
  longitude?: number
  lat?: number
  lng?: number
  status: string
  species?: { commonName?: string }
}
const props = withDefaults(
  defineProps<{
    trees?: DashboardTree[]
    priorityIds?: string[]
    loading?: boolean
    failed?: boolean
  }>(),
  { trees: () => [], priorityIds: () => [] },
)
const emit = defineEmits<{ 'select-trees': [ids: string[]] }>()
const container = ref<HTMLElement>()
const mode = ref<'priority' | 'density'>('priority')
const validTrees = computed(() =>
  props.trees.filter((tree) =>
    isValidGeoPoint(tree.latitude ?? tree.lat, tree.longitude ?? tree.lng),
  ),
)
const prioritySet = computed(() => new Set(props.priorityIds))
const priorities = computed(() => validTrees.value.filter((tree) => prioritySet.value.has(tree.id)))
const displayedTrees = computed(() =>
  mode.value === 'priority' ? priorities.value : validTrees.value,
)
const sectors = computed(
  () =>
    buildTreeDensityCells(
      priorities.value.map((tree) => ({
        latitude: tree.latitude ?? tree.lat!,
        longitude: tree.longitude ?? tree.lng!,
      })),
      'status',
    ).length,
)
let map: L.Map | undefined
let cluster: L.MarkerClusterGroup | undefined
let heat: HeatLayer | undefined
let observer: ResizeObserver | undefined
const markers = new Map<string, L.Marker>()
const markerIds = new WeakMap<L.Marker, string>()
const statusLabels: Record<string, string> = {
  NORMAL: 'Normal',
  TO_PRUNE: 'Precisa de poda',
  CRITICAL: 'Crítico',
  UNDER_OBSERVATION: 'Em observação',
  PRUNED: 'Podada',
}

function render() {
  if (!map || !cluster) return
  cluster.clearLayers()
  markers.clear()
  if (heat && map.hasLayer(heat as unknown as L.Layer)) map.removeLayer(heat as unknown as L.Layer)
  for (const tree of displayedTrees.value) {
    const name = tree.species?.commonName || 'Espécie não identificada'
    const color =
      tree.status === 'CRITICAL'
        ? '#b93d43'
        : prioritySet.value.has(tree.id)
          ? '#b66b20'
          : '#347451'
    const marker = L.marker([tree.latitude ?? tree.lat!, tree.longitude ?? tree.lng!], {
      title: name,
      alt: name,
      icon: L.divIcon({
        html: `<span style="display:grid;place-items:center;width:28px;height:28px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 2px 5px #0003">${speciesIcon(name)}</span>`,
        iconSize: [28, 28],
        className: 'dashboard-tree-marker',
      }),
    })
    const content = document.createElement('div')
    const heading = document.createElement('strong')
    heading.textContent = name
    const status = document.createElement('p')
    status.textContent = statusLabels[tree.status] || tree.status
    content.append(heading, status)
    marker.bindPopup(content)
    marker.on('click', () => emit('select-trees', [tree.id]))
    markerIds.set(marker, tree.id)
    markers.set(tree.id, marker)
    cluster.addLayer(marker)
  }
  if (mode.value === 'density' && validTrees.value.length) {
    if (!heat)
      heat = new HeatLayer([], {
        radius: 38,
        blur: 22,
        minOpacity: 0.42,
        max: 1,
        gradient: { 0.2: '#268650', 0.5: '#cfcc43', 0.75: '#f49c32', 1: '#b62c42' },
      })
    heat.setLatLngs(
      validTrees.value.map((tree) => [tree.latitude ?? tree.lat!, tree.longitude ?? tree.lng!, 1]),
    )
    map.addLayer(heat as unknown as L.Layer)
  }
  if (displayedTrees.value.length) {
    map.fitBounds(
      L.latLngBounds(
        displayedTrees.value.map((tree) => [
          tree.latitude ?? tree.lat!,
          tree.longitude ?? tree.lng!,
        ]),
      ),
      { padding: [30, 30], maxZoom: 16, animate: false },
    )
  }
}

function focusOn(latitude: number, longitude: number) {
  if (!map || !cluster || !isValidGeoPoint(latitude, longitude)) return
  map.setView([latitude, longitude], 18)
  for (const marker of markers.values()) {
    if (marker.getLatLng().distanceTo([latitude, longitude]) < 2) {
      cluster.zoomToShowLayer(marker, () => marker.openPopup())
      break
    }
  }
}
defineExpose({ focusOn })
watch([displayedTrees, mode], render)
watch(mode, () => emit('select-trees', []))
onMounted(() => {
  if (!container.value) return
  map = L.map(container.value, { scrollWheelZoom: false, maxZoom: 19 }).setView(
    [-3.7319, -38.5267],
    13,
  )
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 19,
  }).addTo(map)
  cluster = L.markerClusterGroup({
    maxClusterRadius: 35,
    showCoverageOnHover: false,
    disableClusteringAtZoom: 17,
    iconCreateFunction: (group: L.MarkerCluster) =>
      L.divIcon({
        html: `<span style="display:grid;place-items:center;width:34px;height:34px;border:2px solid #e2ebe5;border-radius:50%;background:#476355;color:#fff;font-weight:700;font-size:12px">${group.getChildCount()}</span>`,
        className: 'dashboard-tree-marker',
        iconSize: [34, 34],
      }),
  })
  cluster.on('clusterclick', (event: L.LeafletEvent) => {
    const selectedCluster = (event as L.LeafletEvent & { layer: L.MarkerCluster }).layer
    emit(
      'select-trees',
      selectedCluster
        .getAllChildMarkers()
        .map((marker: L.Marker) => markerIds.get(marker)!)
        .filter(Boolean),
    )
  })
  map.addLayer(cluster)
  observer = new ResizeObserver(() => map?.invalidateSize({ pan: false }))
  observer.observe(container.value)
  render()
})
onUnmounted(() => {
  observer?.disconnect()
  map?.remove()
  map = undefined
})
</script>

<template>
  <div class="mini-map-wrapper">
    <div class="operation-summary">
      <strong v-if="failed">Não foi possível atualizar o inventário.</strong>
      <strong v-else-if="loading">Carregando visão operacional…</strong>
      <strong v-else-if="mode === 'priority'"
        >{{ priorities.length }} árvore(s) precisam de atenção em {{ sectors }} setor(es)</strong
      >
      <strong v-else>{{ validTrees.length }} árvore(s) com localização no inventário</strong>
      <small v-if="!failed">{{
        mode === 'priority'
          ? 'Setores de referência de 250 m · selecione um ponto ou grupo para filtrar a lista.'
          : 'A cor indica concentração. Selecione um ponto para consultar suas prioridades.'
      }}</small>
      <small v-if="!failed && !loading && priorityIds.length > priorities.length"
        >{{ priorityIds.length - priorities.length }} prioridade(s) sem localização válida
        permanecem na lista.</small
      >
      <div class="map-mode" role="group" aria-label="Visualização do mapa">
        <button type="button" :aria-pressed="mode === 'priority'" @click="mode = 'priority'">
          Prioridades
        </button>
        <button type="button" :aria-pressed="mode === 'density'" @click="mode = 'density'">
          Concentração de árvores
        </button>
      </div>
    </div>
    <div class="map-content">
      <div ref="container" class="mini-map-container" aria-label="Mapa do inventário de árvores" />
      <div v-if="!loading && !failed && !displayedTrees.length" class="map-empty" role="status">
        {{
          mode === 'priority'
            ? 'Nenhuma prioridade com localização para exibir.'
            : 'Nenhuma árvore com localização para exibir.'
        }}
      </div>
    </div>
    <div class="operation-legend">
      <template v-if="mode === 'priority'"
        ><span><i class="critical-dot" />Crítico</span
        ><span><i class="priority-dot" />Outras prioridades</span
        ><span>Grupos indicam quantidade</span></template
      >
      <template v-else
        ><span class="heat-scale" aria-hidden="true" />Menor → maior concentração</template
      >
    </div>
  </div>
</template>

<style scoped>
.mini-map-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 380px;
}
.operation-summary {
  padding: 12px 16px;
  background: #e5eee8;
  color: #264b38;
}
.operation-summary strong {
  display: block;
  font-size: 0.85rem;
}
.operation-summary small {
  display: block;
  font-size: 0.72rem;
  margin-top: 4px;
  color: #4b6255;
}
.map-mode {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 3px;
  margin-top: 10px;
  background: #d4e1d9;
  border-radius: 8px;
}
.map-mode button {
  padding: 7px 10px;
  font-size: 0.74rem;
  border-radius: 6px;
  color: #365443;
}
.map-mode button[aria-pressed='true'] {
  background: #2d6048;
  color: #fff;
}
.map-mode button:focus-visible {
  outline: 2px solid #183f2b;
  outline-offset: 2px;
}
.map-content {
  position: relative;
  min-height: 220px;
  flex: 1;
}
.mini-map-container {
  width: 100%;
  height: 100%;
  position: absolute;
  inset: 0;
}
.map-empty {
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  background: #f4f6efed;
  padding: 10px;
  font-size: 0.8rem;
  text-align: center;
  z-index: 500;
  border-radius: 8px;
}
.operation-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  padding: 8px 16px;
  background: #edf2ee;
  font-size: 0.7rem;
  color: #485c50;
}
.operation-legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.operation-legend i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.critical-dot {
  background: #b93d43;
}
.priority-dot {
  background: #b66b20;
}
.heat-scale {
  width: 70px;
  height: 7px;
  border-radius: 5px;
  background: linear-gradient(90deg, #268650, #cfcc43, #f49c32, #b62c42);
}
:deep(.dashboard-tree-marker) {
  border: 0;
  background: transparent;
}
</style>
