<script lang="ts">
import { defineComponent, onMounted, onUnmounted, watch } from 'vue';
// Importação do Leaflet (assumindo que você o instalou via npm/yarn)
import L from 'leaflet';

// URLs dos arquivos CSS e imagens do Leaflet, essenciais para o funcionamento.
// Em um projeto real, você incluiria o CSS globalmente.
import 'leaflet/dist/leaflet.css';

// Corrigindo o problema comum de ícones perdidos no Leaflet com bundlers como Webpack/Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Interface de Tipagem para as Tarefas
interface TaskLocation {
  lat: number;
  lng: number;
  address: string;
  status: 'agendada' | 'em_progresso' | 'concluida';
}

export default defineComponent({
  name: 'PruningMap',
  props: {
    // A propriedade que receberá as tarefas para plotar a rota
    tasks: {
      type: Array as () => TaskLocation[],
      required: true,
    },
  },
  setup(props) {
    let map: L.Map | null = null;
    let routeLayer: L.LayerGroup | null = null;

    const initializeMap = () => {
      // 1. Inicializa o mapa no elemento 'map-container'
      if (!document.getElementById('map-container')) return;

      // Latitude/Longitude de um ponto central no Brasil (ex: São Paulo), ajuste conforme sua cidade
      const initialCoords: L.LatLngExpression = [-23.5505, -46.6333];
      const initialZoom = 12;

      map = L.map('map-container', { attributionControl: false }).setView(initialCoords, initialZoom);

      // 2. Adiciona a camada de mapa base (OpenStreetMap)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // 3. Cria um LayerGroup para gerenciar marcadores e rotas facilmente
      routeLayer = L.layerGroup().addTo(map);

      // Desenha a rota inicial
      drawRoute(props.tasks);
    };

    const drawRoute = (tasks: TaskLocation[]) => {
      if (!map || !routeLayer) return;

      // Limpa a camada anterior de marcadores/rotas
      routeLayer.clearLayers();

      if (tasks.length === 0) return;

      // 4. Adiciona Marcadores e coleta coordenadas para a rota
      const routeCoords: L.LatLngExpression[] = [];
      tasks.forEach((task, index) => {
        const coords: L.LatLngExpression = [task.lat, task.lng];
        routeCoords.push(coords);

        // Define a cor do ícone com base no status (simulação simples)
        let iconColor = 'blue';
        if (task.status === 'em_progresso') iconColor = 'orange';
        if (task.status === 'concluida') iconColor = 'green';

        // Ícone customizado (simulação - para um ícone real, você precisaria de um plugin Leaflet)
        // Usamos o ícone padrão do Leaflet com um pop-up
        const marker = L.marker(coords).addTo(routeLayer!);
        marker.bindPopup(`<b>Ponto ${index + 1}:</b> ${task.address} (${task.status})`);
      });

      // 5. Desenha a linha da rota
      if (routeCoords.length > 1) {
        const polyline = L.polyline(routeCoords, { color: 'blue', weight: 4, opacity: 0.7 }).addTo(routeLayer!);

        // Ajusta o zoom do mapa para mostrar toda a rota
        map.fitBounds(polyline.getBounds());
      } else if (routeCoords.length === 1) {
        // Ajusta o centro do mapa para o único ponto
        map.setView(routeCoords[0], 15);
      }
    };

    // Observa se a lista de tarefas muda e redesenha o mapa
    watch(() => props.tasks, (newTasks) => {
      drawRoute(newTasks);
    }, { deep: true });

    onMounted(() => {
      initializeMap();
    });

    onUnmounted(() => {
      if (map) {
        map.remove();
        map = null;
      }
    });

    return {};
  },
});
</script>

<template>
  <div id="map-container" style="height: 320px; width: 100%; border-radius: 8px; z-index: 1;"></div>
</template>

<style scoped>
/* Garante que o container do mapa tenha o tamanho definido */
#map-container {
  background-color: #f0f0f0; /* Cor de fundo enquanto carrega */
}

/* Você precisa garantir que o CSS do Leaflet esteja carregado.
   Se o import 'leaflet/dist/leaflet.css' não funcionar diretamente no seu ambiente,
   adicione a linha abaixo no seu index.html ou arquivo principal:
   <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
*/
</style>
