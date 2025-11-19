<script lang="ts">
import { defineComponent, onMounted, onUnmounted, watch, ref, computed } from 'vue';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface TaskLocation {
  id?: string | number;
  lat: number;
  lng: number;
  address: string;
  status: 'agendada' | 'em_progresso' | 'concluida';
}

export default defineComponent({
  name: 'PruningMap',
  props: {
    tasks: {
      type: Array as () => TaskLocation[],
      required: true,
    },
    radiusMeters: {
      type: Number,
      default: 2000,
    },
  },
  setup(props) {
    let map: L.Map | null = null;
    let markersLayer: L.LayerGroup | null = null; // para marcadores de árvores e linhas
    let wiresLayer: L.LayerGroup | null = null; // para círculos vermelhos (fiação)
    let userLayer: L.LayerGroup | null = null; // para marcador do usuário

    let userMarker: L.Marker | null = null;
    let userAccuracyCircle: L.Circle | null = null;

    let watchId: number | null = null;
    const following = ref(true);
    const markMode = ref(false);

    const locationStatus = ref<'idle' | 'requesting' | 'found' | 'denied' | 'error'>('idle');

    const markedWireCircles: Record<string, L.Circle> = {};

    const distanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
      return L.latLng(lat1, lng1).distanceTo(L.latLng(lat2, lng2));
    };

    // Cria ícones coloridos para as árvores conforme seu status
    const createTreeIcon = (status: 'agendada' | 'em_progresso' | 'concluida'): L.DivIcon => {
      let bgColor = '#4CAF50'; // verde agendada
      let borderColor = '#2E7D32'; // verde escuro borda
      if (status === 'em_progresso') {
        bgColor = '#FFC107'; // amarelo
        borderColor = '#F57F17';
      }
      if (status === 'concluida') {
        bgColor = '#2196F3'; // azul
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

    const treeCount = computed(() => Array.isArray(props.tasks) ? props.tasks.length : 0);

    // handler de resize declarado em escopo maior para remover no unmount
    let resizeHandler: ((ev?: Event) => void) | null = null;

    // Ensures Leaflet CSS is present; injects it if not.
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

    const initializeMap = () => {
      if (!document.getElementById('map-container')) return;

      ensureLeafletCss();

      // Padroniza para o Brasil: Brasília como centro com zoom que mostra todo o país
      // Coordenadas de Brasília: [-15.8267, -47.9218]
      map = L.map('map-container', { attributionControl: false }).setView([-15.8267, -47.9218], 4);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Cria camadas separadas
      markersLayer = L.layerGroup().addTo(map);
      wiresLayer = L.layerGroup().addTo(map);
      userLayer = L.layerGroup().addTo(map);

      // Handler de clique no mapa (usado no modo de marcação)
      map.on('click', onMapClick);

      // Controles na UI via leaflet
      addControls();

      // Garantir que o mapa calcule o tamanho corretamente após render
      map.whenReady(() => {
        setTimeout(() => {
          if (map) map.invalidateSize();
          // Desenha marcadores iniciais (todas as árvores) — SEMPRE, mesmo antes de geolocalização
          console.log('Desenhando árvores iniciais. Tasks:', props.tasks.length);
          drawRoute(props.tasks);
        }, 150);
      });

      // invalida tamanho em resize (handler nomeado para poder remover no unmount)
      resizeHandler = () => { if (map) map.invalidateSize(); };
      window.addEventListener('resize', resizeHandler as EventListener);

      // FORÇA localização automática — começa geolocalização SEM esperar botão
      console.log('Iniciando localização automática...');
      startGeolocation();
    };

    const addControls = () => {
      if (!map) return;

      const controlDiv = L.DomUtil.create('div', 'custom-map-controls');
      controlDiv.style.position = 'absolute';
      controlDiv.style.top = '10px';
      controlDiv.style.right = '10px';
      controlDiv.style.zIndex = '1000';
      controlDiv.style.display = 'flex';
      controlDiv.style.flexDirection = 'column';
      controlDiv.style.gap = '6px';

      const followBtn = L.DomUtil.create('button', '', controlDiv) as HTMLButtonElement;
      followBtn.innerText = following.value ? 'Seguir: ON' : 'Seguir: OFF';
      followBtn.style.padding = '6px 8px';

      followBtn.onclick = (e) => {
        e.preventDefault();
        following.value = !following.value;
        followBtn.innerText = following.value ? 'Seguir: ON' : 'Seguir: OFF';
      };

      const showAllBtn = L.DomUtil.create('button', '', controlDiv) as HTMLButtonElement;
      showAllBtn.innerText = 'Mostrar Árvores';
      showAllBtn.style.padding = '6px 8px';
      showAllBtn.onclick = (e) => {
        e.preventDefault();
        if (map) map.invalidateSize();
        drawRoute(props.tasks);
      };

      const locateBtn = L.DomUtil.create('button', '', controlDiv) as HTMLButtonElement;
      locateBtn.innerText = 'Localizar';
      locateBtn.style.padding = '6px 8px';
      locateBtn.onclick = (e) => {
        e.preventDefault();
        locationStatus.value = 'requesting';
        if (map) {
          map.locate({ setView: true, maxZoom: 16 });
        }
      };

      const markBtn = L.DomUtil.create('button', '', controlDiv) as HTMLButtonElement;
      markBtn.innerText = markMode.value ? 'Marcar Fiação: ON' : 'Marcar Fiação: OFF';
      markBtn.style.padding = '6px 8px';

      markBtn.onclick = (e) => {
        e.preventDefault();
        markMode.value = !markMode.value;
        markBtn.innerText = markMode.value ? 'Marcar Fiação: ON' : 'Marcar Fiação: OFF';
      };

      L.DomEvent.disableClickPropagation(controlDiv);

      const control = L.Control.extend({
        onAdd: function () {
          return controlDiv;
        },
      });

      map.addControl(new control({ position: 'topright' }));

      // Listener de evento locate do leaflet para desenhar usuário se for bem-sucedido
      map.on('locationfound', (e: L.LocationEvent) => {
        const latlng = e.latlng;
        const accuracy = e.accuracy ?? 50;
        locationStatus.value = 'found';
        setUserLocation(latlng.lat, latlng.lng, accuracy);
      });

      map.on('locationerror', (err) => {
        console.warn('Erro de localização do Leaflet:', err.message);
        locationStatus.value = 'denied';
      });
    };

    const setUserLocation = (lat: number, lng: number, accuracy = 50) => {
      if (!userLayer || !map) return;
      const latlng = L.latLng(lat, lng);

      console.log(`📍 Localização do usuário encontrada: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);

      if (!userMarker) {
        userMarker = L.marker(latlng, {
          title: 'Sua localização',
          icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          })
        });
        userLayer.addLayer(userMarker);
        userMarker.bindPopup('<b>📍 Você está aqui</b>');
      } else {
        userMarker.setLatLng(latlng);
      }

      if (!userAccuracyCircle) {
        userAccuracyCircle = L.circle(latlng, {
          radius: accuracy,
          color: '#2196F3',
          weight: 2,
          fillOpacity: 0.15
        });
        userLayer.addLayer(userAccuracyCircle);
      } else {
        userAccuracyCircle.setLatLng(latlng);
        userAccuracyCircle.setRadius(accuracy);
      }

      // FORÇA centralizar no usuário assim que localiza
      if (map && following.value) {
        console.log('🗺️ Centralizando mapa na sua localização...');
        map.setView(latlng, 13, { animate: true });
      }

      // Redesenha as árvores com o novo centro
      drawRoute(props.tasks);
    };

    const startGeolocation = () => {
      console.log('🔍 Iniciando localização automática do usuário...');

      if (!('geolocation' in navigator)) {
        console.warn('⚠️ Geolocalização não disponível no navegador');
        locationStatus.value = 'error';
        if (map) {
          console.log('Tentando fallback com map.locate()...');
          map.locate({ setView: true, maxZoom: 13 });
        }
        return;
      }

      try {
        locationStatus.value = 'requesting';
        console.log('⏳ watchPosition solicitado ao navegador...');

        // watchPosition: atualiza continuamente enquanto se move
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            console.log(`✅ Localização via GPS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
            locationStatus.value = 'found';
            setUserLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy ?? 50);
          },
          (err) => {
            console.warn(`❌ watchPosition erro (Código ${err.code}): ${err.message}`);
            locationStatus.value = 'denied';
            // Se watchPosition falhar, tenta map.locate (baseado em IP)
            if (map) {
              console.log('🌐 Tentando localização por IP via map.locate()...');
              map.locate({ setView: true, maxZoom: 13 });
            }
          },
          {
            enableHighAccuracy: true,  // Usa GPS se disponível
            maximumAge: 3000,          // Reutiliza posição com até 3s de idade
            timeout: 7000              // Timeout de 7 segundos
          }
        );

        // PARALELO: tenta map.locate() também (pode ser mais rápido em alguns casos)
        setTimeout(() => {
          if (map && locationStatus.value === 'requesting') {
            console.log('⚡ Tentando map.locate() em paralelo...');
            map.locate({ setView: true, maxZoom: 13 });
          }
        }, 2000); // Tenta após 2s se watchPosition ainda não tiver sucesso

      } catch (e) {
        console.warn('❌ startGeolocation exception:', e);
        locationStatus.value = 'error';
        if (map) {
          map.locate({ setView: true, maxZoom: 13 });
        }
      }
    };

    const stopGeolocation = () => {
      if (watchId !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
    };

    const onMapClick = (ev: L.LeafletMouseEvent) => {
      if (!markMode.value) return;
      const clickedLatLng = ev.latlng;
      const thresholdMeters = 40;
      let nearest: { task: TaskLocation; dist: number } | null = null;

      for (const task of (props.tasks as TaskLocation[])) {
        const d = distanceMeters(clickedLatLng.lat, clickedLatLng.lng, task.lat, task.lng);
        if (d <= thresholdMeters && (!nearest || d < nearest.dist)) {
          nearest = { task, dist: d };
        }
      }

      if (nearest) {
        toggleMarkWireForTask(nearest.task);
      } else {
        if (wiresLayer) {
          const temp = L.circle(clickedLatLng, { radius: 20, color: 'red', dashArray: '4' }).addTo(wiresLayer);
          setTimeout(() => {
            if (wiresLayer) wiresLayer.removeLayer(temp);
          }, 2000);
        }
      }
    };

    const toggleMarkWireForTask = (task: TaskLocation) => {
      const key = String(task.id ?? `${task.lat}_${task.lng}`);
      if (markedWireCircles[key]) {
        if (wiresLayer) wiresLayer.removeLayer(markedWireCircles[key]);
        delete markedWireCircles[key];
        console.log('Marcação de fiação removida:', key);
      } else if (wiresLayer) {
        const circle = L.circle([task.lat, task.lng], {
          radius: 50,
          color: 'red',
          weight: 3,
          fillOpacity: 0.2,
          dashArray: '5, 5'
        });
        wiresLayer.addLayer(circle);
        circle.bindPopup(`<b>⚠️ Árvore próxima à fiação</b><br/>${task.address}`);
        markedWireCircles[key] = circle;
        console.log('Marcação de fiação adicionada:', key);
      }
    };

    const drawRoute = (tasks: TaskLocation[]) => {
      if (!map || !markersLayer) return;

      // Limpa apenas os marcadores/linhas (preserva wiresLayer)
      markersLayer.clearLayers();

      if (!tasks || tasks.length === 0) {
        console.info('Nenhuma tarefa para desenhar');
        return;
      }

      const routeCoords: L.LatLngExpression[] = [];

      // FORÇANDO por enquanto: mostrar todas as árvores (não filtrar por raio)
      tasks.forEach((task, index) => {
        // valida lat/lng
        const lat = Number(task.lat);
        const lng = Number(task.lng);
        if (Number.isNaN(lat) || Number.isNaN(lng)) {
          console.warn('Task com coordenadas inválidas', task);
          return;
        }

        const coords: L.LatLngExpression = [lat, lng];
        routeCoords.push(coords);

        // Usa ícone customizado colorido conforme status
        const marker = L.marker(coords, { icon: createTreeIcon(task.status) });
        marker.bindPopup(`<b>Árvore ${index + 1}:</b> ${task.address} <br/>Status: ${task.status}`);
        marker.on('click', () => toggleMarkWireForTask(task));
        markersLayer!.addLayer(marker);
      });

      console.info('Desenhadas', routeCoords.length, 'árvores com ícones coloridos');

      // Desenha linha/polyline entre pontos visíveis
      if (routeCoords.length > 1) {
        const polyline = L.polyline(routeCoords, { color: 'blue', weight: 4, opacity: 0.7 });
        markersLayer.addLayer(polyline);
        map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
      } else if (routeCoords.length === 1) {
        const first = routeCoords[0];
        if (first) map.setView(first as L.LatLngExpression, 15);
      } else if (routeCoords.length === 0 && tasks.length > 0) {
        // Se não há coords visíveis, ainda assim tenta ajustar bounds
        const allCoords: L.LatLngTuple[] = [];
        tasks.forEach(t => {
          const lat = Number(t.lat);
          const lng = Number(t.lng);
          if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
            allCoords.push([lat, lng]);
          }
        });
        if (allCoords.length > 0) {
          const bounds = L.latLngBounds(allCoords);
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      }
    };

    watch(() => props.tasks, (newTasks) => {
      // sempre desenha todas as tarefas quando props muda
      setTimeout(() => drawRoute(newTasks), 50);
    }, { deep: true });

    onMounted(() => {
      initializeMap();
    });

    onUnmounted(() => {
      stopGeolocation();
      // remove resize handler corretamente
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
      drawRoute,
      ensureLeafletCss,
      doLocate,
    };
  },
});
</script>

