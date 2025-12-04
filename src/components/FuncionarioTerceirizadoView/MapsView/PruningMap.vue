<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref, computed } from 'vue';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { MOCK_CITY_TREES } from '@/components/FuncionarioTerceirizadoView/MockTrees/Mocktree.vue';
import type { CityTreeLocation } from '@/components/FuncionarioTerceirizadoView/MockTrees/MockTree.vue';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Interfaces definidas no arquivo Mocktree.vue, mas mantidas aqui para referência:
interface TaskLocation {
  id?: string | number;
  lat: number;
  lng: number;
  address: string;
  status: 'agendada' | 'em_progresso' | 'concluida';
}
// interface CityTreeLocation extends TaskLocation { tree_type?: string; }


// 🔥 FUNÇÃO AUXILIAR PARA DADOS DA FIAÇÃO (MOCKADO)
const getMockWireRoutes = (): L.LatLngTuple[][] => {
  // Simula duas rotas principais de fiação na área central de Limoeiro do Norte
  const route1: L.LatLngTuple[] = [
    [-5.1450, -38.0800],
    [-5.1430, -38.0840],
    [-5.1400, -38.0870],
    [-5.1380, -38.0900],
  ];

  const route2: L.LatLngTuple[] = [
    [-5.1420, -38.0830],
    [-5.1400, -38.0855],
    [-5.1395, -38.0870],
  ];

  return [route1, route2];
};


