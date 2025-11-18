<template>
  <v-container class="pa-8">
    <v-row align="center" justify="space-between" class="mb-8">
      <v-col cols="12" md="6">
        <p class="text-caption text-grey-darken-1 mb-1">Meu Painel</p>
        <p class="text-h6 font-weight-regular mb-0">
          Olá, Gestor Silva, Aqui Está o Resumo de Suas Operações.
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
          style="border: 1px solid #CDCDCD; background-color: white; border-radius: 12px;"
        >
          <div class="d-flex justify-space-between align-center mb-3">
            <p class="text-subtitle-1 font-weight-medium mb-0">{{ card.title }}</p>
            <v-icon color="grey-darken-2" size="20" v-if="card.title === 'Áreas Críticas'">mdi-information-outline</v-icon>
            <v-icon color="grey-darken-2" size="20" v-else-if="card.title === 'Espécies'">mdi-leaf-maple</v-icon>
            <v-icon color="grey-darken-2" size="20" v-else>{{ card.icon }}</v-icon>
          </div>
          <p class="text-h4 font-weight-bold mb-1">{{ card.value }}</p>
          <p class="text-caption text-grey-darken-1">{{ card.subtext }}</p>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mb-6" dense>
      <v-col cols="12" md="5" lg="5">
        <v-card class="pa-4" flat style="border: 1px solid #CDCDCD; background-color: #F6F6F6; border-radius: 12px;">
          <p class="text-subtitle-1 font-weight-bold mb-3 d-flex align-center">
            <v-icon class="mr-2">mdi-map-marker-alert-outline</v-icon>
            Região em risco
          </p>
          <v-skeleton-loader
            height="270"
            type="image"
            class="rounded-lg"
          ></v-skeleton-loader>
        </v-card>
      </v-col>

      <v-col cols="12" md="3" lg="3">
        <v-card class="pa-4" flat style="border: 1px solid #CDCDCD; background-color: white; border-radius: 12px;">
          <p class="text-subtitle-1 font-weight-bold mb-3 d-flex align-center">
            <v-icon class="mr-2">mdi-chart-bar</v-icon>
            Podas por mês
          </p>
          <v-skeleton-loader
            height="270"
            type="image"
            class="rounded-lg"
          ></v-skeleton-loader>
        </v-card>
      </v-col>

      <v-col cols="12" md="4" lg="4">
        <v-card class="pa-4" flat style="border: 1px solid #CDCDCD; background-color: white; border-radius: 12px;">
          <p class="text-subtitle-1 font-weight-bold mb-3 d-flex align-center">
            <v-icon class="mr-2">mdi-alert-outline</v-icon>
            Árvores em risco
          </p>

          <v-card
            v-for="(alert, i) in alerts"
            :key="i"
            class="pa-3 mb-2 rounded-lg alert-card"
            :color="alert.color"
            flat
          >
            <p class="text-subtitle-2 font-weight-medium mb-1">{{ alert.address }}</p>
            <p class="text-caption text-grey-darken-1 mb-1">{{ alert.distance }}</p>
            <p class="text-caption font-weight-medium" :style="{ color: alert.textColor }">Poda urgente</p>
          </v-card>
        </v-card>
      </v-col>
    </v-row>

    <v-row dense>
      <v-col cols="12" md="6">
        <v-card flat class="pa-4" style="border: 1px solid #CDCDCD; background-color: #F6F6F6; border-radius: 12px;">
          <p class="text-subtitle-1 font-weight-bold mb-3 d-flex align-center">
            <v-icon class="mr-2">mdi-leaf-maple</v-icon>
            Espécies por localidade
          </p>
          <v-skeleton-loader
            height="270"
            type="image"
            class="rounded-lg"
          ></v-skeleton-loader>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card flat class="pa-4" style="border: 1px solid #CDCDCD; background-color: white; border-radius: 12px;">
          <p class="text-subtitle-1 font-weight-bold mb-4">
            Últimos Relatórios de Poda
          </p>
          <v-data-table
            :headers="reportHeaders"
            :items="reportItems"
            hide-default-footer
            hide-default-header
            class="report-table"
          >
            <thead>
            <tr>
              <th class="text-left text-caption text-grey-darken-1 font-weight-medium py-3">Localização</th>
              <th class="text-left text-caption text-grey-darken-1 font-weight-medium py-3">Status</th>
              <th class="text-left text-caption text-grey-darken-1 font-weight-medium py-3">Árvore</th>
            </tr>
            </thead>
            <template #item="{ item }">
              <tr class="report-row">
                <td class="pt-2">
                  <p class="text-body-2 font-weight-medium mb-0">{{ item.localizacao.split('\n')[0] }}</p>
                  <p class="text-caption text-grey-darken-1 mt-0">{{ item.localizacao.split('\n')[1] }}</p>
                </td>
                <td>
                  <v-chip
                    :color="getStatusColor(item.status)"
                    size="small"
                    label
                    class="font-weight-medium"
                    style="border: 1px solid #E0E0E0; border-radius: 6px; padding: 0 8px;"
                    :style="{ backgroundColor: getStatusColor(item.status) }"
                  >
                    {{ item.status }}
                  </v-chip>
                </td>
                <td class="text-body-2 font-weight-regular">{{ item.acao }}</td>
              </tr>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";

// Interfaces de tipagem para o Backend (melhor organização e segurança)

interface MetricCard {
  title: string;
  value: string;
  subtext: string;
  icon: string;
}

interface Alert {
  address: string;
  distance: string;
  color: string;
  textColor: string;
}