<template>
  <div style="position: relative;">
    <div id="map-container" style="height: 398px; width: 100%; border-radius: 8px; z-index: 1;"></div>

    <div class="map-overlay-panel" style="position: absolute; left: 12px; top: 12px; z-index: 1200; background: rgba(255,255,255,0.95); padding: 8px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.12);">
      <div style="display:flex; gap:8px; align-items:center;">
        <button @click.prevent="drawRoute(tasks)" style="padding:6px 8px;">Mostrar Árvores</button>
        <button @click.prevent="doLocate" style="padding:6px 8px;">Localizar</button>
      </div>
      <div style="margin-top:6px; font-size:12px; color:#333">Árvores: {{ treeCount }}</div>
      <div style="margin-top:4px; font-size:12px; color:#666">Status de localização: {{ locationStatus }}</div>
    </div>
  </div>
</template>

<style scoped>
#map-container {
  background-color: #f0f0f0;
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

/* Estilos para os marcadores de árvore */
:deep(.tree-marker) {
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
}

:deep(.tree-marker img) {
  transition: transform 0.2s ease;
}

:deep(.tree-marker:hover) {
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5)) brightness(1.1);
}

/* Estilo para popup */
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

/* Overlay panel */
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

.map-overlay-panel button:hover {
  background: #f0f0f0;
  border-color: #999;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.map-overlay-panel button:active {
  transform: scale(0.98);
}
</style>
