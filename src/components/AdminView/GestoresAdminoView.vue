<template>
  <v-container class="gestores-page pa-6" fluid>
    <!-- Breadcrumb / Header -->
    <v-row align="center" class="mb-2">
      <v-col cols="12">
        <div class="breadcrumb d-flex align-center">
          <span class="muted">Meu Painel</span>
          <v-icon small class="mx-1 muted">mdi-chevron-right</v-icon>
          <span class="page-title">#Gestores</span>
        </div>
      </v-col>
    </v-row>

    <!-- Title + back button + subtitle -->
    <v-row align="center" class="mb-4">
      <v-col cols="12" md="8">
        <div class="d-flex align-center mb-2">
          <!-- Back button (square) -->
          <v-btn icon class="back-btn mr-3" @click="goBack">
            <v-icon>mdi-arrow-left</v-icon>
          </v-btn>

          <div>
            <h2 class="title mb-1">Gestores</h2>
            <p class="subtitle">Gerencie usuários e suas permissões no sistema</p>
          </div>
        </div>

        <!-- Novo Gestor abaixo do título -->
        <v-row class="mt-3">
          <v-col cols="12">
            <v-btn
              color="#C6F513"
              size="large"
              class="font-weight-bold text-black text-none new-empresa-btn"
              prepend-icon="mdi-plus"
              @click="addGestor"
            >
              Novo Gestor
            </v-btn>
          </v-col>
        </v-row>
      </v-col>
    </v-row>

    <!-- Quick cards (com "ocr" ícone no canto direito) -->
    <v-row class="cards-row" align="stretch" justify="start" elevation="0">
      <v-col cols="12" sm="6" md="3">
        <v-card class="summary-card">
          <div class="card-head">
            <div class="summary-head">
              <span>Total de Gestores</span>
            </div>
            <!-- ícone pequeno no canto (ocr) -->
            <v-icon class="corner-icon" small>mdi-account-multiple</v-icon>
          </div>

          <div class="summary-value">2,543</div>
          <div class="summary-note">+ 12% vs mês anterior</div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="summary-card">
          <div class="card-head">
            <div class="summary-head">
              <span>Pendentes</span>
            </div>
            <v-icon class="corner-icon" small>mdi-alert-circle-outline</v-icon>
          </div>

          <div class="summary-value">18</div>
          <div class="summary-note text-danger">Requerem atenção</div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="summary-card">
          <div class="card-head">
            <div class="summary-head">
              <span>Taxa de Conclusão</span>
            </div>
            <v-icon class="corner-icon" small>mdi-chart-donut</v-icon>
          </div>

          <div class="summary-value">94%</div>
          <div class="summary-note text-success">▲ 2% vs última semana</div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="summary-card">
          <div class="card-head">
            <div class="summary-head">
              <span>Taxa de Conclusão</span>
            </div>
            <v-icon class="corner-icon" small>mdi-chart-donut</v-icon>
          </div>

          <div class="summary-value">94%</div>
          <div class="summary-note text-success">▲ 2% vs última semana</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Filters box -->
    <v-row class="mt-6">
      <v-col cols="12">
        <v-sheet class="filters-sheet pa-4" elevation="0">
          <div class="filter-header d-flex align-center mb-3">
            <v-icon class="mr-2">mdi-filter-variant</v-icon>
            <strong>Filtros</strong>
          </div>

          <v-row align="center" class="filter-row" no-gutters>
            <v-col cols="12" sm="2" md="3">
              <v-select
                v-model="filterConta"
                :items="contas"
                label="Empresa"
                variant="outlined"
                density="compact"
                hide-details
              />
            </v-col>

            <v-col cols="12" sm="2" md="2">
              <v-text-field
                v-model="search"
                label="Nome"
                variant="outlined"
                density="compact"
                hide-details
                clearable
              />
            </v-col>

            <v-col cols="12" sm="4" md="3">
              <v-select
                v-model="filterCidade"
                :items="cidades"
                label="Cidade"
                variant="outlined"
                density="compact"
                hide-details
              />
            </v-col>

            <v-col cols="auto" class="d-flex align-center">
              <v-btn color="black" class="text-white" height="40" @click="applyFilters">
                BUSCAR
              </v-btn>
            </v-col>
          </v-row>
        </v-sheet>
      </v-col>
    </v-row>

    <!-- Table card -->
    <v-row class="mt-6">
      <v-col cols="12">
        <v-card class="table-card" elevation="0">
          <v-card-title class="pt-6 pb-4">
            <div>
              <div class="table-title">Gestores Cadastrados</div>
              <div class="table-subtitle">Gerencie os gestores cadastrados no sistema</div>
            </div>
          </v-card-title>

          <v-data-table
            class="gestores-table"
            :headers="headers"
            :items="paginatedGestores"
            :items-per-page="itemsPerPage"
            :page.sync="page"
            :search="search"
            hide-default-footer
          >
            <template #item.id="{ item }">
              <div class="id-cell">{{ item.id }}</div>
            </template>

            <template #item.nome="{ item }">
              <div class="d-flex align-center">
                <v-avatar size="40" class="mr-3">
                  <v-img :src="item.fotoUrl" :alt="item.nome" cover />
                </v-avatar>
                <div>{{ item.nome }}</div>
              </div>
            </template>

            <template #item.empresa="{ item }">
              <div>{{ item.empresa }}</div>
            </template>

            <template #item.status="{ item }">
              <v-chip
                :class="statusClass(item.status)"
                small
                style="min-width: 72px;"
                :style="{ backgroundColor: statusBg(item.status) }"
              >
                {{ item.status }}
              </v-chip>
            </template>

            <template #item.acoes="{ item }">
              <v-icon small class="mr-2 action-icon" @click="editItem(item)">mdi-pencil</v-icon>
              <v-icon small class="action-icon" @click="deleteItem(item)">mdi-delete</v-icon>
            </template>
          </v-data-table>

          <!-- pagination -->
          <v-divider></v-divider>
          <v-card-actions class="justify-center py-6">
            <v-pagination
              v-model="page"
              :length="pageCount"
              total-visible="5"
              color="black"
            />
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

