<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, reactive, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { apiConnect } from '@/plugins/apiConnect'
import PageHeader from '@/components/shared/PageHeader.vue'
import {
  prioritizeTrees,
  urgencyColor,
  urgencyLabel,
  type PrioritizedTree,
  type TreePriorityInput,
} from '@/utils/treePriority'
import {
  readDailyRouteSnapshot,
  saveDailyRouteSnapshot,
} from '@/utils/dailyRouteStorage'

interface Tree extends TreePriorityInput {
  id: string
  species?: { commonName?: string; scientificName?: string }
  speciesName?: string
}

interface RouteStop {
  id: string
  order: number
  tree: Tree
}

const route = useRoute()
const router = useRouter()
const isManager = computed(() => route.path.startsWith('/manager'))
const trees = ref<Tree[]>([])
const routeStops = ref<RouteStop[]>([])
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const feedback = ref('')
const filters = reactive({ date: new Date().toISOString().slice(0, 10), urgency: 'ALL', search: '' })

// Paginação da lista de árvores (10 por página)
const page = ref(1)
const perPage = 10

// Mini-mapa da rota
const routeMapEl = ref<HTMLElement | null>(null)
let routeMap: L.Map | null = null
let routeLayer: L.LayerGroup | null = null

const prioritized = computed(() => prioritizeTrees(trees.value))
const pendingTrees = computed(() => prioritized.value.filter((item) => item.needsPruning))
const filteredTrees = computed(() => {
  const search = filters.search.trim().toLowerCase()
  return pendingTrees.value.filter((item) => {
    const urgencyMatches = filters.urgency === 'ALL' || item.urgency === filters.urgency
    const tree = item.tree
    const label = tree.species?.commonName || tree.speciesName || tree.id
    const searchMatches = !search || `${label} ${tree.id} ${tree.latitude ?? tree.lat} ${tree.longitude ?? tree.lng}`.toLowerCase().includes(search)
    return urgencyMatches && searchMatches
  })
})
const selectedIds = computed(() => new Set(routeStops.value.map((stop) => stop.id)))
const selectedCount = computed(() => routeStops.value.length)

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
const totalScore = computed(() => routeStops.value.reduce((sum, stop) => sum + (prioritized.value.find((item) => item.tree.id === stop.id)?.priorityScore || 0), 0))

function treeName(item: PrioritizedTree<Tree>) {
  return item.tree.species?.commonName || item.tree.speciesName || `Árvore #${String(item.tree.id).slice(-6)}`
}

function coordinates(tree: Tree) {
  return `${Number(tree.latitude ?? tree.lat ?? 0).toFixed(5)}, ${Number(tree.longitude ?? tree.lng ?? 0).toFixed(5)}`
}

function coordinateDistanceKm(first: Tree, second: Tree): number {
  const lat1 = Number(first.latitude ?? first.lat ?? 0)
  const lng1 = Number(first.longitude ?? first.lng ?? 0)
  const lat2 = Number(second.latitude ?? second.lat ?? 0)
  const lng2 = Number(second.longitude ?? second.lng ?? 0)
  const latDistance = (lat2 - lat1) * 111
  const lngDistance = (lng2 - lng1) * 111 * Math.cos((lat1 * Math.PI) / 180)
  return Math.sqrt(latDistance ** 2 + lngDistance ** 2)
}

function routeBlock(tree: Tree): string {
  const latitude = Number(tree.latitude ?? tree.lat ?? 0)
  const longitude = Number(tree.longitude ?? tree.lng ?? 0)
  return `${Math.floor(latitude / 0.0012)}:${Math.floor(longitude / 0.0012)}`
}

