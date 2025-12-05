<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref, computed, inject } from 'vue';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface CityTreeLocation {
  id?: string;
  age: Date;
  latitude: number;
  longitude: number;
  status: string;
  near_trees?: boolean;
}

interface MarkedLocation {
  id: string;
  lat: number;
  lng: number;
  notes: string;
  timestamp: Date;
}

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default defineComponent({
  name: 'PruningMap',
  props: {
    tasks: {
      type: Array as () => CityTreeLocation[],
      required: true,
      default: () => []
    },
    radiusMeters: {
      type: Number,
      default: 2000,
    },
  },
  setup(props) {
    const $api = inject('$api') as { get: (url: string, config?: Record<string, unknown>) => Promise<{ data: unknown }> };

    let map: L.Map | null = null;
    let markersLayer: L.LayerGroup | null = null;
    let userLayer: L.LayerGroup | null = null;
    let markedLayer: L.LayerGroup | null = null;

    let userMarker: L.Marker | null = null;
    let userAccuracyCircle: L.Circle | null = null;
    let watchId: number | null = null;
    let fetchTimeout: number | null = null;

    const following = ref(true);
    const markMode = ref(false);
    const locationStatus = ref<'idle' | 'requesting' | 'found' | 'denied' | 'error'>('idle');
    const isExpanded = ref(false);

    const cityTrees = ref<CityTreeLocation[]>([]);
    const markedLocations = ref<MarkedLocation[]>([]);
    const loadingTrees = ref(false);

    const treeCount = computed(() => Array.isArray(cityTrees.value) ? cityTrees.value.length : 0);
    const crowdedTreeCount = computed(() => cityTrees.value.filter(t => t.near_trees).length);
    const markedCount = computed(() => markedLocations.value.length);
    let resizeHandler: ((ev?: Event) => void) | null = null;

    const TREE_PROXIMITY_THRESHOLD = 50;

    const createTreeIcon = (status: string, crowded = false): L.DivIcon => {
      let bgColor = '#4CAF50';
      let borderColor = '#2E7D32';
      if (status === 'TO_PRUNE') {
        bgColor = '#FFC107';
        borderColor = '#F57F17';
      }
      if (status === 'UNDER_OBSERVATION') {
        bgColor = '#2196F3';
        borderColor = '#1565C0';
      }

      if (crowded) {
        bgColor = '#FF6B6B';
        borderColor = '#CC0000';
      }

      const pulseAnimation = crowded ? 'pulse 1.5s infinite' : 'none';

      return L.divIcon({
        html: `
          <div style="
            background-color: ${bgColor};
            border: 3px solid ${borderColor};
            border-radius: 50%;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 16px;
            animation: ${pulseAnimation};
            box-shadow: 0 0 8px rgba(0,0,0,0.3);
          ">
            🌳
          </div>
        `,
        iconSize: [crowded ? 50 : 40, crowded ? 50 : 40],
        iconAnchor: [crowded ? 25 : 20, crowded ? 50 : 40],
        popupAnchor: [0, crowded ? -50 : -36],
        className: 'tree-marker',
      });
    };

    const createMarkerIcon = (): L.DivIcon => {
      return L.divIcon({
        html: `
          <div style="
            background-color: #9C27B0;
            border: 2px solid #6A1B9A;
            border-radius: 50%;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 18px;
            box-shadow: 0 0 8px rgba(0,0,0,0.3);
          ">
            📌
          </div>
        `,
        iconSize: [45, 45],
        iconAnchor: [22, 45],
        popupAnchor: [0, -45],
        className: 'custom-marker',
      });
    };

    const ensureLeafletCss = () => {
      const already = Array.from(document.styleSheets).some(s => (s.href || '').includes('leaflet'));
      if (!already) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
    };

    const fetchTreesFromApi = async (minLat: number, minLng: number, maxLat: number, maxLng: number) => {
      try {
        const response = await $api.get('/trees', {
          params: { minLat, minLng, maxLat, maxLng }
        });
        const trees = (response.data as CityTreeLocation[]) || [];
        return trees.map(tree => ({
          ...tree,
          latitude: Number(tree.latitude),
          longitude: Number(tree.longitude),
        }));
      } catch (error) {
        console.error('Erro ao buscar árvores:', error);
        return [];
      }
    };

    const checkTreesProximity = () => {
      cityTrees.value.forEach((tree, index) => {
        tree.near_trees = false;
        const treeLatLng = L.latLng(tree.latitude, tree.longitude);

        cityTrees.value.forEach((otherTree, otherIndex) => {
          if (index !== otherIndex) {
            const otherLatLng = L.latLng(otherTree.latitude, otherTree.longitude);
            const distance = treeLatLng.distanceTo(otherLatLng);
            if (distance < TREE_PROXIMITY_THRESHOLD) {
              tree.near_trees = true;
            }
          }
        });
      });
    };

    const drawMarkedLocations = () => {
      if (!markedLayer) return;
      markedLayer.clearLayers();

      markedLocations.value.forEach(marked => {
        const marker = L.marker([marked.lat, marked.lng], {
          icon: createMarkerIcon()
        });
        const popupHtml = `
          <div style="font-size:12px;">
            <b>Marcação:</b> ${marked.notes}<br>
            <small>${new Date(marked.timestamp).toLocaleString('pt-BR')}</small><br>
            <button onclick="window.deleteMarked('${marked.id}')" style="margin-top:5px; padding:4px 8px; background:#FF6B6B; color:white; border:none; border-radius:4px; cursor:pointer;">
              Deletar
            </button>
          </div>
        `;
        marker.bindPopup(popupHtml);
        markedLayer!.addLayer(marker);
      });
    };

    const fetchVisibleData = async () => {
      if (!map) return;
      loadingTrees.value = true;
      try {
        const bounds = map.getBounds();
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();

        const apiTrees = await fetchTreesFromApi(sw.lat, sw.lng, ne.lat, ne.lng);

        const safeTasks = (props.tasks || []) as CityTreeLocation[];
        cityTrees.value = [...safeTasks, ...apiTrees];

        checkTreesProximity();
        drawRoute(cityTrees.value);
      } finally {
        loadingTrees.value = false;
      }
    };

    const initializeMap = () => {
      if (!document.getElementById('map-container')) return;
      ensureLeafletCss();
      map = L.map('map-container', { attributionControl: false }).setView([-23.5505, -46.6333], 13);

      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 18,
      }).addTo(map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        opacity: 0.6,
      }).addTo(map);

      markersLayer = L.layerGroup().addTo(map);
      markedLayer = L.layerGroup().addTo(map);
      userLayer = L.layerGroup().addTo(map);

      map.on('click', onMapClick);
      map.on('moveend', onMapMove);
      addControls();

      map.whenReady(() => {
        if (map) {
          setTimeout(() => {
            fetchVisibleData();
          }, 300);
        }
      });

      resizeHandler = () => {
        if (map) map.invalidateSize();
      };
      window.addEventListener('resize', resizeHandler as EventListener);
      startGeolocation();
    };

    const addControls = () => {
      if (!map) return;
      const CustomControl = L.Control.extend({
        options: { position: 'topright' },
        onAdd: () => {
          const container = L.DomUtil.create('div', 'custom-map-controls leaflet-bar');
          const btn = L.DomUtil.create('button', '', container) as HTMLButtonElement;
          btn.innerText = following.value ? '🔍 Seguir' : '📍 Solto';
          btn.onclick = () => {
            following.value = !following.value;
          };
          return container;
        }
      });
      map.addControl(new CustomControl());
    };

    const setUserLocation = (lat: number, lng: number, accuracy = 50) => {
      if (!map || !userLayer) return;
      const latlng = L.latLng(lat, lng);
      if (!userMarker) {
        userMarker = L.marker(latlng, { title: 'Você' });
        userLayer.addLayer(userMarker);
      } else {
        userMarker.setLatLng(latlng);
      }
      if (!userAccuracyCircle) {
        userAccuracyCircle = L.circle(latlng, { radius: accuracy, color: '#2E86AB', fillOpacity: 0.1 });
        userLayer.addLayer(userAccuracyCircle);
      } else {
        userAccuracyCircle.setLatLng(latlng);
        userAccuracyCircle.setRadius(accuracy);
      }
      if (following.value && map) {
        map.setView(latlng, map.getZoom() < 15 ? 15 : map.getZoom());
      }
      locationStatus.value = 'found';
    };

    const startGeolocation = () => {
      if (!('geolocation' in navigator)) {
        locationStatus.value = 'denied';
        return;
      }
      locationStatus.value = 'requesting';
      navigator.geolocation.getCurrentPosition(
        pos => {
          setUserLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
          locationStatus.value = 'found';
        },
        () => {
          locationStatus.value = 'error';
        },
        { enableHighAccuracy: true }
      );
      if (watchId === null) {
        const id = navigator.geolocation.watchPosition(
          pos => {
            setUserLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
          }
        );
        watchId = id;
      }
    };

    const stopGeolocation = () => {
      if ('geolocation' in navigator && watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      if (userLayer) {
        userLayer.clearLayers();
        userMarker = null;
        userAccuracyCircle = null;
      }
      locationStatus.value = 'idle';
    };

    const onMapMove = () => {
      if (fetchTimeout) window.clearTimeout(fetchTimeout);
      fetchTimeout = window.setTimeout(() => {
        fetchVisibleData();
        fetchTimeout = null;
      }, 600);
    };

    const onMapClick = (ev: L.LeafletMouseEvent) => {
      if (!markMode.value) return;
      if (isExpanded.value) return;

      const latlng = ev.latlng;
      const notes = prompt('Adicione uma nota para esta marcação:');
      if (!notes) return;

      const newMarked: MarkedLocation = {
        id: `marker_${Date.now()}`,
        lat: latlng.lat,
        lng: latlng.lng,
        notes,
        timestamp: new Date(),
      };

      markedLocations.value.push(newMarked);
      drawMarkedLocations();
    };

    const deleteMarkedLocation = (id: string) => {
      markedLocations.value = markedLocations.value.filter(m => m.id !== id);
      drawMarkedLocations();
    };

    const drawRoute = (tasks: CityTreeLocation[]) => {
      if (!markersLayer) return;
      markersLayer.clearLayers();
      if (tasks.length === 0) return;

      tasks.forEach(t => {
        const marker = L.marker([t.latitude, t.longitude], {
          icon: createTreeIcon(t.status, t.near_trees || false)
        });
        const popupHtml = `
          <div style="font-size:12px;">
            <b>Árvore ID:</b> ${t.id}<br>
            <b>Status:</b> ${t.status}<br>
            <b>Próxima a outras:</b> ${t.near_trees ? 'Sim ⚠️' : 'Não'}<br>
            <small>Lat: ${t.latitude.toFixed(4)}, Lng: ${t.longitude.toFixed(4)}</small>
          </div>
        `;
        marker.bindPopup(popupHtml);
        markersLayer!.addLayer(marker);
      });
    };

    const toggleExpanded = () => {
      isExpanded.value = !isExpanded.value;
      setTimeout(() => {
        if (map) map.invalidateSize();
      }, 300);
    };

    onMounted(() => {
      initializeMap();
      (window as unknown as { deleteMarked: (id: string) => void }).deleteMarked = deleteMarkedLocation;
    });

    onUnmounted(() => {
      stopGeolocation();
      if (resizeHandler) window.removeEventListener('resize', resizeHandler as EventListener);
      if (map) {
        map.off('click', onMapClick);
        map.off('moveend', onMapMove);
        map.remove();
        map = null;
      }
    });

    const doLocate = () => {
      locationStatus.value = 'requesting';
      if (map) map.locate({ setView: true, maxZoom: 16 });
      else startGeolocation();
    };

    const toggleMarkMode = () => {
      markMode.value = !markMode.value;
    };

    return {
      following,
      markMode,
      locationStatus,
      treeCount,
      crowdedTreeCount,
      markedCount,
      loadingTrees,
      cityTrees,
      drawRoute,
      doLocate,
      toggleMarkMode,
      isExpanded,
      toggleExpanded,
    };
  },
});
</script>