interface Gestor {
  id: string
  nome: string
  empresa: string
  fotoUrl: string
  conta: string
  cidade: string
  status?: string
}

const router = useRouter()

// Data (sample)
const gestores = ref<Gestor[]>([
  { id: '#3S84Y57U6', nome: 'Fulano De Tal', empresa: 'Fulano De Tal', fotoUrl: 'https://cdn.vuetifyjs.com/images/lists/1.jpg', conta: 'Conta B', cidade: 'Cidade X', status: 'Ativa' },
  { id: '#9S3A2B1C0', nome: 'Ciclano De Oliveira', empresa: 'Empresa Beta', fotoUrl: 'https://cdn.vuetifyjs.com/images/lists/2.jpg', conta: 'Conta A', cidade: 'Cidade Y', status: 'Pendente' },
  { id: '#4R7T9Y0I2', nome: 'Beltrana da Silva', empresa: 'Empresa Gamma', fotoUrl: 'https://cdn.vuetifyjs.com/images/lists/3.jpg', conta: 'Conta B', cidade: 'Cidade Z', status: 'Ativa' },
  { id: '#7D2K5L9M3', nome: 'Marcos Lima', empresa: 'Empresa Delta', fotoUrl: 'https://cdn.vuetifyjs.com/images/lists/1.jpg', conta: 'Conta C', cidade: 'Cidade Y', status: 'Ativa' },
  { id: '#8P9O2A6Q4', nome: 'Ana Souza', empresa: 'Empresa Épsilon', fotoUrl: 'https://cdn.vuetifyjs.com/images/lists/2.jpg', conta: 'Conta B', cidade: 'Cidade X', status: 'Ativa' },
  { id: '#5J1T3U7B9', nome: 'Carlos Pereira', empresa: 'Empresa Zeta', fotoUrl: 'https://cdn.vuetifyjs.com/images/lists/3.jpg', conta: 'Conta A', cidade: 'Cidade Z', status: 'Pendente' },
  { id: '#1A2B3C4D5', nome: 'Joana Prado', empresa: 'Empresa Theta', fotoUrl: 'https://cdn.vuetifyjs.com/images/lists/1.jpg', conta: 'Conta C', cidade: 'Cidade X', status: 'Ativa' },
])

// Filters & UI state
const filterConta = ref<string | null>(null)
const filterCidade = ref<string | null>(null)
const search = ref('')
const contas = ref(['Conta A', 'Conta B', 'Conta C'])
const cidades = ref(['Cidade X', 'Cidade Y', 'Cidade Z'])

// Pagination
const page = ref(1)
const itemsPerPage = 5
const pageCount = computed(() => Math.ceil(filteredGestores.value.length / itemsPerPage))