function groupRoute(items: PrioritizedTree<Tree>[], limit = 20): PrioritizedTree<Tree>[] {
  const remaining = [...items]
  const ordered: PrioritizedTree<Tree>[] = []
  let current = remaining.shift()

  while (current && ordered.length < limit) {
    ordered.push(current)
    if (!remaining.length) break

    const currentBlock = routeBlock(current.tree)
    let bestIndex = 0
    let bestScore = Number.NEGATIVE_INFINITY

    remaining.forEach((candidate, index) => {
      const sameBlockBonus = routeBlock(candidate.tree) === currentBlock ? 120 : 0
      const proximityPenalty = coordinateDistanceKm(current!.tree, candidate.tree) * 24
      const candidateScore = candidate.priorityScore * 1.8 + sameBlockBonus - proximityPenalty
      if (candidateScore > bestScore) {
        bestScore = candidateScore
        bestIndex = index
      }
    })

    current = remaining.splice(bestIndex, 1)[0]
  }

  return ordered
}

function toggleTree(item: PrioritizedTree<Tree>) {
  const index = routeStops.value.findIndex((stop) => stop.id === item.tree.id)
  if (index >= 0) {
    routeStops.value.splice(index, 1)
  } else {
    routeStops.value.push({ id: item.tree.id, order: routeStops.value.length + 1, tree: item.tree })
  }
  normalizeOrder()
}

function addAllFiltered() {
  const existing = new Set(routeStops.value.map((stop) => stop.id))
  filteredTrees.value.forEach((item) => {
    if (!existing.has(item.tree.id)) routeStops.value.push({ id: item.tree.id, order: routeStops.value.length + 1, tree: item.tree })
  })
  normalizeOrder()
}

function removeStop(index: number) {
  routeStops.value.splice(index, 1)
  normalizeOrder()
}

function moveStop(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= routeStops.value.length) return
  const current = routeStops.value[index]
  const other = routeStops.value[target]
  if (!current || !other) return
  routeStops.value[index] = other
  routeStops.value[target] = current
  normalizeOrder()
}

function normalizeOrder() {
  routeStops.value.forEach((stop, index) => { stop.order = index + 1 })
}


function loadLocalRoute() {
  const saved = readDailyRouteSnapshot(filters.date)
  if (!saved) {
    routeStops.value = []
    return
  }

  const treesById = new Map(trees.value.map((tree) => [tree.id, tree]))
  routeStops.value = saved.stops
    .map((stop) => {
      const tree = treesById.get(stop.id)
      return tree ? { id: stop.id, order: stop.order, tree } : null
    })
    .filter((stop): stop is RouteStop => Boolean(stop))
  normalizeOrder()
}

async function loadTrees() {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await apiConnect.get<Tree[]>('/trees')
    trees.value = response.data || []
    loadLocalRoute()
  } catch {
    errorMessage.value = 'Não foi possível carregar as árvores. Verifique sua conexão e tente novamente.'
  } finally {
    loading.value = false
  }
}

async function saveRoute() {
  if (routeStops.value.length === 0) {
    feedback.value = 'Selecione pelo menos uma árvore para montar a rota.'
    return
  }

  saving.value = true
  feedback.value = ''
  const payload = {
    plannedDate: filters.date,
    type: 'PRUNING_ROUTE',
    status: 'PENDING',
    treeIds: routeStops.value.map((stop) => stop.id),
    stops: routeStops.value.map((stop) => ({ treeId: stop.id, order: stop.order })),
  }

  const snapshot = {
    date: filters.date,
    updatedAt: new Date().toISOString(),
    stops: routeStops.value.map((stop) => ({
      id: stop.id,
      order: stop.order,
      latitude: Number(stop.tree.latitude ?? stop.tree.lat ?? 0),
      longitude: Number(stop.tree.longitude ?? stop.tree.lng ?? 0),
      label: stop.tree.species?.commonName || stop.tree.speciesName,
      urgency: prioritizeTrees([stop.tree])[0]?.urgency || null,
    })),
  }
  saveDailyRouteSnapshot(snapshot)
  try {
    await apiConnect.post('/scheduling', payload)
    feedback.value = 'Rota confirmada no servidor e disponível no mapa.'
  } catch {
    feedback.value = 'Não foi possível confirmar a rota no servidor. A visualização do mapa está disponível neste dispositivo, mas a operação só deve ser considerada oficial após a sincronização.'
  } finally {
    saving.value = false
  }
}