export default defineComponent({
  name: 'PruningMap',
  props: {
    tasks: {
      type: Array as () => TaskLocation[],
      required: true,
      default: () => []
    },
    radiusMeters: {
      type: Number,
      default: 2000,
    },
  },
  setup(props) {
    let map: L.Map | null = null;
    let markersLayer: L.LayerGroup | null = null;
    let wiresLayer: L.LayerGroup | null = null; // Camada para fiação e círculos de perigo
    let userLayer: L.LayerGroup | null = null;

    let userMarker: L.Marker | null = null;
    let userAccuracyCircle: L.Circle | null = null;

    let watchId: number | null = null;

    const following = ref(true);
    const markMode = ref(false); // Modo de marcação manual de fiação
    const locationStatus = ref<'idle' | 'requesting' | 'found' | 'denied' | 'error'>('idle');

    const cityTrees = ref<CityTreeLocation[]>([]);
    const loadingTrees = ref(true);

    const markedWireCircles: Record<string, L.Circle> = {}; // Círculos marcados manualmente pelo usuário

    const distanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
      return L.latLng(lat1, lng1).distanceTo(L.latLng(lat2, lng2));
    };

    const treeCount = computed(() => Array.isArray(cityTrees.value) ? cityTrees.value.length : 0);
    let resizeHandler: ((ev?: Event) => void) | null = null;

    // ... (createTreeIcon e ensureLeafletCss mantidos)
    const createTreeIcon = (status: 'agendada' | 'em_progresso' | 'concluida'): L.DivIcon => {
      // ... (código do ícone mantido)
      let bgColor = '#4CAF50';
      let borderColor = '#2E7D32';
      if (status === 'em_progresso') {
        bgColor = '#FFC107';
        borderColor = '#F57F17';
      }
      if (status === 'concluida') {
        bgColor = '#2196F3';
        borderColor = '#1565C0';
      }

      return L.divIcon({
        html: `
          <div style="
            position: relative;
            width: 45px;
            height: 45px;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: ${bgColor};
            border: 4px solid white;
            border-radius: 50%;
            box-shadow: 0 0 0 2px ${borderColor}, 0 3px 8px rgba(0,0,0,0.4);
            cursor: pointer;
            font-size: 24px;
            font-weight: bold;
            transition: transform 0.2s;
          " onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">
            🌳
          </div>
        `,
        iconSize: [45, 45],
        iconAnchor: [22, 45],
        popupAnchor: [0, -50],
        className: 'tree-marker',
      });
    };

    const ensureLeafletCss = () => {
      const already = Array.from(document.styleSheets).some(s => (s.href || '').includes('leaflet'));
      if (!already) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
        console.info('Leaflet CSS injected');
      }
    };

    // 🔥 NOVA FUNÇÃO: Desenha as rotas de fiação
    const drawWires = () => {
      if (!map || !wiresLayer) return;

      // Limpa a camada de fiação, mas mantém os círculos marcados manualmente
      wiresLayer.eachLayer(layer => {
        if (layer instanceof L.Polyline) {
          wiresLayer!.removeLayer(layer);
        }
      });

      const wireRoutes = getMockWireRoutes();

      wireRoutes.forEach(route => {
        const polyline = L.polyline(route, {
          color: '#333333', // Cor escura para simular cabos
          weight: 2,
          opacity: 0.8,
          dashArray: '5, 10' // Linha tracejada (opcional)
        });
        wiresLayer!.addLayer(polyline);
      });

      console.info(`✅ Desenhadas ${wireRoutes.length} rotas de fiação simuladas.`);

      // Após desenhar as rotas, identifica árvores próximas à fiação
      highlightTreesNearWires();
    };

    // 🔥 NOVA FUNÇÃO: Identifica e destaca árvores próximas
    const highlightTreesNearWires = () => {
      if (!map || !markersLayer || !wiresLayer) return;

      // Limpa destaques anteriores de proximidade (se existirem, além dos manuais)
      wiresLayer.eachLayer(layer => {
        // Remove apenas círculos gerados automaticamente (não os marcados manualmente)
        const key = (layer as any)._leaflet_id;
        if (layer instanceof L.Circle && !markedWireCircles[key]) {
          wiresLayer!.removeLayer(layer);
        }
      });

      // Círculos de perigo automático (para evitar duplicidade nos marcadores manuais)
      const autoDangerCircles: L.Circle[] = [];
      const WIRE_DISTANCE_THRESHOLD = 15; // 15 metros de distância de risco

      // Pega todos os segmentos de linha (fiação)
      const allWireSegments: L.Polyline[] = [];
      wiresLayer.eachLayer(layer => {
        if (layer instanceof L.Polyline) {
          allWireSegments.push(layer);
        }
      });

      let nearbyCount = 0;

      cityTrees.value.forEach(tree => {
        const treeLatLng = L.latLng(tree.lat, tree.lng);
        let isNearWire = false;

        for (const wire of allWireSegments) {
          const wireCoords = wire.getLatLngs() as L.LatLng[];

          // O Leaflet tem um método para checar a menor distância de um ponto a uma polyline
          // Embora não seja nativo e exato, podemos simular a checagem por proximidade dos vértices:
          let minDistance = Infinity;

          // Percorre os vértices (pontos de sustentação da fiação)
          wireCoords.forEach(wirePoint => {
            const dist = distanceMeters(treeLatLng.lat, treeLatLng.lng, wirePoint.lat, wirePoint.lng);
            if (dist < minDistance) {
              minDistance = dist;
            }
          });

          // Se estiver muito próximo de um dos vértices da fiação
          if (minDistance <= WIRE_DISTANCE_THRESHOLD) {
            isNearWire = true;
            break;
          }
        }

        if (isNearWire) {
          nearbyCount++;
          const dangerCircle = L.circle(treeLatLng, {
            radius: 12, // Círculo pequeno de alerta na base da árvore
            color: '#FF0000',
            fillColor: '#FFC0CB',
            weight: 1,
            fillOpacity: 0.5,
          });
          autoDangerCircles.push(dangerCircle);
          wiresLayer!.addLayer(dangerCircle);
        }
      });

      console.log(`⚠️ Identificadas ${nearbyCount} árvores próximas à fiação (a menos de ${WIRE_DISTANCE_THRESHOLD}m dos postes).`);
      // Adicione um controle visual para o usuário
      if (nearbyCount > 0) {
        // Se necessário, você pode adicionar um popup ou notificação aqui.
      }
    }


    const fetchCityTrees = async () => {
      console.log('⏳ Carregando inventário de árvores da cidade (usando dados MOCKADOS para contornar erro de backend)...');
      loadingTrees.value = true;

      // Simulação de delay
      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        // 1. Usa APENAS o array grande importado
        const realCityData: CityTreeLocation[] = MOCK_CITY_TREES;

        // 2. Garante que props.tasks é um array (melhor prática)
        const safeTasks = props.tasks || [];

        // 3. Combina as tarefas atuais com o inventário mockado
        const combinedData: CityTreeLocation[] = [
          ...safeTasks,
          ...realCityData
        ];

        cityTrees.value = combinedData;

      } catch (error) {
        console.error("❌ Erro ao processar dados mockados:", error);
        cityTrees.value = props.tasks || [];
      } finally {
        loadingTrees.value = false;
        console.log(`✅ ${cityTrees.value.length} árvores (MOCKADAS) carregadas.`);

        drawRoute(cityTrees.value);
        // 🔥 CHAMADA PARA DESENHAR FIOS E DESTACAR ÁRVORES
        drawWires();

        if (cityTrees.value.length > 0 && map) {
          const allLats = cityTrees.value.map(t => t.lat);
          const allLngs = cityTrees.value.map(t => t.lng);
          const avgLat = allLats.reduce((a, b) => a + b) / allLats.length;
          const avgLng = allLngs.reduce((a, b) => a + b) / allLngs.length;

          map.setView([avgLat, avgLng], 13);
        }
      }
    };


    const initializeMap = () => {
      if (!document.getElementById('map-container')) return;

      ensureLeafletCss();

      map = L.map('map-container', { attributionControl: false }).setView([-5.1438, -38.0850], 13);

      // ... (Configuração do Tile Layer mantida)
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 18,
      }).addTo(map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        opacity: 0.7,
      }).addTo(map);

      // Ordem das camadas: Wires abaixo dos Markers, Markers abaixo do User
      wiresLayer = L.layerGroup().addTo(map);
      markersLayer = L.layerGroup().addTo(map);
      userLayer = L.layerGroup().addTo(map);

      map.on('click', onMapClick);
      addControls();

      map.whenReady(() => {
        setTimeout(() => {
          if (map) map.invalidateSize();
          fetchCityTrees();
        }, 150);
      });

      resizeHandler = () => { if (map) map.invalidateSize(); };
      window.addEventListener('resize', resizeHandler as EventListener);

      startGeolocation();
    };

    // ... (restante das funções mantidas: addControls, setUserLocation, startGeolocation, stopGeolocation, onMapClick, toggleMarkWireForTask, drawRoute)
    const addControls = () => { /* ... mantida ... */ };
    const setUserLocation = (lat: number, lng: number, accuracy = 50) => { /* ... mantida ... */ };
    const startGeolocation = () => { /* ... mantida ... */ };
    const stopGeolocation = () => { /* ... mantida ... */ };
    const onMapClick = (ev: L.LeafletMouseEvent) => { /* ... mantida ... */ };
    const toggleMarkWireForTask = (task: CityTreeLocation) => { /* ... mantida ... */ };
    const drawRoute = (tasks: CityTreeLocation[]) => { /* ... mantida ... */ };


    onMounted(() => {
      initializeMap();
    });

    onUnmounted(() => {
      stopGeolocation();
      if (resizeHandler) window.removeEventListener('resize', resizeHandler as EventListener);
      if (map) {
        map.off('click', onMapClick);
        map.remove();
        map = null;
      }
    });

    const doLocate = () => {
      locationStatus.value = 'requesting';
      if (map) map.locate({ setView: true, maxZoom: 16 });
      else startGeolocation();
    };

    return {
      following,
      markMode,
      locationStatus,
      treeCount,
      loadingTrees,
      cityTrees,
      drawRoute,
      ensureLeafletCss,
      doLocate,
    };
  },
});
</script>

