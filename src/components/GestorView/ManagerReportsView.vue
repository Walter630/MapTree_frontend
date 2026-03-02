<template>
  <v-container fluid class="bg-grey-lighten-4 pa-6">
    <v-row>
      <v-col cols="12">
        <PageHeader
          title="Relatórios Gerenciais"
          subtitle="Gerencie seus relatórios cadastrados no sistema"
          :breadcrumbs="[
            { text: 'Meu Painel', to: '/manager' },
            { text: '#Relatórios' },
          ]"
        />
      </v-col>

      <v-col cols="12" sm="6" md="12" class="d-flex justify-end align-center search-bar-container">
        <div style="width: 400px; max-width: 100%">
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
              <v-btn class="search-button" @click="performSearch" flat color="black">
                Buscar
              </v-btn>
            </template>
          </v-text-field>
        </div>
      </v-col>
    </v-row>

    <v-card
      class="pa-4 mb-6 mt-9"
      outlined
      tile
      style="box-shadow: none; background-color: #f6f6f6"
    >
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
              <div class="text-caption font-weight-bold grey--text text--darken-1 mb-1">
                Período
              </div>
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
                style="height: 40px"
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
        <v-card
          class="pa-4"
          outlined
          tile
          style="background-color: #f6f6f6; border: 1px solid #dadada; box-shadow: none"
        >
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
              ></div>
            </div>
          </div>
          <div class="d-flex justify-space-around mt-2 chart-x-labels">
            <div
              v-for="(item, index) in barData"
              :key="index"
              class="text-caption grey--text text-center"
            >
              {{ item.label }}
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>Distribuição por Tipo de Poda</v-card-title>

          <v-card-text>
            <v-pie v-if="pruningStats.length" :items="pruningStats" donut height="260" />

            <v-alert v-else type="info" variant="tonal"> Nenhuma poda registrada ainda. </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-card class="pa-4" style="box-shadow: none; background-color: #f6f6f6">
      <h3 class="text-h6 mb-3 font-weight-regular">Resumo das Atividades Executadas</h3>

      <v-list class="py-0 resumo-list">
        <v-list-item v-for="(item, index) in resumoData" :key="index" class="resumo-item">
          <v-list-item-content class="py-3">
            <v-row align="center">
              <v-col cols="12" sm="3" class="d-flex align-center">
                <v-icon
                  class="mr-3 green--text text--lighten-1"
                  style="box-shadow: none; background-color: #a7d129"
                  >mdi-content-paste</v-icon
                >
                <div>
                  <v-list-item-title class="font-weight-medium">{{
                    item.atividade
                  }}</v-list-item-title>
                  <v-list-item-subtitle>{{ item.endereco }}</v-list-item-subtitle>
                </div>
              </v-col>

              <v-col cols="12" sm="2">
                <div class="text-caption grey--text text--darken-1" style="font-weight: bold">
                  Técnico
                </div>
                <v-list-item-subtitle>{{ item.tecnico }}</v-list-item-subtitle>
              </v-col>

              <v-col cols="12" sm="2">
                <div class="text-caption grey--text text--darken-1" style="font-weight: bold">
                  Data
                </div>
                <v-list-item-subtitle>{{ item.data }}</v-list-item-subtitle>
              </v-col>

              <v-col cols="12" sm="1">
                <div class="text-caption grey--text text--darken-1" style="font-weight: bold">
                  Árvores
                </div>
                <v-list-item-subtitle>{{ item.arvores }}</v-list-item-subtitle>
              </v-col>

              <v-col cols="12" sm="2">
                <div class="text-caption grey--text text--darken-1" style="font-weight: bold">
                  Operações
                </div>
                <v-btn
                  style="box-shadow: none; background-color: #f6f6f6"
                  text
                  class="pa-1 text-capitalize font-weight-medium"
                  @click="viewDetails(item)"
                >
                  Ver Detalhes
                </v-btn>
              </v-col>

              <v-col cols="12" sm="1">
                <div class="text-caption grey--text text--darken-1" style="font-weight: bold">
                  Status
                </div>
                <v-chip
                  :color="item.statusColor"
                  style="
                    box-shadow: none;
                    background-color: #f6f6f6;
                    align-items: center;
                    justify-content: center;
                    display: flex;
                  "
                >
                  {{ item.status }}
                </v-chip>
              </v-col>

              <v-col cols="12" sm="1" class="text-right">
                <v-icon small color="grey darken-2" @click="downloadReport(item)"
                  >mdi-download</v-icon
                >
              </v-col>
            </v-row>
          </v-list-item-content>
          <v-divider v-if="index < resumoData.length - 1"></v-divider>
        </v-list-item>
      </v-list>
    </v-card>
  </v-container>
