<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  createMunicipalityPointValidator,
  type MunicipalityGeometry,
} from '@/utils/municipalityGeometry'

interface MunicipalityPoint {
  latitude: number
  longitude: number
}

const props = defineProps<{
  geometry: MunicipalityGeometry
  municipalityName: string
  modelValue: MunicipalityPoint | null
  pointInsideBoundary: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [point: MunicipalityPoint]
  'outside-boundary': []
}>()

const mapElement = ref<HTMLDivElement | null>(null)
let map: L.Map | null = null
let boundaryLayer: L.GeoJSON | null = null
let locationMarker: L.CircleMarker | null = null
const pointIsInside = createMunicipalityPointValidator(props.geometry)

function updateLocationMarker(point: MunicipalityPoint | null) {
  if (!map) return
  if (!point || !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) {
    if (locationMarker) map.removeLayer(locationMarker)
    locationMarker = null
    return
  }

  const latLng = L.latLng(point.latitude, point.longitude)
  const style = props.pointInsideBoundary
    ? { color: '#ffffff', weight: 3, fillColor: '#006a38', fillOpacity: 1, radius: 9 }
    : { color: '#ffffff', weight: 3, fillColor: '#b42318', fillOpacity: 1, radius: 9 }

  if (!locationMarker) locationMarker = L.circleMarker(latLng, style).addTo(map)
  else locationMarker.setLatLng(latLng).setStyle(style)
}

function handleMapClick(event: L.LeafletMouseEvent) {
  if (!pointIsInside(event.latlng.lng, event.latlng.lat)) {
    emit('outside-boundary')
    return
  }
  emit('update:modelValue', {
    latitude: event.latlng.lat,
    longitude: event.latlng.lng,
  })
}

onMounted(() => {
  if (!mapElement.value) return

  map = L.map(mapElement.value, {
    scrollWheelZoom: false,
    maxBoundsViscosity: 1,
  })
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)

  boundaryLayer = L.geoJSON(props.geometry as unknown as GeoJSON.GeoJsonObject, {
    style: {
      color: '#006a38',
      weight: 3,
      opacity: 1,
      fillColor: '#11d080',
      fillOpacity: 0.16,
    },
  }).addTo(map)

  const bounds = boundaryLayer.getBounds()
  if (bounds.isValid()) {
    map.fitBounds(bounds, { padding: [18, 18], maxZoom: 13 })
    map.setMaxBounds(bounds.pad(0.12))
  }

  map.on('click', handleMapClick)
  updateLocationMarker(props.modelValue)
  requestAnimationFrame(() => map?.invalidateSize())
})

watch(
  () => [props.modelValue, props.pointInsideBoundary] as const,
  ([point]) => updateLocationMarker(point),
  { deep: true },
)

onUnmounted(() => {
  map?.off('click', handleMapClick)
  map?.remove()
  map = null
  boundaryLayer = null
  locationMarker = null
})
</script>

<template>
  <div class="municipality-location-picker">
    <div
      ref="mapElement"
      class="municipality-location-picker__map"
      role="application"
      :aria-label="`Mapa para selecionar uma árvore dentro de ${municipalityName}`"
    />
    <p class="municipality-location-picker__hint">
      Selecione um ponto dentro do limite verde de {{ municipalityName }}. Você também pode
      informar as coordenadas nos campos abaixo.
    </p>
  </div>
</template>

<style scoped>
.municipality-location-picker {
  min-width: 0;
}

.municipality-location-picker__map {
  width: 100%;
  height: 320px;
  overflow: hidden;
  border: 1px solid var(--mt-border);
  border-radius: 14px;
  background: var(--mt-surface-soft);
}

.municipality-location-picker__hint {
  margin-top: 8px;
  color: var(--mt-text-muted);
  font-size: 0.8rem;
  line-height: 1.45;
}

@media (max-width: 600px) {
  .municipality-location-picker__map {
    height: 260px;
  }
}
</style>
