<template>
  <v-container fluid class="bg-grey-lighten-4 pa-6">
    <!-- Breadcrumb / Header -->
    <v-row align="center" class="mb-2">
      <v-col cols="12">
        <PageHeader
          title="Gestores"
          subtitle="Gerencie usuários e suas permissões no sistema"
          :breadcrumbs="[
            { text: 'Meu Painel', to: '/admin' },
            { text: '#Gestores' },
          ]"
        />

        <!-- Novo Gestor abaixo do título -->
        <v-row class="mt-3">
          <v-col cols="12">
            <v-btn
              color="#C6F513"
              size="large"
              class="font-weight-bold text-black text-none new-gestor-btn"
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
    <v-row class="mt-10 mb-12">
      <v-col cols="12" class="filters-box pa-4">
        <div class="d-flex align-center mb-4">
          <v-icon class="mr-2 filter-icon">mdi-filter-variant</v-icon>
          <p class="filter-text">Filtros</p>
        </div>
        <v-row  no-gutters style="display: flex; align-items: center; justify-content: space-between;">
          <v-col cols="12" sm="4" md="2" class="pr-4">
            <p class="mb-2">Empresa</p>
            <v-select
              v-model="filterConta"
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
    <v-row class="mt-12" style="background-color: #F6F6F6; border-radius: 8px;">
      <v-col cols="12" class="pa-0">
        <p class="table-title-text mb-4" style="font-size: 14px">Gestores Cadastradas</p>
          <v-data-table
            :headers="headers"
            :items="gestores"
            :search="search"
            :sort-by="[{ key: 'nome', order: 'asc' }]"
            class="elevation-0 data-table-custom"
            hide-default-footer
          >
           <template #item="{ item }">
            <tr>
              <td class="table-id">{{ item.name }}</td>
              <td class="table-text">{{ item.email }}</td>
              <td class="table-text">{{ item.organization }}</td>
              <td>
                <v-chip color="green" v-if="item.isActive">
                  {{ item.isActive }}

                </v-chip>
              </td>
              <td>
                <v-icon size="small" class="mr-2 action-icon" @click="openDialogEdit(item)">
                  mdi-square-edit-outline
                </v-icon>
                <v-icon size="small" class="action-icon" @click="openDialogDelete(item)">
                  mdi-trash-can-outline
                </v-icon>
              </td>
            </tr>
            </template>
          </v-data-table>
          <v-card-actions class="justify-center py-6">
            <v-pagination v-model="page" :length="pageCount" total-visible="5" color="black" />
          </v-card-actions>
      </v-col>
    </v-row>

    <v-dialog v-model="dialogEdit.active" max-width="500px">
      <v-card width="500px">
        <v-card-title class="text-h6">
          Edição de Gestor
          <v-btn
            style="position: absolute; top: 0; right: 0;"
            icon="mdi-close"
            variant="text"
            @click="closeDialogEdit"
            color="red"
            :disabled="dialogEdit.loading"
          />
        </v-card-title>
        <v-card-text>
          <v-card v-if="dialogEdit.item" >
            <v-card-text>
              <v-text-field v-model="dialogEdit.item.name" label="Nome" />
              <v-text-field v-model="dialogEdit.item.email" label="Email" />
              <v-select v-model="dialogEdit.item.organization" :items="contas" label="Empresa" />
              <v-select v-model="dialogEdit.item.isActive" :items="[true, false]" label="Ativo" />
            </v-card-text>
          </v-card>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="closeDialogEdit" :disabled="dialogEdit.loading">Cancelar</v-btn>
          <v-btn color="red" :loading="dialogEdit.loading" :disabled="dialogEdit.loading" text @click="editItem">Editar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-container>
  <v-dialog v-model="dialogDelete.active" max-width="500px">
    <v-card width="500px">
      <v-card-title class="text-h6">
        Confirmação de Exclusão
        <v-btn
          style="position: absolute; top: 0; right: 0;"
          icon="mdi-close"
          variant="text"
          @click="closeDialogDelete"
          color="red"
          :disabled="dialogDelete.loading"
        />
      </v-card-title>
      <v-card-text>
        <p>Tem certeza de que deseja excluir esta empresa?</p>
        <ul class="ml-5">
          <li>{{ dialogDelete?.item?.name }}</li>
          <li>{{ dialogDelete?.item?.email }}</li>
        </ul>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn text @click="closeDialogDelete" :disabled="dialogDelete.loading">Cancelar</v-btn>
        <v-btn color="red" :loading="dialogDelete.loading" :disabled="dialogDelete.loading" text @click="deleteItem">Excluir</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { User } from '@/plugins/apiConnect.ts'
import PageHeader from '@/components/shared/PageHeader.vue'

interface Gestor {
  id: string
  name: string
  organizationId: string
  organization: string
  email: string
  role?: string
  isActive: boolean
}

interface EmpresaFiltro {
  id: string
  name: string
}

