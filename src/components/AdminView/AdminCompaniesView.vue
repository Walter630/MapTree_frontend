<template>
  <v-container class="pa-6 empresas-container">
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center mb-6">
          <span class="text-caption text-grey-darken-1" @click="$router.push('/admin')">Meu Painel</span>
          <v-icon small class="mx-1 text-grey-darken-1">mdi-chevron-right</v-icon>
          <span class="text-caption font-weight-bold" style="color: #2f3367">#Empresas</span>
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
        <v-row
          align="center"
          no-gutters
          style="display: flex; align-items: center; justify-content: space-between"
        >
          <v-col cols="12" sm="4" md="2" class="pr-4">
            <p class="mb-2">Empresa</p>
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

          <v-col cols="12" sm="4" md="2" class="pr-4">
            <p class="mb-2">Nome</p>
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

          <v-col cols="12" sm="4" md="2" class="pr-4">
            <p class="mb-2">Cidade</p>
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
            <v-btn color="black" class="text-white buscar-btn" height="40" @click="applyFilters">
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

          <template #item.name="{ item }">
            <div class="text-body-1 table-text">{{ item.name }}</div>
          </template>

          <template #item.taxId="{ item }">
            <div class="text-body-1 table-text">{{ item.taxId }}</div>
          </template>

          <template #item.managerId="{ item }">
            <div class="text-body-1 table-text">{{ item.managerId }}</div>
          </template>

          <template #item.isActive="{ item }">
            <v-chip color="green" class="font-weight-bold status-chip">
              {{ item.isActive }}
            </v-chip>
          </template>

          <template #item.acoes="{ item }">
            <v-icon size="small" class="mr-2 action-icon" @click="editItem(item)"
            >mdi-square-edit-outline</v-icon
            >
            <v-icon size="small" class="action-icon" @click="deleteItem(item)"
            >mdi-trash-can-outline</v-icon
            >
          </template>
        </v-data-table>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import router from '@/router'
import type { Company } from '@/plugins/apiConnect.ts'

interface Empresa {
  id: string;
  name: string;
  taxId: string;
  isOutsourced: boolean     //se é terceirizada
  managerId: string;
  isActive?: boolean;
}

export default defineComponent({
  name: 'EmpresasAdminView',

  data() {
    return {
      empresas: [] as Empresa[],
      totalEmpresas: 0,
      filterEmpresa: null,
      filterCidade: null,
      search: '',
      contas: ['EcoEnergia Sul', 'Verde Luz Nordeste', 'PowerTree Centro'],
      cidades: ['Rio de Janeiro', 'São Paulo', 'Fortaleza'],
      page: 1,
      itemsPerPage: 10,
      summaryCards: [
        { title: 'Total de Empresas', icon: 'mdi-domain', value: '2,543', note: '↑ 12% vs mês anterior', noteClass: 'text-success' },
        { title: 'Ativas', icon: 'mdi-alert-circle-outline', value: '18', note: 'Requerem atenção', noteClass: 'text-error' },
        { title: 'Planos Premium', icon: 'mdi-information-outline', value: '94%', note: '↑ 2% vs última semana', noteClass: 'text-success' },
        { title: 'Suspensas', icon: 'mdi-information-outline', value: '0', note: '↓ 2% vs última semana', noteClass: 'text-success' }, // Ajustado para o ícone e nota da imagem
      ],

      // Headers ajustados para a imagem
      headers: [

        { title: 'Nome', key: 'name', sortable: true },
        { title: 'CNPJ', key: 'taxId', sortable: true },
        { title: 'Gestor', key: 'managerId', sortable: true },
        { title: 'Status', key: 'isActive', sortable: true },
        { title: 'Ações', key: 'acoes', sortable: false, align: 'end' },
      ],
      // backup para filtros
      allCompanies: [] as Empresa[],
      // Dados da Tabela simulando os estados da imagem
    }
  },
  computed: {
    paginatedEmpresas() {
      const start = (this.page - 1) * this.itemsPerPage
      const end = start + this.itemsPerPage
      return this.empresas.slice(start, end)
    },

    pageCount() {
      return Math.ceil(this.empresas.length / this.itemsPerPage)
    }
  },
  mounted() {
    this.getCompanies()
  },

  methods: {
    // Função auxiliar para retornar a cor do v-chip com base no Status


    async getCompanies(): Promise<void> {
      try {
        const res = await this.$api.get<Company[]>('/organizations')
        this.allCompanies = res.data.map(company => ({
          id: company.id,
          name: company.name,
          taxId: company.taxId,
          isOutsourced: company.isOutsourced,
          managerId: company.managerId,
          isActive: company.isActive, // Transforma Boolean em String visual
        }))
        this.totalEmpresas = this.allCompanies.length
        console.log(this.allCompanies)
        // exibir na tabela
        this.empresas = [...this.allCompanies]
      } catch (error) {
        console.error('Failed to fetch companies:', error)

      }
    },

    goBack() {
      this.$router.push('/admin')
    },
    addEmpresa() {
      this.$router.push('/admin/register-company')
    },
    applyFilters() {
      console.log('Filtros aplicados:', this.filterEmpresa, this.search, this.filterCidade)
    },
    editItem(item: Empresa) {
      this.$router.push(`/admin/edit-company/${item.id}`)
    },
    deleteItem(item: Empresa) {
      this.$api.delete(`/organizations/${item.id}`)
      this.getCompanies()
    },
  },
})
</script>

<style scoped>
/* ---- PADRÃO GESTORES ---- */

/* Container mais compacto */
.empresas-container {
  margin-top: 20px;
  padding: 24px;
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
  background: #c6f513 !important;
  border-radius: 8px;
  margin-top: -10px !important;
  margin-bottom: 10px !important;
}

/* ---- CARDS RESUMO ---- */

.summary-card {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 16px;
  min-height: 120px;
  display: flex;
  background-color: #f4f4f4;
  flex-direction: column;
  justify-content: flex-start;
  position: relative;
  box-shadow: none;
}

.summary-title {
  font-size: 13px;
}
.summary-value {
  margin-top: 22px;
  font-size: 28px;
  font-weight: 700;
}
.summary-note {
  margin-top: 6px;
  color: #6b7280;
  font-size: 13px;
}

/* ---- FILTROS ---- */

.filters-box {
  border-radius: 8px;
  padding: 18px !important;
  margin-top: 20px !important;
  background: #f9fafb !important;
}

.filter-field {
  margin-bottom: 10px !important;
}

.buscar-btn {
  height: 38px !important;
  border-radius: 8px;
  padding: 0 13px !important;
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
