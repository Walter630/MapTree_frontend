<template>
  <v-container class="pa-6" style="margin: 30px; padding: 20px;">
    <v-row align="center" justify="space-between" class="mb-4">
      <v-col cols="12" md="6" class="py-0">
        <p class="text-caption text-grey-darken-1 mb-1">Meu Painel</p>
        <p class="text-h6 font-weight-regular mb-0">Olá, Gertar Silva, Aqui Está o Resumo de Suas Operações.</p>
      </v-col>

      <v-col cols="12" md="6" class="d-flex justify-end py-0">
        <div style="width: 300px; max-width: 100%;">
          <v-text-field
            v-model="search"
            placeholder="Pesquisar"
            hide-details
            density="compact"
            variant="outlined"
            prepend-inner-icon="mdi-magnify"
            class="search-field"
          >
            <template #append-inner>
              <v-btn
                style="background-color: black; color: white; height: 40px; margin-right: -12px;"
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

    <v-row class="mt-4" style="margin-top: 20px;">
      <v-col cols="12" sm="6" lg="3">
        <v-card class="pa-4 card-metric" style="border: 1px solid #E0E0E0" flat>
          <div class="d-flex justify-space-between align-center mb-4">
            <p class="text-subtitle-1 font-weight-medium mb-0">Árvores Cadastradas</p>
            <v-icon small>mdi-content-duplicate</v-icon>
          </div>
          <p class="text-h4 font-weight-bold mb-1">90</p>
          <p class="text-caption ">+ 3 este mês</p>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" lg="3">
        <v-card class="pa-4 card-metric" style="border: 1px solid #E0E0E0" flat>
          <div class="d-flex justify-space-between align-center mb-4">
            <p class="text-subtitle-1 font-weight-medium mb-0">Podas Agendadas</p>
            <v-icon small>mdi-home-plus-outline</v-icon>
          </div>
          <p class="text-h4 font-weight-bold mb-1">240</p>
          <p class="text-caption ">+ 7 este mês</p>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" lg="3">
        <v-card class="pa-4 card-metric" style="border: 1px solid #E0E0E0" flat>
          <div class="d-flex justify-space-between align-center mb-4">
            <p class="text-subtitle-1 font-weight-medium mb-0">Áreas Críticas</p>
            <v-icon small>mdi-heart-broken-outline</v-icon>
          </div>
          <p class="text-h4 font-weight-bold mb-1">156</p>
          <p class="text-caption ">3 requerem atenção imediata</p>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" lg="3">
        <v-card class="pa-4 card-metric" style="border: 1px solid #E0E0E0" flat>
          <div class="d-flex justify-space-between align-center mb-4">
            <p class="text-subtitle-1 font-weight-medium mb-0">Espécies</p>
            <v-icon small>mdi-sprout</v-icon>
          </div>
          <p class="text-h4 font-weight-bold mb-1">156</p>
          <p class="text-caption ">catalogadas</p>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <v-col cols="12" lg="8">
        <v-card flat height="350px" class="pa-4" style="border: 1px solid #E0E0E0"></v-card>
      </v-col>

      <v-col cols="12" lg="4">
        <v-card flat class="pa-4" style="border: 1px solid #E0E0E0">
          <p class="text-subtitle-1 font-weight-bold mb-3 d-flex align-center">
            <v-icon  class="mr-2">mdi-alert-outline</v-icon>
            Árvores em Risco
          </p>

          <v-card class="pa-3 mb-2" color="red-lighten-5" style="border: 1px solid #E0E0E0" flat >
            <p class="text-subtitle-2 font-weight-medium">Rua das acácias 234</p>
            <p class="text-caption text-grey-darken-1 mb-1">Tel - 3.2m de rede</p>
            <p class="text-caption text-red-darken-2 font-weight-medium">Poda urgente</p>
          </v-card>

          <v-card class="pa-3 mb-2" color="orange-lighten-5" style="border: 1px solid #E0E0E0" flat>
            <p class="text-subtitle-2 font-weight-medium">Rua das acácias 234</p>
            <p class="text-caption text-grey-darken-1 mb-1">Tel - 3.2m de rede</p>
            <p class="text-caption text-red-darken-2 font-weight-medium">Poda urgente</p>
          </v-card>

          <v-card class="pa-3" color="orange-lighten-5" style="border: 1px solid #E0E0E0" flat>
            <p class="text-subtitle-2 font-weight-medium">Rua das acácias 234</p>
            <p class="text-caption text-grey-darken-1 mb-1">Tel - 3.2m de rede</p>
            <p class="text-caption text-red-darken-2 font-weight-medium">Poda urgente</p>
          </v-card>

        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <v-col cols="12" lg="6">
        <v-card flat height="300px" style="border: 1px solid #E0E0E0" class="pa-4"></v-card>
      </v-col>

      <v-col cols="12" lg="6">
        <v-card flat class="pa-4" style="border: 1px solid #E0E0E0">
          <p class="text-subtitle-1 font-weight-bold mb-4">Últimos Relatórios de Poda</p>

          <v-data-table
            :headers="reportHeaders"
            :items="reportItems"
            hide-default-footer
            hide-default-header
            class="report-table"
          >
            <template #item.status="{ item }">
              <v-chip :color="getStatusColor(item.status)" size="small" label class="font-weight-medium" style="border: 1px solid #E0E0E0; border-radius: 5px;"  >
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
import { defineComponent, ref } from 'vue';
// Importações de vue-router e stores removidas, pois não são essenciais para o layout.

