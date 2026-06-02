<template>
  <div class="map-wrapper">
    <!-- Filtro -->
    <select v-model="selectedSpecies" class="species-filter">
      <option value="">Todas as espécies</option>
      <option v-for="s in speciesOptions" :key="s" :value="s">
        {{ s }}
        <span v-if="s === selectedSpecies">(Selecionado)</span>
      </option>
    </select>

    <!-- Mapa -->
    <div ref="mapContainer" class="map-container"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { apiConnect, type Species } from '@/plugins/apiConnect'
import { useRouter } from 'vue-router'

/* ===============================
   TIPOS
================================ */

export interface TreeLocation {
  id: string
  latitude: number
  longitude: number
  species: Species
}

/* ===============================
   COMPONENT
================================ */

export default defineComponent({
  name: 'SpeciesMap',

  setup() {
    const router = useRouter()
    const mapContainer = ref<HTMLDivElement | null>(null)
    const selectedSpecies = ref<string>('')

    let map: L.Map
    let clusterGroup: L.MarkerClusterGroup

    const allTrees = ref<TreeLocation[]>([])
    const speciesOptions = ref<string[]>([])

    /* ===============================
       MAP INIT
    ================================ */

    const initMap = () => {
      map = L.map(mapContainer.value!).setView([-15.78, -47.92], 4)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map)

      clusterGroup = L.markerClusterGroup({ chunkedLoading: true })
      map.addLayer(clusterGroup)
    }

    /* ===============================
       HELPERS
    ================================ */

    const getSpeciesColor = (species: string) => {
      const colors: Record<string, string> = {
        'Ipê Amarelo': '#FBC02D',
        Jacarandá: '#7E57C2',
        'Pau-Brasil': '#D32F2F',
      }

      return colors[species] ?? '#388E3C'
    }

    const groupByLocation = (trees: TreeLocation[]) => {
      const map = new Map<string, TreeLocation[]>()

      trees.forEach((tree) => {
        const key = `${tree.latitude.toFixed(5)}_${tree.longitude.toFixed(5)}`
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(tree)
      })

      return Array.from(map.values())
    }

    /* ===============================
       LOAD DATA
    ================================ */

    const loadTrees = async () => {
      const { data } = await apiConnect.get<TreeLocation[]>('/trees')

      allTrees.value = data.filter(
        (t) =>
          typeof t.latitude === 'number' && typeof t.longitude === 'number' && !isNaN(t.latitude) && !isNaN(t.longitude),
      )

      speciesOptions.value = Array.from(new Set(allTrees.value.map((t) => t.species.commonName)))
    }

    /* ===============================
       RENDER MARKERS
    ================================ */

    const renderMarkers = () => {
      clusterGroup.clearLayers()

      const filteredTrees =
        selectedSpecies.value === ''
          ? allTrees.value
          : allTrees.value.filter((t) => t.species.commonName === selectedSpecies.value)

      const grouped = groupByLocation(filteredTrees)

      const markersArray: L.CircleMarker[] = []

      grouped.forEach((treesAtLocation) => {
        const first = treesAtLocation[0]
        if (!first) return
        const lat = first.latitude
        const lng = first.longitude

        const speciesCount = treesAtLocation.reduce<Record<string, number>>((acc, t) => {
          acc[t.species.commonName] = (acc[t.species.commonName] || 0) + 1
          return acc
        }, {})

        const dominantSpecies = Object.entries(speciesCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Desconhecida'

        const popupContent = `
          <strong>Espécies na localidade</strong><br/>
          ${Object.entries(speciesCount)
            .map(([s, q]) => `• ${s}: ${q}`)
            .join('<br/>')}
          <br/><br/>
          <button id="report-${lat}-${lng}" style="cursor:pointer;color:#1976D2">
            Ver relatório
          </button>
        `

        const marker = L.circleMarker([lat, lng], {
          radius: 10,
          color: getSpeciesColor(dominantSpecies),
          fillOpacity: 0.8,
        }).bindPopup(popupContent)

        marker.on('popupopen', () => {
          const btn = document.getElementById(`report-${lat}-${lng}`)
          btn?.addEventListener('click', () => {
            router.push('/user/reports')
          })
        })

        markersArray.push(marker)
      })

      clusterGroup.addLayers(markersArray)
    }

    /* ===============================
       WATCH
    ================================ */

    watch(selectedSpecies, renderMarkers)

    /* ===============================
       LIFECYCLE
    ================================ */

    onMounted(async () => {
      initMap()
      await loadTrees()
      renderMarkers()
    })

    return {
      mapContainer,
      selectedSpecies,
      speciesOptions,
    }
  },
})
</script>

<style scoped>
.map-wrapper {
  position: relative;
}

.map-container {
  height: 270px;
  width: 100%;
  border-radius: 8px;
}

.species-filter {
  position: absolute;
  z-index: 1000;
  top: 10px;
  left: 10px;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #ccc;
  background: white;
}
</style>