function openRouteOnMap() {
  router.push({
    path: isManager.value ? '/manager/map' : '/user/mapUser',
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
  if (routeStops.value.length === 0) {
    feedback.value = 'Monte a rota (selecione árvores) antes de abrir no Google Maps.'
    return
  }

  const coords = routeStops.value
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
function ensureRouteMap() {
  if (routeMap || !routeMapEl.value) return
  routeMap = L.map(routeMapEl.value, { zoomControl: true, attributionControl: false }).setView([-5.2434, -38.1276], 13)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(routeMap)
  routeLayer = L.layerGroup().addTo(routeMap)
}

function renderRouteOnMiniMap() {
  if (!routeMap || !routeLayer) return
  routeLayer.clearLayers()

  const points: [number, number][] = routeStops.value
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

  // Linha ligando as paradas na ordem
  if (points.length > 1) {
    L.polyline(points, { color: '#1565c0', weight: 4, opacity: 0.7 }).addTo(routeLayer)
  }

  // Marcadores numerados
  points.forEach((p, index) => {
    const marker = L.divIcon({
      className: 'route-stop-pin',
      html: `<span>${index + 1}</span>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    })
    L.marker(p, { icon: marker }).addTo(routeLayer!)
  })

  routeMap.fitBounds(L.latLngBounds(points).pad(0.25))
}

watch(routeStops, () => {
  nextTick(renderRouteOnMiniMap)
}, { deep: true })

function useSuggestedRoute() {
  const suggested = groupRoute(filteredTrees.value, 20)
  routeStops.value = suggested.map((item, index) => ({ id: item.tree.id, order: index + 1, tree: item.tree }))
}

function organizeSelectedRoute() {
  const selected = routeStops.value
    .map((stop) => prioritized.value.find((item) => item.tree.id === stop.id))
    .filter((item): item is PrioritizedTree<Tree> => Boolean(item))
  const ordered = groupRoute(selected, selected.length)
  routeStops.value = ordered.map((item, index) => ({ id: item.tree.id, order: index + 1, tree: item.tree }))
}

watch(() => filters.date, () => {
  routeStops.value = []
  loadLocalRoute()
})

onMounted(async () => {
  await loadTrees()
  await nextTick()
  ensureRouteMap()
  renderRouteOnMiniMap()
})

onBeforeUnmount(() => {
  if (routeMap) {
    routeMap.remove()
    routeMap = null
    routeLayer = null
  }
})
</script>

<template>
  <v-container fluid class="page-shell py-8">
    <PageHeader
      title="Rotas diárias de poda"
      subtitle="Selecione árvores próximas, agrupe por região e revise o trajeto pelas ruas no mapa."
      :breadcrumbs="[{ text: 'Meu Painel', to: isManager ? '/manager' : '/user' }, { text: 'Rotas diárias' }]"
    />
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-6 route-page-actions">
      <div class="d-flex flex-wrap align-center ga-2">
        <v-btn variant="tonal" color="blue-darken-2" prepend-icon="mdi-map" :disabled="!routeStops.length" @click="openRouteOnMap">Ver rota no mapa</v-btn>
        <v-btn color="green-darken-2" prepend-icon="mdi-content-save" :loading="saving" @click="saveRoute">Salvar rota</v-btn>
      </div>
    </div>

    <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-4">{{ errorMessage }}</v-alert>
    <v-alert v-if="feedback" type="info" variant="tonal" closable class="mb-4">{{ feedback }}</v-alert>

    <v-row>
      <v-col cols="12" lg="7">
        <v-card elevation="0" class="panel-card">
          <v-card-item>
            <template #prepend><v-icon color="green-darken-2">mdi-filter-variant</v-icon></template>
            <v-card-title>Árvores que precisam de ação</v-card-title>
            <v-card-subtitle>{{ pendingTrees.length }} pendências ordenadas por urgência</v-card-subtitle>
          </v-card-item>
          <v-divider />
          <v-card-text>
            <v-row dense>
              <v-col cols="12" sm="4"><v-text-field v-model="filters.date" type="date" label="Dia da rota" variant="outlined" density="comfortable" /></v-col>
              <v-col cols="12" sm="3"><v-select v-model="filters.urgency" label="Urgência" :items="[{ title: 'Todas', value: 'ALL' }, { title: 'Urgente', value: 'CRITICAL' }, { title: 'Prioridade alta', value: 'HIGH' }]" variant="outlined" density="comfortable" /></v-col>
              <v-col cols="12" sm="5"><v-text-field v-model="filters.search" label="Buscar espécie, código ou coordenada" prepend-inner-icon="mdi-magnify" clearable variant="outlined" density="comfortable" /></v-col>
            </v-row>
            <div class="suggestion-banner mb-4">
              <div class="d-flex align-center">
                <v-avatar color="green-darken-2" size="40" class="mr-3"><v-icon color="white">mdi-auto-fix</v-icon></v-avatar>
                <div class="flex-grow-1">
                  <p class="text-subtitle-2 font-weight-bold mb-1">Sugestão inteligente pronta</p>
                  <p class="text-caption mb-0 text-grey-darken-2">Prioriza urgência e mantém as paradas próximas para reduzir deslocamentos entre ruas/quarteirões.</p>
                </div>
                <v-btn color="green-darken-2" variant="flat" class="suggestion-button text-none" prepend-icon="mdi-auto-fix" @click="useSuggestedRoute">Usar sugestão</v-btn>
              </div>
            </div>
            <div class="d-flex flex-wrap justify-space-between align-center mb-3 ga-2">
              <span class="text-caption text-grey-darken-1">{{ filteredTrees.length }} resultado(s)</span>
              <v-btn size="small" variant="text" color="green-darken-2" prepend-icon="mdi-plus-box-multiple" @click="addAllFiltered">Adicionar resultados</v-btn>
            </div>

            <v-progress-linear v-if="loading" indeterminate color="green" class="mb-3" />
            <div v-if="!loading && filteredTrees.length === 0" class="empty-state">
              <v-icon size="48" color="green-lighten-2">mdi-tree-check</v-icon>
              <p class="text-body-2 mt-2 mb-0">Nenhuma árvore pendente para este filtro.</p>
            </div>
            <template v-else>
              <v-list lines="two" class="pa-0">
                <v-list-item v-for="item in paginatedTrees" :key="item.tree.id" class="tree-row mb-2" :class="{ 'tree-row--selected': selectedIds.has(item.tree.id) }" @click="toggleTree(item)">
                  <template #prepend>
                    <v-checkbox-btn :model-value="selectedIds.has(item.tree.id)" color="green-darken-2" @click.stop="toggleTree(item)" />
                  </template>
                  <v-list-item-title class="font-weight-bold">{{ treeName(item) }}</v-list-item-title>
                  <v-list-item-subtitle>{{ item.reason }} · {{ coordinates(item.tree) }}</v-list-item-subtitle>
                  <template #append><v-chip size="small" :color="urgencyColor(item.urgency)" variant="tonal">{{ urgencyLabel(item.urgency) }}</v-chip></template>
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
                  color="green-darken-2"
                />
              </div>
            </template>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" lg="5">
        <v-card elevation="0" class="panel-card route-card">
          <v-card-item>
            <template #prepend><v-icon color="blue-darken-2">mdi-route</v-icon></template>
            <v-card-title>Rota de {{ filters.date.split('-').reverse().join('/') }}</v-card-title>
            <v-card-subtitle>{{ selectedCount }} paradas · pontuação {{ totalScore }}</v-card-subtitle>
            <template #append>
              <v-btn v-if="routeStops.length > 1" size="small" variant="tonal" color="blue-darken-2" prepend-icon="mdi-call-split" class="text-none" @click="organizeSelectedRoute">Agrupar por proximidade</v-btn>
            </template>
          </v-card-item>
          <v-divider />
          <v-card-text>
            <!-- Mini-mapa com a rota -->
            <div class="route-minimap-wrap mb-4">
              <div ref="routeMapEl" class="route-minimap" />
              <div v-if="routeStops.length === 0" class="route-minimap-hint">
                <v-icon size="18" class="mr-1">mdi-information-outline</v-icon>
                Selecione árvores para ver a rota no mapa
              </div>
            </div>

            <div v-if="routeStops.length === 0" class="empty-state">
              <v-icon size="48" color="blue-lighten-2">mdi-map-marker-path</v-icon>
              <p class="text-body-2 mt-2 mb-0">Selecione árvores à esquerda para criar a sequência.</p>
            </div>
            <v-list v-else lines="two" class="pa-0">
              <v-list-item v-for="(stop, index) in routeStops" :key="stop.id" class="route-stop mb-2">
                <template #prepend><v-avatar color="blue-lighten-5" size="32"><v-icon color="blue-darken-3" size="18">mdi-map-marker</v-icon><span class="route-number">{{ index + 1 }}</span></v-avatar></template>
                <v-list-item-title class="font-weight-bold">{{ stop.tree.species?.commonName || stop.tree.speciesName || `Árvore #${stop.id.slice(-6)}` }}</v-list-item-title>
                <v-list-item-subtitle>{{ coordinates(stop.tree) }}</v-list-item-subtitle>
                <template #append>
                  <div class="d-flex align-center">
                    <v-btn icon="mdi-chevron-up" size="x-small" variant="text" :disabled="index === 0" @click="moveStop(index, -1)" />
                    <v-btn icon="mdi-chevron-down" size="x-small" variant="text" :disabled="index === routeStops.length - 1" @click="moveStop(index, 1)" />
                    <v-btn icon="mdi-navigation-variant" size="x-small" variant="text" color="blue-darken-2" aria-label="Abrir navegação no Google Maps" @click="openExternalNavigation(stop)" />
                    <v-btn icon="mdi-close" size="x-small" variant="text" color="error" aria-label="Remover parada" @click="removeStop(index)" />
                  </div>
                </template>
              </v-list-item>
            </v-list>
            <div class="d-flex flex-wrap align-center justify-space-between ga-2">
              <v-alert v-if="routeStops.length" type="success" variant="tonal" density="compact" class="mt-4 flex-grow-1 mb-0">
                <strong>{{ selectedCount }} paradas prontas.</strong> Veja a linha e a sequência no mapa antes de iniciar o trabalho.
              </v-alert>
              <div v-if="routeStops.length" class="d-flex flex-wrap ga-2 mt-4">
                <v-btn color="blue-darken-2" variant="flat" class="text-none" prepend-icon="mdi-map-marker-path" @click="openRouteOnMap">Abrir no mapa</v-btn>
                <v-btn color="green-darken-2" variant="flat" class="text-none" prepend-icon="mdi-google-maps" @click="openFullRouteOnGoogleMaps">Abrir no Google Maps</v-btn>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.panel-card {
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  height: 100%;
}
.tree-row,
.route-stop {
  border: 1px solid #edf0f2;
  border-radius: 12px;
  cursor: pointer;
  transition: 0.2s ease;
}
.tree-row:hover,
.tree-row--selected {
  border-color: #81c784;
  background: #f4fbf4;
}
.suggestion-banner {
  border: 1px solid #b7d96b;
  border-radius: 16px;
  padding: 14px;
  background: linear-gradient(135deg, #f7fbe9 0%, #ffffff 100%);
}
.suggestion-button {
  min-height: 42px;
  box-shadow: 0 6px 18px rgba(46, 125, 50, 0.2);
}
.route-number {
  position: absolute;
  font-size: 0.7rem;
  font-weight: 800;
  color: #0d47a1;
  margin-left: 1px;
}
.empty-state {
  min-height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #68747c;
  text-align: center;
}

/* Mini-mapa da rota */
.route-minimap-wrap {
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

.route-minimap {
  height: 220px;
  width: 100%;
  z-index: 0;
}

.route-minimap-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.78);
  color: #64748b;
  font-size: 0.82rem;
  z-index: 1;
  pointer-events: none;
}
</style>

<style>
/* Pin numerado da rota (não-scoped: o ícone é injetado via Leaflet divIcon) */
.route-stop-pin {
  background: #1565c0;
  color: #fff;
  border: 2px solid #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 800;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}
</style>
