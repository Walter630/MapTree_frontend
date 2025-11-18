<template>
  <v-container class="pa-6 empresas-container">
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center mb-6">
          <span class="text-caption text-grey-darken-1">Meu Painel</span>
          <v-icon small class="mx-1 text-grey-darken-1">mdi-chevron-right</v-icon>
          <span class="text-caption font-weight-bold" style="color: #2F3367;">#Empresas</span>
        </div>

        <div class="d-flex align-center">
          <v-btn icon depressed class="mr-3 back-btn" @click="goBack">
            <v-icon>mdi-chevron-left</v-icon>
          </v-btn>
          <div>
            <p class="title-text">Empresas</p>
            <p class="subtitle-text">Gerencie empresas cadastradas no sistema</p>
          </div>
        </div>
      </v-col>
    </v-row>

    <v-row class="mt-3">
      <v-col cols="12">
        <v-btn
          color="#C6F513"
          size="large"
          class="font-weight-bold text-black text-none new-empresa-btn"
          prepend-icon="mdi-plus"
          @click="addEmpresa"
        >
          Novo Empresa
        </v-btn>
      </v-col>
    </v-row>

    <v-row class="mt-8 summary-cards-row">
      <v-col cols="12" sm="6" md="3" v-for="(card, index) in summaryCards" :key="index">
        <v-card class="summary-card">
          <div class="d-flex justify-space-between align-start">
            <div class="summary-title">{{ card.title }}</div>
            <v-icon class="summary-icon">{{ card.icon }}</v-icon>
          </div>
          <v-card-text class="pa-0 mt-2">
            <div class="summary-value">{{ card.value }}</div>
            <div :class="['summary-note', card.noteClass]">{{ card.note }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-10">
      <v-col cols="12" class="filters-box pa-4">
        <div class="d-flex align-center mb-4">
          <v-icon class="mr-2 filter-icon">mdi-filter-variant</v-icon>
          <p class="filter-text">Filtros</p>
        </div>
        <v-row align="center" no-gutters>
          <v-col cols="12" sm="4" md="3" class="pr-4">
            <v-select
              v-model="filterEmpresa"
              :items="contas"
              label="Empresa"
              placeholder="Nome da Empresa"
              variant="outlined"
              density="compact"
              hide-details
              class="filter-field"
            />
          </v-col>
          <v-col cols="12" sm="4" md="3" class="pr-4">
            <v-text-field
              v-model="search"
              label="Nome"
              placeholder="Nome do Representante"
              variant="outlined"
              density="compact"
              hide-details
              clearable
              class="filter-field"
            />
          </v-col>
          <v-col cols="12" sm="4" md="3" class="pr-4">
            <v-select
              v-model="filterCidade"
              :items="cidades"
              label="Cidade"
              placeholder="Selecione a Cidade"
              variant="outlined"
              density="compact"
              hide-details
              class="filter-field"
            />
          </v-col>
          <v-col cols="auto">
            <v-btn
              color="black"
              class="text-white buscar-btn"
              height="40"
              @click="applyFilters"
            >
              BUSCAR
            </v-btn>
          </v-col>
        </v-row>
      </v-col>
    </v-row>

    <v-row class="mt-8">
      <v-col cols="12" class="pa-0">
        <p class="table-title-text mb-4">Empresas Cadastradas</p>
        <v-data-table
          :headers="headers"
          :items="empresas"
          :search="search"
          :sort-by="[{ key: 'nome', order: 'asc' }]"
          class="elevation-0 data-table-custom"
          hide-default-footer
        >
          <template #item.id="{ item }">
            <div class="text-subtitle-2 font-weight-regular table-id">{{ item.id }}</div>
          </template>

          <template #item.nome="{ item }">
            <div class="text-body-1 table-text">{{ item.nome }}</div>
          </template>

          <template #item.contato="{ item }">
            <div class="text-body-1 table-text">{{ item.contato }}</div>
          </template>

          <template #item.plano="{ item }">
            <div class="text-body-1 table-text">{{ item.plano }}</div>
          </template>

          <template #item.status="{ item }">
            <v-chip :color="getStatusColor(item.status)" class="font-weight-bold status-chip" label>
              {{ item.status }}
            </v-chip>
          </template>

          <template #item.acoes="{ item }">
            <v-icon size="small" class="mr-2 action-icon" @click="editItem(item)">mdi-square-edit-outline</v-icon>
            <v-icon size="small" class="action-icon" @click="deleteItem(item)">mdi-trash-can-outline</v-icon>
          </template>

        </v-data-table>
      </v-col>
    </v-row>
  </v-container>

</template>

<script lang="ts">
import { defineComponent } from 'vue'
import router from '@/router'

interface Empresa {
  id: string;
  nome: string;
  contato: string;
  plano: string;
  status: 'Ativa' | 'Pendente' | 'Inativa' | 'Suspensa'; // Estados simulados
}

export default defineComponent({
  name: 'EmpresasAdminView',

  data: () => ({
    filterEmpresa: null, // Novo filtro para "Empresa"
    filterCidade: null, // Novo filtro para "Cidade"
    search: '', // Busca pelo Nome
    contas: ['EcoEnergia Sul', 'Verde Luz Nordeste', 'PowerTree Centro'], // Opções de filtro de Empresa
    cidades: ['Rio de Janeiro', 'São Paulo', 'Fortaleza'], // Opções de filtro de Cidade

    summaryCards: [
      { title: 'Total de Empresas', icon: 'mdi-domain', value: '2,543', note: '↑ 12% vs mês anterior', noteClass: 'text-success' },
      { title: 'Ativas', icon: 'mdi-alert-circle-outline', value: '18', note: 'Requerem atenção', noteClass: 'text-error' },
      { title: 'Planos Premium', icon: 'mdi-information-outline', value: '94%', note: '↑ 2% vs última semana', noteClass: 'text-success' },
      { title: 'Suspensas', icon: 'mdi-information-outline', value: '0', note: '↓ 2% vs última semana', noteClass: 'text-success' }, // Ajustado para o ícone e nota da imagem
    ],

    // Headers ajustados para a imagem
    headers: [
      { title: 'Id', align: 'start', sortable: true, key: 'id' },
      { title: 'Nome', key: 'nome', sortable: true },
      { title: 'Contato', key: 'contato', sortable: false },
      { title: 'Plano', key: 'plano', sortable: false },
      { title: 'Status', key: 'status', sortable: true },
      { title: 'Ações', key: 'acoes', sortable: false, align: 'end' },
    ],

    // Dados da Tabela simulando os estados da imagem
    empresas: [
      { id: '#35R4Y57U6', nome: 'EcoEnergia Sul', contato: 'Fulano De Tal', plano: 'Fulano De Tal', status: 'Ativa' },
      { id: '#35R4Y57U6', nome: 'Verde Luz Nordeste', contato: 'Fulano De Tal', plano: 'Fulano De Tal', status: 'Pendente' },
      { id: '#35R4Y57U6', nome: 'PowerTree Centro', contato: 'Fulano De Tal', plano: 'Fulano De Tal', status: 'Ativa' },
      { id: '#35R4Y57U6', nome: 'Elétrica Verde SP', contato: 'Fulano De Tal', plano: 'Fulano De Tal', status: 'Ativa' },
      { id: '#35R4Y57U6', nome: 'Energialimpa RJ', contato: 'Fulano De Tal', plano: 'Fulano De Tal', status: 'Ativa' },
    ] as Empresa[],
  }),

  methods: {
    // Função auxiliar para retornar a cor do v-chip com base no Status
    getStatusColor(status: string): string {
      switch (status) {
        case 'Ativa': return '#DFF7D9'; // Verde claro
        case 'Pendente': return '#FFF8B3'; // Amarelo claro
        case 'Suspensa': return '#FDECF0'; // Vermelho/Rosa claro
        case 'Inativa': return '#EEEEEE'; // Cinza claro
        default: return '#EEEEEE';
      }
    },

    goBack() {
      console.log('Voltar para a página anterior')
    },
    addEmpresa() {
      router.push('/admin/cadastro-empresa')
    },
    applyFilters() {
      console.log('Filtros aplicados:', this.filterEmpresa, this.search, this.filterCidade)
    },
    editItem(item: Empresa) {
      console.log('Editar Empresa:', item)
    },
    deleteItem(item: Empresa) {
      console.log('Excluir Empresa:', item)
    },
  },
})
</script>

<style scoped>
/* ---- PADRÃO GESTORES ---- */

/* Container mais compacto */
.empresas-container {
  max-width: 1200px;
  padding-top: 20px !important;
}

/* Título + voltar */
.back-btn {
  height: 40px !important;
  width: 40px !important;
  border-radius: 8px;
}

/* Título principal compacto */
.title-text {
  font-size: 22px;
  margin-bottom: 2px;
}

/* Subtítulo reduzido */
.subtitle-text {
  font-size: 14px;
  color: #667085;
}

/* Botão Novo Empresa — estilo Gestores */
.new-empresa-btn {
  height: 42px !important;
  background: #C6F513 !important;
  border-radius: 8px;
  margin-top: -10px !important;
  margin-bottom: 10px !important;
}

/* ---- CARDS RESUMO ---- */

.summary-cards-row {
  margin-top: 10px !important;
}

.summary-card {
  padding: 18px !important;
  min-height: 120px !important;
}

.summary-title { font-size: 13px; }
.summary-value { font-size: 26px; }
.summary-note { font-size: 12px; }

/* ---- FILTROS ---- */

.filters-box {
  border-radius: 8px;
  padding: 18px !important;
  margin-top: 20px !important;
  background: #F9FAFB !important;
}

.filter-field {
  margin-bottom: 10px !important;
}

.buscar-btn {
  height: 38px !important;
  border-radius: 8px;
  padding: 0 18px !important;
}

/* ---- TABELA ---- */

.table-title-text {
  font-size: 15px;
  margin-bottom: 8px !important;
}

.data-table-custom {
  border-radius: 8px;
  overflow: hidden;
}

.data-table-custom >>> th {
  font-size: 11px !important;
}

.table-text,
.table-id {
  font-size: 13px !important;
}

.action-icon {
  opacity: 0.7;
  transition: 0.2s;
}
.action-icon:hover {
  opacity: 1;
}

/* STATUS */
.status-chip {
  font-size: 11px !important;
  height: 22px !important;
}

/* Espaçamento geral dos rows */
.v-row {
  margin-bottom: 4px !important;
}
</style>
