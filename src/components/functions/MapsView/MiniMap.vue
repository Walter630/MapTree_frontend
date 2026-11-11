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
import { buildTreePopup, TREE_TONE_COLORS, type TreeTone } from '@/utils/treePopup'

interface DashboardTree {
  id: string
  latitude?: number
  longitude?: number
  lat?: number
  lng?: number
  status: string
  species?: { commonName?: string; scientificName?: string }
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
    const latitude = tree.latitude ?? tree.lat!
    const longitude = tree.longitude ?? tree.lng!
    // O mesmo tom define a cor do marcador e a do cartão do popup.
    const tone: TreeTone =
      tree.status === 'CRITICAL' ? 'critical' : prioritySet.value.has(tree.id) ? 'priority' : 'normal'
    const color = TREE_TONE_COLORS[tone]
    const marker = L.marker([latitude, longitude], {
      title: name,
      alt: name,
      icon: L.divIcon({
        html: `<span style="display:grid;place-items:center;width:28px;height:28px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 2px 5px #0003">${speciesIcon(name)}</span>`,
        iconSize: [28, 28],
        className: 'dashboard-tree-marker',
      }),
    })
    marker.bindPopup(
      buildTreePopup({
        id: tree.id,
        name,
        scientificName: tree.species?.scientificName,
        icon: speciesIcon(name),
        statusLabel: statusLabels[tree.status] || tree.status,
        tone,
        latitude,
        longitude,
      }),
      { className: 'tree-info-popup', minWidth: 230, maxWidth: 270 },
    )
    // O Leaflet rotula o botão de fechar em inglês; ajusta para o idioma da interface.
    marker.on('popupopen', (event: L.PopupEvent) => {
      event.popup
        .getElement()
        ?.querySelector('.leaflet-popup-close-button')
        ?.setAttribute('aria-label', 'Fechar')
    })
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
// Os painéis passam `priorityIds` como um array novo a cada render (ex.: após o clique
// num marcador mudar a seleção). Comparar por referência redesenhava o mapa, fechava o
// popup recém-aberto e reenquadrava a visão. A assinatura muda apenas quando o conteúdo
// desenhado muda.
const renderSignature = computed(
  () =>
    `${mode.value}|` +
    displayedTrees.value
      .map(
        (tree) =>
          `${tree.id}:${tree.latitude ?? tree.lat}:${tree.longitude ?? tree.lng}:${tree.status}:` +
          `${prioritySet.value.has(tree.id) ? 1 : 0}:${tree.species?.commonName ?? ''}:` +
          `${tree.species?.scientificName ?? ''}`,
      )
      .join('|'),
)
watch(renderSignature, render)
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

/* ===== Popup da árvore: cartão em 3 faixas (identificação, situação, ação) ===== */
:deep(.tree-info-popup .leaflet-popup-content-wrapper) {
  padding: 0;
  overflow: hidden;
  border-radius: 14px;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.22);
}
:deep(.tree-info-popup .leaflet-popup-content) {
  margin: 0;
  line-height: 1.35;
}
:deep(.tree-info-popup .leaflet-popup-tip) {
  box-shadow: 0 6px 12px rgba(15, 23, 42, 0.16);
}
:deep(.tree-info-popup a.leaflet-popup-close-button) {
  top: 10px;
  right: 10px;
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 8px;
  font: 22px/26px system-ui, sans-serif;
  color: #475569;
}
:deep(.tree-info-popup a.leaflet-popup-close-button:hover) {
  background: rgba(15, 23, 42, 0.08);
  color: #0f172a;
}
:deep(.tree-info-popup a.leaflet-popup-close-button:focus-visible) {
  outline: 2px solid #183f2b;
  outline-offset: 1px;
}

:deep(.tip) {
  --tip-accent: #347451;
  --tip-tint: #f0f6f2;
  --tip-line: #d5e6dc;
  --tip-chip-bg: #e3f0e8;
  --tip-chip-fg: #1f5237;
  color: #0f172a;
}
:deep(.tip[data-tone='priority']) {
  --tip-accent: #b66b20;
  --tip-tint: #fcf5ec;
  --tip-line: #f0dfc8;
  --tip-chip-bg: #fbebd6;
  --tip-chip-fg: #7a4310;
}
:deep(.tip[data-tone='critical']) {
  --tip-accent: #b93d43;
  --tip-tint: #fbf1f1;
  --tip-line: #f0d5d6;
  --tip-chip-bg: #fbe7e8;
  --tip-chip-fg: #8a2a2f;
}

/* Faixa 1: identificação (o espaço à direita evita o botão de fechar) */
:deep(.tip-head) {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 44px 12px 14px;
  background: var(--tip-tint);
  border-bottom: 1px solid var(--tip-line);
  border-left: 4px solid var(--tip-accent);
}
:deep(.tip-avatar) {
  flex: none;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  font-size: 20px;
  background: #fff;
  border: 2px solid var(--tip-accent);
  border-radius: 50%;
}
:deep(.tip-identity) {
  min-width: 0;
}
:deep(.tip-name) {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.25;
  overflow-wrap: anywhere;
}
:deep(.tip-sci) {
  margin: 1px 0 0;
  font-size: 12px;
  font-style: italic;
  color: #475569;
}
:deep(.tip-code) {
  margin: 3px 0 0;
  font-size: 11px;
  letter-spacing: 0.02em;
  color: #475569;
  font-variant-numeric: tabular-nums;
}

/* Faixa 2: situação e localização, uma linha rotulada para cada */
:deep(.tip-rows) {
  margin: 0;
  padding: 4px 14px 4px 18px;
}
:deep(.tip-row) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 0;
}
:deep(.tip-row + .tip-row) {
  border-top: 1px solid #eef2f0;
}
:deep(.tip-row dt) {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #475569;
}
:deep(.tip-row dd) {
  margin: 0;
  text-align: right;
  font-size: 13px;
}
:deep(.tip-chip) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--tip-chip-fg);
  background: var(--tip-chip-bg);
  border-radius: 999px;
}
:deep(.tip-dot) {
  width: 8px;
  height: 8px;
  background: var(--tip-accent);
  border-radius: 50%;
}
:deep(.tip-coords) {
  color: #1e293b;
  font-variant-numeric: tabular-nums;
}

/* Faixa 3: ação */
:deep(.tip-action) {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 44px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 600;
  color: #1f5237;
  text-decoration: none;
  background: #f7faf8;
  border-top: 1px solid #e5ece7;
}
:deep(.tip-action:hover) {
  background: #eaf3ed;
  text-decoration: underline;
}
:deep(.tip-action:focus-visible) {
  outline: 2px solid #183f2b;
  outline-offset: -3px;
}
</style>