<template>
  <div :class="isExpanded ? 'map-wrapper-expanded' : 'map-wrapper'">
    <div id="map-container" :class="isExpanded ? 'map-container-expanded' : 'map-container'"></div>

    <div :class="isExpanded ? 'map-overlay-panel-expanded' : 'map-overlay-panel'">
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button @click.prevent="doLocate" style="padding:8px 12px;">📍 Localizar</button>
        <button @click.prevent="toggleMarkMode" :style="{ padding: '8px 12px', background: markMode ? '#9C27B0' : 'white', color: markMode ? 'white' : 'black' }">
          📌 Marcar
        </button>
      </div>
      <div style="margin-top:10px; font-size:13px; color:#333; border-top:1px solid #ddd; padding-top:8px;">
        <div v-if="loadingTrees" style="color:#666;">Carregando dados do mapa... 🌳</div>
        <div v-else>
          <div><b>Árvores visíveis:</b> {{ treeCount }}</div>
          <div style="color:#CC0000; font-weight:bold;"><b>📍 Próximas entre si:</b> {{ crowdedTreeCount }}</div>
          <div style="color:#9C27B0; font-weight:bold;"><b>📌 Marcações:</b> {{ markedCount }}</div>
        </div>
      </div>
      <div style="margin-top:6px; font-size:11px; color:#666;">
        Status: {{ locationStatus }}
        <span v-if="markMode" style="color:#9C27B0; font-weight:bold;">| Modo marcação ativado</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-wrapper {
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

.map-wrapper-expanded {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100vh;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  background: #f0f0f0;
}

#map-container {
  flex: 1;
  width: 100%;
  background-color: #f0f0f0;
}

