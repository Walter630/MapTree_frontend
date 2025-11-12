<template>
  <v-container class="relatorios-gerenciais-container" style="margin-top: 20px;">
    <div class="text-caption grey--text text--darken-1 mb-5" style="color: #667085;">
      Meu Painel > #Relatórios
    </div>
    <v-row class="mb-5 align-center">
      <v-col cols="12" sm="auto" class="py-0">
        <v-btn class="mr-4" style="box-shadow: none; border: 1px solid; height: 56px; border-radius: 8px; background-color: #D0D5DD; width: 56px" @click="goBack">
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
      </v-col>

      <v-col cols="12" sm="auto" class="py-0">
        <h1 class="text-h5 font-weight-regular mt-1" style="color: #2F3367; ">
          Relatórios Gerenciais
        </h1>
        <p class="text-subtitle-1 grey--text" style="margin-top: 10px;">
          Visualize, Filtre E Distribua Relatórios Técnicos Detalhados.
        </p>
      </v-col>

      <v-col cols="12" sm="4" offset-sm="3" md="3" offset-md="5" class="d-flex justify-end py-0 search-bar-container">
        <v-text-field
          v-model="search"
          label="Ciclano"
          append-icon="mdi-magnify"
          clearable
          single-line
          hide-details
          outlined
          dense
          class="mr-2 custom-search-field"
        ></v-text-field>
        <v-btn color="black" dark @click="performSearch">
          Buscar
        </v-btn>
      </v-col>
    </v-row>



    <v-card class="pa-4 mb-6" outlined tile style="box-shadow: none; background-color: #F6F6F6; ">
      <v-row align="center">
        <v-col cols="12" class="d-flex align-center pb-2 pt-0">
          <v-icon class="mr-2">mdi-filter-variant</v-icon>
          <div class="text-h6 font-weight-regular">Filtros</div>
        </v-col>

        <v-col cols="12" class="py-5">
          <v-row>
            <v-col cols="12" sm="3" class="py-0">
              <div class="text-caption font-weight-bold grey--text text--darken-1 mb-1">Cidade</div>
              <v-text-field
                v-model="filters.cidade"
                hide-details
                dense
                outlined
                placeholder="Digite a cidade"
              ></v-text-field>
            </v-col>

            <v-col cols="12" sm="3" class="py-0">
              <div class="text-caption font-weight-bold grey--text text--darken-1 mb-1">Status</div>
              <v-select
                v-model="filters.status"
                :items="statusOptions"
                hide-details
                dense
                outlined
                placeholder="Selecione o status"
              ></v-select>
            </v-col>

            <v-col cols="12" sm="2" class="py-0">
              <div class="text-caption font-weight-bold grey--text text--darken-1 mb-1">Período</div>
              <v-text-field
                v-model="filters.dataInicial"
                placeholder="dd/mm/aaaa"
                hide-details
                dense
                outlined
                append-icon="mdi-calendar"
              ></v-text-field>
            </v-col>

            <v-col cols="12" sm="2" class="py-0">
              <div class="text-caption font-weight-bold grey--text text--darken-1 mb-1">&nbsp;</div>
              <v-text-field
                v-model="filters.dataFinal"
                placeholder="dd/mm/aaaa"
                hide-details
                dense
                outlined
                append-icon="mdi-calendar"
              ></v-text-field>
            </v-col>

            <v-col cols="12" sm="2" class="d-flex align-end justify-end py-0">
              <v-btn
                color="#A7D129"
                dark
                large
                @click="generateReport"
                class="white--text font-weight-bold"
                style="height: 40px;"
              >
                Gerar Relatório
              </v-btn>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
    </v-card>

    <v-row class="mb-6" style="margin-top: 40px">
      <v-col cols="12" md="6">
        <v-card class="pa-4" outlined tile style="background-color: #F6F6F6; border: 1px solid #DADADA; box-shadow: none">
          <h3 class="text-h6 mb-3 font-weight-regular">Podas Realizadas por Período</h3>

          <div class="chart-simulation-bar-wrapper">
            <div class="y-axis-labels">
              <span>100</span>
              <span>75</span>
              <span>50</span>
              <span>25</span>
              <span>0</span>
            </div>
            <div class="chart-simulation-bar d-flex align-end">
              <div
                v-for="(item, index) in barData"
                :key="index"
                :style="{ height: item.value + '%', backgroundColor: item.color }"
                class="bar-segment"
              >
              </div>
            </div>
          </div>
          <div class="d-flex justify-space-around mt-2 chart-x-labels">
            <div v-for="(item, index) in barData" :key="index" class="text-caption grey--text text-center">
              {{ item.label }}
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="pa-4" outlined tile style="background-color: #F6F6F6; border: 1px solid #DADADA; box-shadow: none">
          <h3 class="text-h6 mb-3 font-weight-regular">Distribuição por Tipo de Poda</h3>
          <div class="d-flex align-center justify-center py-2" style="height: 250px;">
            <div class="pie-chart-mock mr-8">
              <div class="pie-text-overlay pie-overlay-dark">40%</div>
              <div class="pie-text-overlay pie-overlay-green">35%</div>
              <div class="pie-text-overlay pie-overlay-blue">25%</div>
            </div>
            <div class="chart-legend">
              <div v-for="(leg, i) in pieLegend" :key="i" class="d-flex align-center mb-1">
                <div :style="{ backgroundColor: leg.color }" class="legend-box mr-2"></div>
                <div>
                  <span class="text-caption font-weight-bold">{{ leg.value }}</span><br>
                  <span class="text-caption grey--text text--darken-1">{{ leg.label }}</span>
                </div>
              </div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-card class="pa-4" outlined tile style="box-shadow: none; background-color: #F6F6F6; ">
      <h3 class="text-h6 mb-3 font-weight-regular">Resumo das Atividades Executadas</h3>

      <v-list dense class="py-0 resumo-list">
        <v-list-item
          v-for="(item, index) in resumoData"
          :key="index"
          class="resumo-item"
        >
          <v-list-item-content class="py-2">
            <v-row align="center" >
              <v-col cols="12" sm="3" class="d-flex align-center">
                <v-icon class="mr-3 green--text text--lighten-1" style="box-shadow: none; background-color: #A7D129;">mdi-content-paste</v-icon>
                <div>
                  <v-list-item-title class="font-weight-medium">{{ item.atividade }}</v-list-item-title>
                  <v-list-item-subtitle>{{ item.endereco }}</v-list-item-subtitle>
                </div>
              </v-col>

              <v-col cols="12" sm="2">
                <div class="text-caption grey--text text--darken-1" style="font-weight: bold;">Técnico</div>
                <v-list-item-subtitle>{{ item.tecnico }}</v-list-item-subtitle>
              </v-col>

              <v-col cols="12" sm="2">
                <div class="text-caption grey--text text--darken-1" style="font-weight: bold">Data</div>
                <v-list-item-subtitle>{{ item.data }}</v-list-item-subtitle>
              </v-col>

              <v-col cols="12" sm="1">
                <div class="text-caption grey--text text--darken-1" style="font-weight: bold">Árvores</div>
                <v-list-item-subtitle>{{ item.arvores }}</v-list-item-subtitle>
              </v-col>

              <v-col cols="12" sm="2">
                <div class="text-caption grey--text text--darken-1" style="font-weight: bold">Operações</div>
                <v-btn style="box-shadow: none;" text small class="pa-0 text-capitalize font-weight-medium" @click="viewDetails(item)">
                  Ver Detalhes
                </v-btn>
              </v-col>

              <v-col cols="12" sm="1">
                <div class="text-caption grey--text text--darken-1" style="font-weight: bold;">Status</div>
                <v-chip :color="item.statusColor" dark small>
                  {{ item.status }}
                </v-chip>
              </v-col>

              <v-col cols="12" sm="1" class="text-right">
                <v-icon small color="grey darken-2" @click="downloadReport(item)">mdi-download</v-icon>
              </v-col>
            </v-row>
          </v-list-item-content>
          <v-divider v-if="index < resumoData.length - 1"></v-divider>
        </v-list-item>
      </v-list>
    </v-card>
  </v-container>
