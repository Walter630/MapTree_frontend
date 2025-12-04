<script lang="ts">
// Caminho: src/components/FuncionarioTerceirizadoView/MockTrees/mockTrees.ts

// 🔥 CORREÇÃO: Adicione 'export' na frente da interface
export interface CityTreeLocation {
  id?: string | number;
  lat: number;
  lng: number;
  address: string;
  status: 'agendada' | 'em_progresso' | 'concluida';
  tree_type?: string;
}

// O restante da sua função generateMockTrees...
const generateMockTrees = (centerLat: number, centerLng: number, count: number): CityTreeLocation[] => {
  // ... (código da geração mantido)
  const mockData: CityTreeLocation[] = [];
  const statuses = ['agendada', 'em_progresso', 'concluida'];
  const types = ['Ipê Roxo', 'Pau Ferro', 'Jatobá', 'Flamboyant', 'Mangueira'];

  for (let i = 0; i < count; i++) {
    const lat = centerLat + (Math.random() - 0.5) * 0.05;
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

const LIM_NORTE_LAT = -5.1438;
const LIM_NORTE_LNG = -38.0850;

export const MOCK_CITY_TREES: CityTreeLocation[] = generateMockTrees(LIM_NORTE_LAT, LIM_NORTE_LNG, 500);

console.log(`${MOCK_CITY_TREES.length} árvores mockadas geradas.`);
</script>



<style scoped></style>
