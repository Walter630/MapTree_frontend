<script lang="ts">
export interface CityTreeLocation {
  id?: string | number;
  lat: number;
  lng: number;
  address: string;
  status: 'agendada' | 'em_progresso' | 'concluida';
  tree_type?: string;
}

const generateMockTrees = (centerLat: number, centerLng: number, count: number): CityTreeLocation[] => {
  // ... (código da geração mantido)
  const mockData: CityTreeLocation[] = [];
  const statuses = ['agendada', 'em_progresso', 'concluida'];
  const types = ['Ipê Roxo', 'Pau Ferro', 'Jatobá', 'Flamboyant', 'Mangueira'];

  for (let i = 0; i < count; i++) {
    const lat = centerLat + (Math.random() - 0.5) * 0.05; // 0.05 é cerca de 5km de variação
    const lng = centerLng + (Math.random() - 0.5) * 0.05;

    mockData.push({
      id: `mock-${i}`,
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6)),
      address: `Rua Mockada ${i}`,
      status: statuses[Math.floor(Math.random() * statuses.length)] as CityTreeLocation['status'],
      tree_type: types[Math.floor(Math.random() * types.length)],
    });
  }
  return mockData;
};

// 🔥 CORREÇÃO DE LOCALIZAÇÃO: Coordenadas de Tabuleiro do Norte, CE
const TABULEIRO_NORTE_LAT = -5.2308;
const TABULEIRO_NORTE_LNG = -38.0825;

// Gera árvores mockadas no novo centro
export const MOCK_CITY_TREES: CityTreeLocation[] = generateMockTrees(TABULEIRO_NORTE_LAT, TABULEIRO_NORTE_LNG, 500);

console.log(`${MOCK_CITY_TREES.length} árvores mockadas geradas.`);
</script>



<style scoped></style>