</template>

<script>
export default {
  name: 'RelatoriosGerenciais',
  data() {
    return {
      search: '',
      filters: {
        cidade: '',
        status: null,
        dataInicial: '',
        dataFinal: '',
      },
      statusOptions: ['Concluída', 'Em Andamento', 'Pendente'],

      // Dados de simulação para o Gráfico de Barra
      barData: [
        { label: 'Produto A', originalValue: 90, value: 90, color: '#A7D129' }, // Verde Claro
        { label: 'Produto B', originalValue: 70, value: 70, color: '#6A994E' }, // Verde mais Escuro/Sombra
        { label: 'Produto C', originalValue: 95, value: 95, color: '#A7D129' }, // Verde Claro
        { label: 'Produto D', originalValue: 30, value: 30, color: '#6A994E' }, // Verde mais Escuro/Sombra
      ],
      // Dados de simulação para o Gráfico de Pizza/Donut (Ajustado para refletir cores e proporções da imagem)
      pieLegend: [
        { label: 'Corretiva', value: '35.0%', color: '#A7D129' },      // O maior pedaço (Verde Claro)
        { label: 'Emergencial', value: '40.0%', color: '#424242' },    // O segundo maior (Cinza Escuro/Preto)
        { label: 'Preventiva', value: '25.0%', color: '#6A994E' },     // O menor pedaço (Verde Sombra)
      ],

      // Dados de simulação para o Resumo
      resumoData: [
        {
          atividade: 'Monitoramento Semanal',
          endereco: 'Rua das Flores, 123',
          tecnico: 'João Santos',
          data: '2024-11-09',
          arvores: 45,
          status: 'Concluída',
          statusColor: 'success',
        },
        {
          atividade: 'Monitoramento Semanal',
          endereco: 'Rua dos Flores, 138',
          tecnico: 'João Santos',
          data: '2024-11-06',
          arvores: 45,
          status: 'Concluída',
          statusColor: 'success',
        },
        {
          atividade: 'Monitoramento Semanal',
          endereco: 'Rua dos Jardins, 25',
          tecnico: 'João Santos',
          data: '2024-11-08',
          arvores: 45,
          status: 'Concluída',
          statusColor: 'success',
        },
      ],
    };
  },
  methods: {
    goBack() {
      console.log('Ação de Voltar');
    },
    performSearch() {
      console.log('Pesquisar por:', this.search);
    },
    generateReport() {
      console.log('Gerar Relatório com filtros:', this.filters);
    },
    viewDetails(item) {
      console.log('Ver Detalhes:', item);
    },
    downloadReport(item) {
      console.log('Baixar Relatório:', item);
    },
  },
};
</script>