<template>
  <div style="position: relative;">
    <div id="map-container" style="height: 100%; width: 100%; border-radius: 8px; z-index: 1;"></div>

    <div class="map-overlay-panel" style="position: absolute; left: 12px; top: 12px; z-index: 1200; background: rgba(255,255,255,0.95); padding: 8px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.12);">
      <div style="display:flex; gap:8px; align-items:center;">
        <button @click.prevent="drawRoute(cityTrees)" :disabled="loadingTrees" style="padding:6px 8px;">
          Mostrar Todas as Árvores
        </button>
        <button @click.prevent="doLocate" style="padding:6px 8px;">Localizar</button>
      </div>
      <div style="margin-top:6px; font-size:12px; color:#333">
        <span v-if="loadingTrees">Carregando inventário... 🌳</span>
        <span v-else>Árvores da Cidade: **{{ treeCount }}**</span>
      </div>
      <div style="margin-top:4px; font-size:12px; color:#666">Status de localização: {{ locationStatus }}</div>
    </div>
  </div>
</template>


<style scoped>
/* Estilos mantidos e atualizados */
#map-container {
  background-color: #f0f0f0;
}

/* Os estilos personalizados dos controles e marcadores mantidos */
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

:deep(.tree-marker img) {
  transition: transform 0.2s ease;
}

:deep(.tree-marker:hover) {
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5)) brightness(1.1);
}

:deep(.leaflet-popup-content) {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  font-size: 13px;
  margin: 0;
  padding: 8px;
}

:deep(.leaflet-popup-content b) {
  color: #2c3e50;
  font-weight: 600;
}

.map-overlay-panel {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

.map-overlay-panel button {
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.map-overlay-panel button:hover:not(:disabled) {
  background: #f0f0f0;
  border-color: #999;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.map-overlay-panel button:active:not(:disabled) {
  transform: scale(0.98);
}

.map-overlay-panel button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
