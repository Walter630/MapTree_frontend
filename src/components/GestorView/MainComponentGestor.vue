<template>
  <v-container class="pa-8" fluid>
    <!-- Cabeçalho -->
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
          >
            <template #append-inner>
              <v-btn
                style="background-color: black; color: white; height: 40px; border-radius: 8px;"
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

    <!-- Cards métricos -->
    <v-row class="mb-6" dense>
      <v-col cols="12" sm="6" md="3" v-for="(card, i) in metricCards" :key="i">
        <v-card class="pa-5 metric-card"  flat>
          <div class="d-flex justify-space-between align-center mb-3">
            <p class="text-subtitle-1 font-weight-medium mb-0">{{ card.title }}</p>
            <v-icon color="grey-darken-2" size="20">{{ card.icon }}</v-icon>
          </div>
          <p class="text-h4 font-weight-bold mb-1">{{ card.value }}</p>
          <p class="text-caption text-grey-darken-1">{{ card.subtext }}</p>
        </v-card>
      </v-col>
    </v-row>

    <!-- Região em risco + Podas por mês + Árvores em risco -->
    <v-row class="mb-6" dense>
      <v-col cols="12" md="5" lg="5">
        <v-card class="pa-4" flat style="background-color: #F6F6F6; border: 1px solid #CDCDCD; border-radius: 12px;">
          <p class="text-subtitle-1 font-weight-bold mb-3 d-flex align-center">
            <v-icon class="mr-2">mdi-map-marker-alert-outline</v-icon>
            Região em risco
          </p>
          <v-img

            height="270"
            cover
            class="rounded-lg"
          ></v-img>
        </v-card>
      </v-col>

      <v-col cols="12" md="3" lg="3">
        <v-card class="pa-4" flat style="background-color: #F6F6F6; border: 1px solid #CDCDCD; border-radius: 12px;">
          <p class="text-subtitle-1 font-weight-bold mb-3 d-flex align-center">
            <v-icon class="mr-2">mdi-chart-bar</v-icon>
            Podas por mês
          </p>
          <v-img

            height="270"
            contain
            class="rounded-lg"
          ></v-img>
        </v-card>
      </v-col>

      <v-col cols="12" md="4" lg="4">
        <v-card class="pa-4" flat style="background-color: #F6F6F6; border: 1px solid #CDCDCD; border-radius: 12px;">
          <p class="text-subtitle-1 font-weight-bold mb-3 d-flex align-center">
            <v-icon class="mr-2">mdi-alert-outline</v-icon>
            Árvores em risco
          </p>

          <v-card
            v-for="(alert, i) in alerts"
            :key="i"
            class="pa-3 mb-2 rounded-lg"
            :color="alert.color"
            style="border: 1px solid #E0E0E0; box-shadow: none"
          >
            <p class="text-subtitle-2 font-weight-medium">{{ alert.address }}</p>
            <p class="text-caption text-grey-darken-1 mb-1">{{ alert.distance }}</p>
            <p class="text-caption text-red-darken-2 font-weight-medium">Poda urgente</p>

          </v-card>
        </v-card>
      </v-col>
    </v-row>

    <!-- Espécies por localidade + Últimos relatórios -->
    <v-row dense>
      <v-col cols="12" md="6">
        <v-card flat class="pa-4" style="background-color: #F6F6F6; border: 1px solid #CDCDCD; border-radius: 12px;">
          <p class="text-subtitle-1 font-weight-bold mb-3 d-flex align-center">
            <v-icon class="mr-2">mdi-leaf-maple</v-icon>
            Espécies por localidade
          </p>
          <v-img

            height="270"
            cover
            class="rounded-lg"
          ></v-img>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card flat class="pa-4" style="background-color: #F6F6F6; border: 1px solid #CDCDCD; border-radius: 12px;">
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
            <template #item.status="{ item }">
              <v-chip
                :color="getStatusColor(item.status)"
                size="small"
                label
                class="font-weight-medium"
                style="border: 1px solid #E0E0E0; border-radius: 6px;"
              >
                {{ item.status }}
              </v-chip>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";

export default defineComponent({
  name: "HomeGestorView",
  setup() {
    const search = ref("");

    const metricCards = [
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
        icon: "mdi-heart-broken-outline",
      },
      {
        title: "Espécies",
        value: "156",
        subtext: "Catalogadas",
        icon: "mdi-sprout",
      },
    ];

    const alerts = [
      {
        address: "Rua das acácias 234",
        distance: "Ipê - 3.2m de rede",
        color: "red-lighten-5",
      },
      {
        address: "Rua das acácias 234",
        distance: "Ipê - 3.2m de rede",
        color: "#B3E8A3",
      },
      {
        address: "Rua das acácias 234",
        distance: "Ipê - 3.2m de rede",
        color: "#FDFD98",
      },
    ];

    const reportHeaders = [
      { title: "Localização", key: "localizacao" },
      { title: "Status", key: "status" },
      { title: "Árvore", key: "acao" },
    ];

    const reportItems = [
      { localizacao: "Rua das Flores, 123\n2024-11-08", status: "Pendente", acao: "0483478" },
      { localizacao: "Av. Central, 456\n2024-11-07", status: "Em Progresso", acao: "4T456Y5" },
      { localizacao: "Praça da Paz, s/n\n2024-11-09", status: "Concluída", acao: "0345T7578" },
    ];

    const performSearch = () => {
      console.log("Pesquisando:", search.value);
    };

    const getStatusColor = (status: string) => {
      switch (status) {
        case "Pendente":
          return "background-color: #AFCDFF";
        case "Em Progresso":
          return "background-color: #AFCDFF";
        case "Concluída":
          return "background-color: #B3E8A3";
        default:
          return "background-color: #B3E8A3";
      }
    };

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
.metric-card {
  border: 1px solid #CDCDCD;
  background-color: #F6F6F6;
  border-radius: 12px;
  transition: box-shadow 0.2s ease;
}

.report-table :deep(td) {
  border: none !important;
}

.report-table :deep(tr) {
  border-bottom: 1px solid #E0E0E0 !important;
}

.text-caption {
  line-height: 1.2;
}
</style>