</template>

<script lang="ts">
import { useAppStore } from '@/stores/app'
import PageHeader from '@/components/shared/PageHeader.vue'

export default {
  name: 'RelatoriosGestorView',
  components: { PageHeader },
  data() {
    return {
      search: '',
      filters: {
        cidade: '',
        status: null,
        dataInicial: '',
        dataFinal: '',
      },
      appStore: useAppStore(),
      statusOptions: ['Concluída', 'Em Andamento', 'Pendente'],
      PRUNING_TYPE_MAP: {
        LIGHT: {
          label: 'Leve',
          color: '#C1E328',
        },
        MODERATE: {
          label: 'Moderada',
          color: '#4C8BF5',
        },
        HEAVY: {
          label: 'Pesada',
          color: '#424242',
        },
      } as const,

      // Dados de simulação para o Gráfico de Barra
      barData: [
        { label: 'Produto A', originalValue: 90, value: 90, color: '#A7D129' }, // Verde Claro
        { label: 'Produto B', originalValue: 70, value: 70, color: '#6A994E' }, // Verde mais Escuro/Sombra
        { label: 'Produto C', originalValue: 95, value: 95, color: '#A7D129' }, // Verde Claro
        { label: 'Produto D', originalValue: 30, value: 30, color: '#6A994E' }, // Verde mais Escuro/Sombra
      ],
      // Dados de simulação para o Gráfico de Pizza/Donut (Ajustado para refletir cores e proporções da imagem)

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
    }
  },
  computed: {
    pruningStats() {
      const prunings = this.appStore.pruningTypes

      if (!prunings.length) {
        return []
      }

      const count = {
        LIGHT: 0,
        MODERATE: 0,
        HEAVY: 0,
      }

      prunings.forEach((p) => {
        count[p.type]++
      })

      const total = prunings.length

      return (Object.keys(count) as Array<keyof typeof count>).map((type) => ({
        label: this.PRUNING_TYPE_MAP[type].label,
        value: Number(((count[type] / total) * 100).toFixed(0)),
        color: this.PRUNING_TYPE_MAP[type].color,
      }))
    },
  },

  methods: {
    goBack() {
      this.$router.push('/manager')
    },

    performSearch() {
      console.log('Pesquisar por:', this.search)
    },
    generateReport() {
      console.log('Gerar Relatório com filtros:', this.filters)
    },
    viewDetails(item) {
      console.log('Ver Detalhes:', item)
      this.$router.push({ name: 'PruningDetails', params: { id: item.id } })
    },
    downloadReport(item) {
      console.log('Baixar Relatório:', item)
    },
  },
}
</script>

<style scoped>

/* Ajuste fino para a barra de pesquisa superior */
.search-bar-container .custom-search-field {
  max-width: 200px;
}

/* --- Estilos para Simulação de Gráfico de Barra --- */
.chart-simulation-bar-wrapper {
  position: relative;
  height: 250px;
  margin-top: 20px;
  padding: 20px;
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

/* Estilos para Tabela de Resumo (Lista) */
.resumo-list .resumo-item {
  padding: 0;
  box-shadow: none;
  background-color: #f6f6f6;
}

.resumo-item .v-list-item__content {
  padding: 0;
  box-shadow: none;
  background-color: #f6f6f6;
}

.resumo-item .v-list-item__content .v-row {
  width: 100%;
  margin: 0;
}
</style>