export default defineComponent({
  components: { PageHeader },
  data() {
    return {
      gestores: [] as Gestor[],


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
        { title: 'Nome', key: 'name' , sortable: true},
        { title: 'Email', key: 'email' , sortable: true},
        { title: 'Empresa', key: 'company' ,sortable: true },
        { title: 'Status', key: 'isActive', sortable: true },
        { title: 'Ações', key: 'acoes',  sortable: false },
      ],
      dialogDelete: {
        active: false,
        loading: false,
        item: null as User | null,
      },
      dialogEdit: {
        active: false,
        loading: false,
        item: null as User | null,
      },

      // backup para filtros
      allGestores: [] as Gestor[],
    }
  },

  computed: {
    totalGestores() {
      return this.gestores.length
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
      await this.getAllUsers();     // Em seguida, carrega os usuários
    },
    //usar computed
    async getAllUsers(): Promise<void> {
      try {
        const response = await this.$api.get<User[]>('/users') // Usando 'any' para flexibilidade
        this.allGestores = response.data.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          organization: user.organization,
          organizationId: user.organization?.name,
          isActive: user.isActive,
        }))
        // NOVO: Define o valor total
        this.totalGestores = this.allGestores.length;
        // exibir na tabela
        this.gestores = [...this.allGestores]
      } catch (error) {
        console.error('Erro ao buscar usuários:', error)
      }
    },

    async editItem() {
      try {
        this.dialogEdit.loading = true;
        await this.$api.patch(`/users/${this.dialogEdit?.item?.id}`, {
          name: this.dialogEdit?.item?.name,
          email: this.dialogEdit?.item?.email,
          organizationId: this.dialogEdit?.item?.organization,
          isActive: this.dialogEdit?.item?.isActive,
        })
      } catch (error) {
        console.error('Erro ao buscar usuário:', error)
      } finally {
        await this.getAllUsers();
        this.dialogEdit.loading = false;
        this.dialogEdit.active = false;
        this.dialogEdit.item = null;
      }
    },

    openDialogEdit(item: User) {
      this.dialogEdit.active = true
      this.dialogEdit.item = item
    },
    closeDialogEdit() {
      this.dialogEdit.active = false;
      this.dialogEdit.item = null;
      this.dialogEdit.loading = false;
    },

    /** 🔹 Usuário logado */
    getCurrentUser() {
      return this.$api?.isAuthenticated() ?? {}
    },

    addGestor() {
      this.$router.push('/admin/register-managers')
    },


    /** 🔹 Excluir item */
    async deleteItem() {
      try {
        this.dialogDelete.loading = true;
        await this.$api.delete(`/users/${this.dialogDelete?.item?.id}`)
      } catch (error) {
        console.error('Erro ao buscar usuário:', error)
      } finally {
        await this.getAllUsers();
        this.dialogDelete.loading = false;
        this.dialogDelete.active = false;
        this.dialogDelete.item = null;
      }
    },

    /** 🔹 Aplicar filtros */
    applyFilters() {
      this.gestores = this.allGestores.filter(g => {
        const matchName = this.search ? g.name?.toLowerCase().includes(this.search.toLowerCase()) : true
        const matchConta = this.filterConta ? g.organization === this.filterConta : true

        return matchName && matchConta
      })
      this.page = 1
    },

    openDialogDelete(item: User) {
      this.dialogDelete.active = true
      this.dialogDelete.item = item
    },
    closeDialogDelete() {
      this.dialogDelete.active = false;
      this.dialogDelete.item = null;
      this.dialogDelete.loading = false;
    },

    /** 🔹 Voltar */
    goBack() {
      this.$router.back()
    },
  },
})
</script>


<style scoped>

.filters-box {
  border-radius: 8px;
  padding: 18px !important;
  margin-top: 20px !important;
  background: #f6f6f6 !important;
}
/* Summary cards */
.cards-row {
  margin-top: 8px;
  box-shadow: none;

}
.summary-card {
  border: 1px solid #D0D5DD;
  border-radius: 8px;
  padding: 16px;
  min-height: 120px;
  display: flex;
  background-color: #F6F6F6;
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
  color: #9aa0a6;
  font-size: 13px;
}
.text-danger {
  color: #e11d48 !important;
}
.text-success {
  color: #10b981 !important;
}

.new-gestor-btn {
  height: 42px !important;
  background: #c6f513 !important;
  border-radius: 8px;
  margin-top: 10px !important;
  margin-bottom: 10px !important;
}
.action-icon {
  cursor: pointer;
  color: #6b7280;
}

.data-table-custom {
  border-radius: 8px;
  overflow: hidden;
  background-color: #F6F6F6;
  box-shadow: none;
  padding: 10px !important;
  margin-bottom: 10px !important;
}

.table-title-text {
  font-size: 15px;
  margin-bottom: 8px !important;
  padding: 10px !important;
}

/* Responsive tweaks */
@media (max-width: 768px) {
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
