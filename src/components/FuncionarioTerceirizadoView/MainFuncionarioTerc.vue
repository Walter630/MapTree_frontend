<template>
    <v-container class="pa-8" >
      <v-row align="center" justify="space-between" class="mb-8">
        <v-col cols="12" md="6">
          <p class="text-caption text-grey-darken-1 mb-1">Meu Painel</p>
          <p class="text-h6 font-weight-regular mb-0">
            Olá, Técnico, Aqui Está o Resumo de Suas Operações.
          </p>
        </v-col>

        <v-col cols="12" md="6" class="d-flex justify-end">
          <div style="width: 400px; max-width: 100%;">
            <v-text-field
              v-model="search"
              placeholder="Pesquisar"
              density="comfortable"
              variant="outlined"
              prepend-inner-icon="mdi-magnify"
              hide-details
              class="search-input"
            >
              <template #append-inner>
                <v-btn
                  class="search-button"
                  @click="performSearch"
                  flat
                >
                  Buscar
                </v-btn>
              </template>
            </v-text-field>
          </div>
        </v-col>
      </v-row>

      <v-row class="mb-6" dense>
        <v-col cols="12" sm="6" md="3" v-for="(card, i) in metricCards" :key="i">
          <v-card
            class="pa-5 metric-card"
            flat
            style="border: 1px solid #CDCDCD; background-color: #F6F6F6; border-radius: 12px;"
          >
            <div class="d-flex justify-space-between align-center mb-3">
              <p class="text-subtitle-1 font-weight-medium mb-0">{{ card.title }}</p>
              <v-icon color="grey-darken-2" size="20">{{ card.icon }}</v-icon>
            </div>
            <p class="text-h4 font-weight-bold mb-1">{{ card.value }}</p>
            <p class="text-caption text-grey-darken-1">{{ card.subtext }}</p>
          </v-card>
        </v-col>
      </v-row>

      <v-row class="mb-6" dense>
        <v-col cols="12" md="8">
          <v-card class="pa-4" flat style="border: 1px solid #CDCDCD; background-color: white; border-radius: 12px; height: 607px; width: 100%">
            <p class="text-subtitle-1 font-weight-medium mb-3 d-flex align-center">
              <v-icon size="18" class="mr-2">mdi-map-marker-path</v-icon>
              Rota de Poda do Dia
            </p>

            <p class="text-caption text-grey-darken-1 mb-3">4 locais para visitar hoje</p>

            <div style="position: relative; height: 398px; width: 100%;">
              <PruningMap :tasks="tasks" />

              <div class="map-overlay-status">

              </div>
            </div>

            <v-row dense class="pt-2">
              <v-col cols="12" sm="6">
                <p class="text-body-2 font-weight-medium mb-0">Distância total: <span class="font-weight-regular">{{ mapInfo.totalDistance }}</span></p>
              </v-col>
              <v-col cols="12" sm="6">
                <p class="text-body-2 font-weight-medium mb-0">Tempo estimado: <span class="font-weight-regular">{{ mapInfo.estimatedTime }}</span></p>
              </v-col>
            </v-row>
          </v-card>
        </v-col>

        <v-col cols="12" md="4">
          <v-card class="pa-4 h-100" flat style="border: 1px solid #CDCDCD; background-color: white; border-radius: 12px;">
            <p class="text-subtitle-1 font-weight-medium mb-3 d-flex align-center">
              <v-icon size="18" class="mr-2">mdi-list-box-outline</v-icon>
              Lista de Tarefas
            </p>

            <div
              v-for="(task, i) in tasks"
              :key="i"
              class="task-item pa-3 mb-2 rounded-lg"
            >
              <div class="d-flex justify-space-between align-start mb-1">
                <p class="text-body-2 font-weight-medium mb-0">{{ task.address }}</p>
                <v-chip
                  :color="task.tag.color"
                  size="small"
                  label
                  class="font-weight-medium task-tag"
                  :style="{ backgroundColor: task.tag.bgColor, color: task.tag.color }"
                >
                  {{ task.tag.text }}
                </v-chip>
              </div>
              <p class="text-caption text-grey-darken-1 mb-1">{{ task.details }}</p>
              <v-divider/>
              <v-btn
                v-if="task.status === 'agendada'"
                color="#C1E32899"
                size="small"
                flat
                class="font-weight-bold task-action-btn"
                @click="startTask(i)"
              >
                Iniciar
              </v-btn>
              <div v-else-if="task.status === 'em_progresso'" class="d-flex align-center mt-2">
                <v-progress-linear
                  model-value="60"
                  height="6"
                  color="#FDFD98"
                  rounded
                  class="mr-3"
                ></v-progress-linear>
                <v-btn
                  color="#C1E32899"
                  size="small"
                  flat
                  class="font-weight-bold task-action-btn"
                  @click="completeTask(i)"
                >
                  Concluir
                </v-btn>
              </div>
              <p v-else-if="task.status === 'concluida'" class="text-caption font-weight-medium mt-2" style="background-color: #B3E8A3; height: 24px; width: 100px; border-radius: 9px; text-align: center;">
                Concluída
              </p>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <v-row dense>
        <v-col cols="12" md="6">
          <v-card flat class="pa-4 h-100" style="border: 1px solid #CDCDCD; background-color: white; border-radius: 12px;">
            <p class="text-subtitle-1 font-weight-medium mb-3 d-flex align-center">
              <v-icon size="18" class="mr-2">mdi-chart-bar</v-icon>
              Status por Região
            </p>

            <div v-for="(region, i) in regionsStatus" :key="i" class="region-status-item py-2">
              <p class="text-body-2 font-weight-medium mb-1">{{ region.name }}</p>
              <v-progress-linear
                :model-value="(region.completed / region.total) * 100"
                height="8"
                color="green"
                rounded
              ></v-progress-linear>
              <div class="d-flex justify-space-between text-caption mt-1 text-grey-darken-1">
                <p>
                  <span class="font-weight-medium text-black">{{ region.pending }}</span> pendentes |
                  <span class="font-weight-medium text-black">{{ region.inProgress }}</span> em execução |
                  <span class="font-weight-medium text-black">{{ region.completed }}</span> concluídas
                </p>
                <p>{{ region.completed }}/{{ region.total }}</p>
              </div>
            </div>
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card flat class="pa-4 h-100" style="border: 1px solid #CDCDCD; background-color: white; border-radius: 12px;">
            <p class="text-subtitle-1 font-weight-medium mb-4 d-flex align-center">
              <v-icon size="18" class="mr-2">mdi-chart-pie</v-icon>
              Status de Podas
            </p>

            <div class="d-flex justify-center align-center chart-container" style="margin-top: 20px; margin-bottom: 20px;">
              <DonutChart :data="chartData" />
            </div>

            <div class="d-flex justify-center flex-wrap mt-4 pt-2" style="gap: 12px;">

              <p class="text-caption text-grey-darken-1">
                <span class="chart-legend-color" style="background-color: #AFCDFF;"></span>
                Agendadas ({{ chartData.agendadas }})
              </p>
              <p class="text-caption text-grey-darken-1">
                <span class="chart-legend-color" style="background-color: #B3E8A3;"></span>
                Pendentes ({{ chartData.pendentes }})
              </p>
              <p class="text-caption text-grey-darken-1">
                <span class="chart-legend-color" style="background-color: #556B8D;"></span>
                Em Execução ({{ chartData.execucao }})
              </p>
              <p class="text-caption text-grey-darken-1">
                <span class="chart-legend-color" style="background-color: #007BFF;"></span>
                Concluídas ({{ chartData.concluidas }})
              </p>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </template>

  <script lang="ts">
  import { defineComponent, ref, computed } from "vue";
  import DonutChart from "./GraficosView/DonutChart.vue";
  import PruningMap from './MapsView/PruningMap.vue';

  // Interfaces de tipagem
  interface MetricCard {
    title: string;
    value: string;
    subtext: string;
    icon: string;
  }

  interface Task {
    address: string;
    details: string;
    status: 'agendada' | 'em_progresso' | 'concluida';
    tag: {
      text: string;
      color: string;
      bgColor: string;
    };
    lat: number;
    lng: number;
  }

  interface RegionStatus {
    name: string;
    pending: number;
    inProgress: number;
    completed: number;
    total: number;
  }

  interface MapInfo {
    totalDistance: string;
    estimatedTime: string;
  }

  interface ChartData {
    agendadas: number;
    pendentes: number;
    execucao: number;
    concluidas: number;
  }

  export default defineComponent({
    name: "HomeTerceirizadoView",
    components: { DonutChart, PruningMap },
    setup() {
      const search = ref("");

      const metricCards: MetricCard[] = [
        { title: "Podas Agendadas", value: "40", subtext: "Agendadas para hoje", icon: "mdi-calendar-check-outline" },
        { title: "Pendentes", value: "40", subtext: "Aguardando execução", icon: "mdi-alert-circle-outline" },
        { title: "Em Execução", value: "0", subtext: "Ativas no momento", icon: "mdi-clock-outline" },
        { title: "Concluídas", value: "0", subtext: "Finalizadas hoje", icon: "mdi-check-circle-outline" },
      ];

      const mapInfo: MapInfo = {
        totalDistance: "11.7 km",
        estimatedTime: "6 horas",
      };

      const tasks = ref<Task[]>([

      ]);

      const regionsStatus: RegionStatus[] = [
        { name: "Zona Norte", pending: 12, inProgress: 3, completed: 8, total: 23 },
        { name: "Zona Sul", pending: 12, inProgress: 3, completed: 8, total: 25 },
        { name: "Centro", pending: 12, inProgress: 3, completed: 8, total: 31 },
        { name: "Zona Leste", pending: 12, inProgress: 3, completed: 8, total: 21 },
      ];

      const chartData = ref<ChartData>({
        agendadas: 40,
        pendentes: 30,
        execucao: 10,
        concluidas: 20,
      });

      // Computed que gera o formato esperado pelo DonutChart
      const chartDataset = computed(() => ({
        labels: ['Agendadas', 'Pendentes', 'Em Execução', 'Concluídas'],
        datasets: [
          {
            data: [
              chartData.value.agendadas,
              chartData.value.pendentes,
              chartData.value.execucao,
              chartData.value.concluidas
            ],
            backgroundColor: ['#AFCDFF', '#B3E8A3', '#556B8D', '#007BFF'],
            borderColor: ['transparent', 'transparent', 'transparent', 'transparent'],
            borderWidth: 0
          }
        ]
      }));

      const startTask = (index: number) => {
        const t = tasks.value?.[index];
        if (!t) return;
        t.status = 'em_progresso';
        console.log(`Tarefa ${index} iniciada.`);
      };

      const completeTask = (index: number) => {
        const t = tasks.value?.[index];
        if (!t) return;
        t.status = 'concluida';
        console.log(`Tarefa ${index} concluída.`);
      };

      const performSearch = () => {
        console.log("Pesquisando:", search.value);
      };

      return {
        search,
        metricCards,
        mapInfo,
        tasks,
        regionsStatus,
        chartData,
        chartDataset,
        performSearch,
        startTask,
        completeTask
      };
    },
  });
  </script>

  <style scoped>
  /* Estilo para a barra de pesquisa */
  .search-button {
    background-color: black !important;
    color: white !important;
    height: 40px;
    border-radius: 8px;
    margin-right: -12px; /* Ajusta o botão para ficar colado no campo */
  }

  .search-input :deep(.v-field__append-inner) {
    align-items: center;
    padding-top: 0;
    padding-bottom: 0;
    margin-left: 0;
  }

  /* Estilo geral dos cards */
  .metric-card, .task-item {
    box-shadow: none; /* Remove box-shadow padrão para um visual mais clean */
  }

  /* Estilo para os itens da Lista de Tarefas */
  .task-item {
    border: 1px solid #E0E0E0;
    background-color: white;
  }

  /* Botões de ação dentro da lista de tarefas */
  .task-action-btn {
    border-radius: 8px;
    text-transform: none; /* Manter a capitalização original (Iniciar/Concluir) */
    padding: 0 16px;
  }
  /* HomeTerceirizadoView.vue - DENTRO DE <style scoped> */

  /* NOVO ESTILO: Ajusta o container do mapa e a tag de status */
  .map-overlay-status {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none; /* Permite interagir com o mapa por baixo do div */
    z-index: 2; /* Garante que fique acima do mapa (z-index: 1) */
  }

  .completion-tag {
    /* Mantenha o estilo do seu completion-tag aqui */
    position: absolute;
    top: 20px; /* Ajuste para o canto superior direito */
    right: 20px;
    background-color: #B3E8A3;
    color: black;
    padding: 4px 8px;
    border-radius: 4px;
    font-weight: bold;
    font-size: 0.8rem;
    line-height: 1;
    pointer-events: auto; /* Permite que o usuário interaja com o tag se precisar */
  }

  /* REMOVA o estilo map-overlay antigo, pois ele não é mais necessário */
  /*
  .map-overlay {
      ... REMOVER ...
  }
  */
  /* Tag de prioridade */
  .task-tag {
    border: 1px solid #E0E0E0;
    padding: 0 8px;
    height: 24px;
  }

  /* Estilo para o mapa (simulação de overlay) */
  .map-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center; /* Ajuste se quiser o carro no centro */
    /* Adicione mais estilos se for necessário um ícone de carro, por exemplo */
  }

  .completion-tag {
    position: absolute;
    top: 40%; /* Ajuste a posição do 45% */
    right: 25%;
    background-color: #B3E8A3; /* Cor verde/amarela da imagem */
    color: black;
    padding: 4px 8px;
    border-radius: 4px;
    font-weight: bold;
    font-size: 0.8rem;
    line-height: 1;
  }

  /* Estilo para os itens de Status por Região */
  .region-status-item {
    border-bottom: 1px solid #E0E0E0;
  }
  .region-status-item:last-child {
    border-bottom: none;
  }

  /* Estilo para as legendas do gráfico de rosca */
  .chart-legend-color {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-right: 5px;
  }

  /* Garantir que o v-col de Tarefas ocupe a altura restante no MD/LG */
  @media (min-width: 960px) {
    .h-100 {
      height: 100%;
    }
  }

  </style>