.map-container {
  height: 100%;
  width: 100%;
  border-radius: 0;
}

.map-container-expanded {
  height: 100%;
  width: 100%;
  border-radius: 0;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
}

.leaflet-top.leaflet-right .custom-map-controls button {
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
}

.leaflet-top.leaflet-right .custom-map-controls button:hover {
  background: #f5f5f5;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
}

:deep(.tree-marker) {
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
}

:deep(.custom-marker) {
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
}

:deep(.leaflet-popup-content) {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  margin: 0;
  padding: 10px;
}

.map-overlay-panel {
  position: absolute;
  left: 12px;
  top: 12px;
  z-index: 1200;
  background: rgba(255,255,255,0.97);
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  max-width: 280px;
  transition: all 0.3s ease;
}

.map-overlay-panel-expanded {
  position: absolute;
  left: 12px;
  top: 12px;
  z-index: 1200;
  background: rgba(255,255,255,0.97);
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  max-width: 300px;
  transition: all 0.3s ease;
}

.map-overlay-panel button,
.map-overlay-panel-expanded button {
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.map-overlay-panel button:hover:not(:disabled),
.map-overlay-panel-expanded button:hover:not(:disabled) {
  background: #f0f0f0;
  border-color: #999;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.map-overlay-panel button:active:not(:disabled),
.map-overlay-panel-expanded button:active:not(:disabled) {
  transform: scale(0.98);
}

.map-overlay-panel button:disabled,
.map-overlay-panel-expanded button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .map-wrapper {
    height: 100vh;
  }

  .map-wrapper-expanded {
    height: 100vh;
  }

  .map-overlay-panel,
  .map-overlay-panel-expanded {
    max-width: 250px;
    font-size: 12px;
  }

  .map-overlay-panel button,
  .map-overlay-panel-expanded button {
    padding: 6px 10px;
    font-size: 11px;
  }
}
</style>