interface ReportItem {
  localizacao: string;
  status: 'Pendente' | 'Em progresso' | 'Concluída';
  acao: string;
}

interface ReportHeader {
  title: string;
  key: string;
}


export default defineComponent({
  name: "HomeGestorView",
  setup() {
    const search = ref("");

    // Use a tipagem MetricCard[]
    const metricCards: MetricCard[] = [
      {
        title: "Árvores Cadastradas",
        value: "90",
        subtext: "+3 este mês",
        icon: "mdi-content-duplicate",
      },
      {
        title: "Podas Agendadas",
        value: "240",
        subtext: "+7 este mês",
        icon: "mdi-home-plus-outline",
      },
      {
        title: "Áreas Críticas",
        value: "156",
        subtext: "3 requerem atenção imediata",
        icon: "mdi-information-outline",
      },
      {
        title: "Espécies",
        value: "156",
        subtext: "Catalogadas",
        icon: "mdi-sprout",
      },
    ];

    // Use a tipagem Alert[]
    const alerts: Alert[] = [
      {
        address: "Rua das acacias 234",
        distance: "Ipê - 3.2m da rede",
        color: "#FBE0E3", // Vermelho claro/Rosa
        textColor: "#C80C34", // Cor do texto 'Poda urgente' em vermelho escuro
      },
      {
        address: "Rua das acacias 234",
        distance: "Ipê - 3.2m da rede",
        color: "#FDFD98", // Amarelo
        textColor: "#A58C00", // Cor do texto 'Poda urgente' em verde/marrom
      },
      {
        address: "Rua das acacias 234",
        distance: "Ipê - 3.2m da rede",
        color: "#FBE0E3", // Vermelho claro/Rosa
        textColor: "#C80C34", // Cor do texto 'Poda urgente' em vermelho escuro
      },
    ];

    // Use a tipagem ReportHeader[]
    const reportHeaders: ReportHeader[] = [
      { title: "Localização", key: "localizacao" },
      { title: "Status", key: "status" },
      { title: "Árvore", key: "acao" },
    ];

    // Use a tipagem ReportItem[]
    const reportItems: ReportItem[] = [
      { localizacao: "Rua das Flores, 123\n2024-11-08", status: "Pendente", acao: "0483478" },
      { localizacao: "Av. Central, 456\n2024-11-07", status: "Em progresso", acao: "4T456Y5" },
      { localizacao: "Praça da Paz, s/n\n2024-11-09", status: "Concluída", acao: "0345T7578" },
    ];

    const performSearch = () => {
      // **TODO:** Implementar a lógica de filtragem/busca de dados no backend
      console.log("Pesquisando:", search.value);
    };

    const getStatusColor = (status: ReportItem['status']): string => {
      switch (status) {
        case "Pendente":
          return "#AFCDFF"; // Azul claro
        case "Em progresso":
          return "#DCDCDC"; // Cinza claro
        case "Concluída":
          return "#B3E8A3"; // Verde claro
        default:
          return "#FFFFFF";
      }
    };

    // **Dica para Backend:** Para buscar os dados:
    /*
    // Exemplo de função para buscar dados da API
    const fetchDashboardData = async () => {
        try {
            // Supondo que você tenha o axios configurado globalmente ou importado
            // const response = await axios.get('/api/dashboard/summary');
            // metricCards.value = response.data.metrics;
            // alerts.value = response.data.alerts;
            // reportItems.value = response.data.reports;
        } catch (error) {
            console.error("Erro ao buscar dados do dashboard:", error);
        }
    };
    // Chama a função no lifecycle hook 'onMounted'
    // import { onMounted } from 'vue';
    // onMounted(fetchDashboardData);
    */

    return {
      search,
      metricCards,
      alerts,
      reportHeaders,
      reportItems,
      performSearch,
      getStatusColor,
    };
  },
});
</script>

<style scoped>
/* Estilo geral dos cards métricos */
.metric-card {
  transition: box-shadow 0.2s ease;
}

/* Estilo dos cards de alerta (árvores em risco) */
.alert-card {
  border: 1px solid #E0E0E0; /* Borda sutil como na imagem */
  box-shadow: none;
  /* Remove a cor de fundo padrão, a cor será definida pela prop 'color' */
  background-color: transparent !important;
}

/* Estilo para a tabela de relatórios */
.report-table {
  background-color: white !important;
}

/* Remove a borda padrão das células (th e td) */
.report-table :deep(td),
.report-table :deep(th) {
  border: none !important;
  padding-left: 0 !important;
  padding-right: 16px !important;
}

/* Adiciona a borda inferior cinza sutil como na imagem */
.report-table :deep(tr) {
  border-bottom: 1px solid #E0E0E0 !important;
}

/* Estilo da última linha (sem borda inferior) */
.report-table :deep(tr:last-child) {
  border-bottom: none !important;
}

/* Estilo da linha de dados, garantindo padding vertical para a data */
.report-row {
  padding-top: 8px;
  padding-bottom: 8px;
}

/* Ajuste da altura e estilo do botão de busca */
.search-button {
  background-color: black !important;
  color: white !important;
  height: 40px;
  border-radius: 8px;
  margin-right: -12px; /* Ajusta o botão para ficar colado no campo */
}

/* Ajuste do campo de pesquisa para acomodar o botão */
.search-input :deep(.v-field__append-inner) {
  align-items: center;
  padding-top: 0;
  padding-bottom: 0;
  margin-left: 0;
}

/* Ajuste da tipografia */
.text-caption {
  line-height: 1.2;
}
</style>