<style scoped>
.relatorios-gerenciais-container {
  margin: auto;
  padding: 24px;
}

/* Ajuste fino para a barra de pesquisa superior */
.search-bar-container .custom-search-field {
  max-width: 200px;
}

/* --- Estilos para Simulação de Gráfico de Barra --- */
.chart-simulation-bar-wrapper {
  position: relative;
  height: 250px;
}

.y-axis-labels {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 30px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding-bottom: 2px;
  color: #9e9e9e;
  font-size: 12px;
  text-align: right;
  transform: translateY(-12px);
}

.chart-simulation-bar {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  padding: 10px 0;
  border-left: 1px solid #ddd;
  border-bottom: 1px solid #ddd;
  height: 100%;
  margin-left: 30px;
}

.bar-segment {
  width: 15%;
  margin: 0 5%;
  position: relative;
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
}

.chart-x-labels {
  margin-left: 30px;
  padding: 0 5%;
}


/* --- Estilos para Simulação de Gráfico de Pizza (Donut) --- */
.pie-chart-mock {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  position: relative;
  /* Proporções: 40% Escuro, 35% Verde Claro, 25% Verde Sombra */
  background: conic-gradient(
    /* 40% Emergencial (Escuro) - Começa em 0% */
    #424242 0% 40%,
      /* 35% Corretiva (Verde Claro) - Vai até 75% */
    #A7D129 40% 75%,
      /* 25% Preventiva (Verde Sombra) - Vai até 100% */
    #6A994E 75% 100%
  );
  box-shadow: 0 0 0 20px white inset; /* Simula o furo do donut */
}

/* Posiciona os textos de percentual DENTRO do gráfico (aproximadamente) */
.pie-text-overlay {
  position: absolute;
  font-weight: bold;
  font-size: 10px;
  color: white;
}
.pie-overlay-dark {
  /* 40% */
  top: 20%;
  left: 65%;
}
.pie-overlay-green {
  /* 35% */
  top: 60%;
  left: 65%;
}
.pie-overlay-blue {
  /* 25% */
  top: 50%;
  left: 20%;
  color: #333; /* Cor mais escura para o fundo mais claro */
}

/* Legenda do Gráfico de Pizza */
.legend-box {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}

/* Estilos para Tabela de Resumo (Lista) */
.resumo-list .resumo-item {
  padding: 0;
}

.resumo-item .v-list-item__content {
  padding: 0;
}

.resumo-item .v-list-item__content .v-row {
  width: 100%;
  margin: 0;
}
</style>
