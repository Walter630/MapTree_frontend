<template>
  <v-container class="gestores-page pa-6" >
    <!-- Breadcrumb / Header -->
    <v-row align="center" class="mb-2">
      <v-col cols="12">
        <div class="d-flex align-center mb-6">
          <span class="text-caption text-grey-darken-1" @click="$router.push('/admin')">Meu Painel</span>
          <v-icon small class="mx-1 text-grey-darken-1">mdi-chevron-right</v-icon>
          <span class="text-caption font-weight-bold" style="color: #2f3367">#Gestores</span>
        </div>
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

          <div class="summary-value">{{ totalGestores }}</div> <div class="summary-note">+ 12% vs mês anterior</div>
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
    <v-row class="mt-10">
      <v-col cols="12" class="filters-box pa-4">
        <div class="d-flex align-center mb-4">
          <v-icon class="mr-2 filter-icon">mdi-filter-variant</v-icon>
          <p class="filter-text">Filtros</p>
        </div>
        <v-row align="center" no-gutters style="display: flex; align-items: center; justify-content: space-between;">
          <v-col cols="12" sm="4" md="2" class="pr-4">
            <p class="mb-2">Empresa</p>
            <v-select
              v-model="filterEmpresa"
              :items="contas"
              item-title="name"
              item-value="id"
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
            :page="page"
            :search="search"
            @update:page="page = $event"
            hide-default-footer
          >
          <template #item.id="{ item }">
              <div class="id-cell">{{ item.id }}</div>
            </template>

            <template #item.nome="{ item }">
              <div class="d-flex align-center">
                <v-avatar size="10" class="mr-2">
                  <v-img :src="item.fotoUrl" :alt="item.nome" cover />
                </v-avatar>
                <div>{{ item.nome }}</div>
              </div>
            </template>

            <template #item.company="{ item }">
              <div>{{ item.company }}</div>
            </template>

            <template #item.status="{ item }">
              <v-chip
                :class="statusClass(item.status)"
                small
                style="min-width: 20px"
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
            <v-pagination v-model="page" :length="pageCount" total-visible="5" color="black" />
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { User } from '@/plugins/apiConnect.ts'

interface Gestor {
  id: string
  nome: string
  company: string
  status: string
}

// 👈 NOVA INTERFACE para o array de Filtro/Select
interface EmpresaFiltro {
  id: string
  name: string
}

export default defineComponent({
  data() {
    return {
      gestores: [] as Gestor[],
      totalGestores: 0, // 👈 Novo campo para a contagem dinâmica

      // 👈 NOVAS PROPRIEDADES DE COMPARAÇÃO
      comparacaoPercentual: '',
      comparacaoCor: 'text-success', // ou 'text-danger'
      // filtros
      search: '',
      filterConta: null as string | null,
      filterCidade: null as string | null,

      // selects

      contas: [] as EmpresaFiltro[], // Ou use 'any[]' se preferir não criar a interface

      // tabela
      itemsPerPage: 6,
      page: 1,
      headers: [

        { title: 'Nome', key: 'nome' },
        { title: 'Empresa', key: 'company' },
        { title: 'Status', key: 'status', width: 120 },
        { title: 'Ações', key: 'acoes', width: 120, sortable: false },
      ],

      // backup para filtros
      allGestores: [] as Gestor[],
    }
  },

  computed: {
    paginatedGestores() {
      const start = (this.page - 1) * this.itemsPerPage
      const end = start + this.itemsPerPage
      return this.gestores.slice(start, end)
    },

    pageCount() {
      return Math.ceil(this.gestores.length / this.itemsPerPage)
    }
  },

  mounted() {
    this.getAllCompaniesAndUsers()
  },

  methods: {
    async getAllCompaniesAndUsers(): Promise<void> {
      await this.getAllCompanies(); // Garante que as empresas estejam carregadas
      await this.getAllUsers();     // Em seguida, carrega os usuários
    },
    async getAllCompanies(): Promise<void> {
      try {
        const response = await this.$api.get<User[]>('/organizations')
        // Armazena a lista de empresas como OBJETOS { id, name }
        this.contas = response.data.map((company) => ({
          id: company.id,
          name: company.name
        }))
      } catch (error) {
        console.error('Erro ao buscar empresas:', error)
      }
    },
    //usar computed
    /** 🔹 Buscar usuários do backend */
    async getAllUsers(): Promise<void> {
      try {
        const response = await this.$api.get<User[]>('/users') // Usando 'any' para flexibilidade

        this.allGestores = response.data.map((user) => ({
          id: user.id,
          nome: user.name,
          email: user.email,

          // Busca o objeto da empresa pelo ID (agora funciona pois 'this.contas' tem 'id' e 'name')
          company: this.contas.find((company) => company.id === user.company?.id)?.name ?? '—',
          status: 'Ativo',
        }))
        // NOVO: Define o valor total
        this.totalGestores = this.allGestores.length;
        // exibir na tabela
        this.gestores = [...this.allGestores]
      } catch (error) {
        console.error('Erro ao buscar usuários:', error)
      }
    },

    async editItem(item: Gestor) {
      try {
        const edit = await this.$api.get<User>(`/users/${item.id}`)
        this.$router.push(`/admin/register-managers/${item.id}`)
      } catch (error) {
        console.error('Erro ao buscar usuário:', error)
      }
    },

    /** 🔹 Usuário logado */
    getCurrentUser() {
      return this.$api?.isAuthenticated() ?? {}
    },

    /** 🔹 Criar novo gestor */
    addGestor() {
      this.$router.push('/admin/register-managers')
    },


    /** 🔹 Excluir item */
    deleteItem(item: Gestor) {
      if (confirm(`Deseja deletar ${item.nome}?`)) {
        this.gestores = this.gestores.filter(g => g.id !== item.id)
        this.$api.delete(`/users/${item.id}`)
      }
    },

    /** 🔹 Aplicar filtros */
    applyFilters() {
      this.gestores = this.allGestores.filter(g => {
        const matchName = this.search ? g.nome?.toLowerCase().includes(this.search.toLowerCase()) : true
        const matchConta = this.filterConta ? g.empresa === this.filterConta : true
        const matchCidade = this.filterCidade ? g.cidade === this.filterCidade : true
        return matchName && matchConta && matchCidade
      })

      this.page = 1
    },

    /** 🔹 Voltar */
    goBack() {
      this.$router.back()
    },

    /** 🔹 Classes de status */
    statusClass(status: string) {
      return { 'text-white': true }
    },

    /** 🔹 Cor do chip */
    statusBg(status: string) {
      if (status === 'Ativo') return '#C6F513'
      if (status === 'Inativo') return '#e11d48'
      return '#ddd'
    },
  },
})
</script>


<style scoped>
.gestores-page {
  margin-top: 20px;
  padding: 24px;
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

}
/* Summary cards */
.cards-row {
  margin-top: 8px;
  box-shadow: none;

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
  box-shadow: none;
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
.gestores-table {
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
  .cards-row  {
    margin-bottom: 12px;
  }
  .corner-icon {
    right: 8px;
    top: 8px;
  }
}
</style>