interface ReportItem {
  localizacao: string;
  status: 'Pendente' | 'Em Progresso' | 'Concluída';
  acao: string;
}

export default defineComponent({
  name: 'HomeGestorView',
  data() {
    return {
      search: ref(''),

      // Dados para a Tabela de Relatórios
      reportHeaders: [
        { title: 'Localização', key: 'localizacao', sortable: false },
        { title: 'Status', key: 'status', sortable: false },
        { title: 'Ações', key: 'acao', sortable: false, align: 'end' },
      ],
      reportItems: [
        { localizacao: 'Rua das Flores, 123 \n 2024-11-08', status: 'Pendente', acao: '0465478' },
        { localizacao: 'Av. Central, 456 \n 2024-11-07', status: 'Em Progresso', acao: '4T456Y5' },
        { localizacao: 'Praça da Paz, s/n \n 2024-11-06', status: 'Concluída', acao: '0345T7576' },
      ] as ReportItem[],
    };
  },
  methods: {
    // Função para simular a pesquisa
    performSearch() {
      console.log('Pesquisando por:', this.search);
    },

    // Função para retornar a cor do chip de status
    getStatusColor(status: string): string {
      switch (status) {
        case 'Pendente':
          return 'yellow-lighten-4';
        case 'Em Progresso':
          return 'blue-lighten-4';
        case 'Concluída':
          return 'green-lighten-4';
        default:
          return 'grey-lighten-4';
      }
    },
    // Removida a função clearSearch, pois a busca é direta
  },
});
</script>

<style scoped>
/* Estilos para cards de métricas */
.card-metric {
  /* Borda sutil para separar, semelhante à imagem */
  border: 1px solid #f0f0f0;
  /* Fundo ligeiramente off-white */
  background-color: #FAFAFA;
}

/* Ajuste para o campo de busca ficar na mesma linha que o botão */
.search-field :deep(.v-input__append-inner) {
  align-items: center;
  margin-top: 0 !important;
  margin-right: 0 !important; /* Remove margem padrão */
  padding-left: 8px; /* Espaçamento entre o ícone e o botão */
}

/* Estilo para remover bordas da tabela de relatórios */
.report-table :deep(.v-table) {
  border-style: none !important;
}

.report-table :deep(th) {
  /* Oculta o cabeçalho se hide-default-header estiver em uso, mas se precisar forçar: */
  display: none;
}
</style>