// Table headers (Vuetify 3 style expects objects; we'll adapt in template)
const headers = [
  { title: 'ID', key: 'id' },
  { title: 'Nome', key: 'nome' },
  { title: 'Empresa', key: 'empresa' },
  { title: 'Status', key: 'status' },
  { title: 'Ações', key: 'acoes' },
]

// Filtering and pagination computed values
const filteredGestores = computed(() =>
  gestores.value.filter((g) => {
    const matchesConta = filterConta.value ? g.conta === filterConta.value : true
    const matchesCidade = filterCidade.value ? g.cidade === filterCidade.value : true
    const matchesSearch = search.value ? (g.nome.toLowerCase().includes(search.value.toLowerCase()) || g.empresa.toLowerCase().includes(search.value.toLowerCase())) : true
    return matchesConta && matchesCidade && matchesSearch
  })
)

const paginatedGestores = computed(() => {
  const start = (page.value - 1) * itemsPerPage
  return filteredGestores.value.slice(start, start + itemsPerPage)
})

// Methods
function addGestor() {
  router.push('/admin/cadastro-gestores')
}
function applyFilters() {
  page.value = 1
}
function editItem(item: Gestor) {
  // Replace with actual edit route
  console.log('Editar', item)
}
function deleteItem(item: Gestor) {
  // Replace with API delete
  console.log('Excluir', item)
}
function goBack() {
  router.push('/admin/AdminHome')
}

// Status helpers
function statusBg(status = '') {
  const s = (status || '').toLowerCase()
  if (s === 'ativa' || s === 'ativo') return '#DFF7D9'
  if (s === 'pendente') return '#FFF8B3'
  return '#eee'
}
function statusClass(status = '') {
  const s = (status || '').toLowerCase()
  return s === 'ativa' ? 'status-active' : s === 'pendente' ? 'status-pending' : 'status-default'
}
</script>

<style scoped>
.gestores-page {
  max-width: 1200px;
  margin: 0 auto;
}

/* Breadcrumb / header */
.breadcrumb .muted {
  color: #9aa0a6;
  font-size: 13px;
}
.page-title {
  font-weight: 600;
  color: #374151;
}

/* Title / subtitle */
.title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}
.subtitle {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
}

/* Back button */
.back-btn {
  border: 1px solid #e6e6e6;
  background: white;
  min-width: 36px;
  min-height: 36px;
  border-radius: 8px;
  color: #374151;
}

/* Novo Gestor button (moved below title) */
.btn-new-gestor {
  min-width: 160px;
  font-weight: 700;
  color: #000;
  text-transform: none;
}

/* Summary cards */
.cards-row {
  margin-top: 8px;
  box-shadow: none;
  background-color: #f4f4f4 ;
}
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
}
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: start;
}
.summary-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #333;
}
.corner-icon {
  position: absolute;
  right: 12px;
  top: 12px;
  color: #9aa0a6;
}

/* values and notes */
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
.text-danger {
  color: #e11d48 !important;
}
.text-success {
  color: #10b981 !important;
}

/* Filters */
.filters-sheet {
  background: #F6F6F6;
  border-radius: 6px;
  border: 1px solid #eee;
  margin: 8px 0;
  padding: 16px;
}
.filter-header {
  color: #374151;
}
.filter-row .v-select,
.filter-row .v-text-field {
  max-width: 100%;
  margin-right: 26px;
}

/* Table card */
.table-card {
  border-radius: 8px;
  border: 1px solid #eee;
  padding-bottom: 0;
  overflow: hidden;
}

/* Table header/title */
.table-title {
  font-weight: 700;
  font-size: 16px;
}
.table-subtitle {
  color: #6b7280;
  font-size: 13px;
}

/* Table styles */
.gestores-table .v-data-table__wrapper {
  padding: 0 16px 16px 16px;
}
.id-cell {
  font-weight: 700;
  color: #374151;
}
.action-icon {
  cursor: pointer;
  color: #6b7280;
}

/* Responsive tweaks */
@media (max-width: 768px) {
  .gestores-page {
    padding: 12px;
  }
  .summary-card {
    min-height: 100px;
  }
  .btn-new-gestor {
    width: 100%;
  }
  .cards-row .v-col {
    margin-bottom: 12px;
  }
  .corner-icon {
    right: 8px;
    top: 8px;
  }
}
</style>
