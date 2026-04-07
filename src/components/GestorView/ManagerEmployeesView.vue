<template>
  <v-container class="pa-6">
    <v-row align="center" class="mb-2">
      <v-col cols="12">
        <PageHeader
          title="Funcionários"
          subtitle="Gerencie usuários e suas permissões no sistema"
          :breadcrumbs="[{ text: 'Meu Painel', to: '/manager' }, { text: '#Funcionários' }]"
        />

        <!-- Novo Funcionário abaixo do título -->
        <v-row class="mt-3">
          <v-col cols="12">
            <v-btn
              color="#C6F513"
              size="large"
              class="font-weight-bold text-black text-none new-funcionario-btn"
              prepend-icon="mdi-plus"
              @click="addEmployee"
            >
              Novo Funcionário
            </v-btn>
          </v-col>
        </v-row>
      </v-col>
    </v-row>

    <v-row class="mt-12" style="background-color: #f6f6f6; border-radius: 8px">
      <v-col cols="12" class="pa-0">
        <p class="table-title-text mb-4" style="font-size: 20px">Gestores Cadastradas</p>
        <v-data-table
          :headers="headers"
          :items="users"
          :search="search"
          :sort-by="[{ key: 'nome', order: 'asc' }]"
          class="elevation-0 data-table-custom"
          style="background-color: #f6f6f6"
          hide-default-footer
        >
          <template #item="{ item }">
            <tr>
              <td class="table-id">{{ item.name }}</td>
              <td class="table-text">{{ item.cpf }}</td>

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

    <v-row justify="space-between" align="center" class="mt-4">
      <v-col cols="auto">
        <div class="d-flex align-center text-caption text-grey-darken-1">
          Linhas por página
          <v-select
            v-model="itemsPerPage"
            :items="[4, 10, 25, 50]"
            density="compact"
            variant="solo"
            hide-details
            class="ml-2"
            style="width: 70px; font-size: 12px"
          />
        </div>
      </v-col>

      <v-col cols="auto">
        <div class="d-flex align-center text-caption text-grey-darken-1">
          <v-btn icon size="small" variant="text" @click="page > 1 && page--">
            <v-icon>mdi-chevron-left</v-icon>
          </v-btn>

          <span class="mx-1">
            <v-btn
              v-for="p in 1"
              :key="p"
              size="small"
              variant="text"
              :color="p === page ? 'black' : 'grey'"
              @click="page = p"
              class="font-weight-bold"
            >
              {{ p }}
            </v-btn>
          </span>

          <span class="mx-2 text-subtitle-2">...</span>
          <v-btn
            size="small"
            variant="text"
            :color="page === 11 ? 'black' : 'grey'"
            @click="page = 11"
            class="font-weight-bold"
            >11</v-btn
          >
          <v-btn
            size="small"
            variant="text"
            :color="page === 12 ? 'black' : 'grey'"
            @click="page = 12"
            class="font-weight-bold"
            >12</v-btn
          >

          <span class="text-subtitle-2 mx-1">Próxima</span>
          <v-btn icon size="small" variant="text" @click="page < pageCount && page++">
            <v-icon>mdi-chevron-right</v-icon>
          </v-btn>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { Manager, User } from '@/plugins/apiConnect.ts'
import PageHeader from '@/components/shared/PageHeader.vue'

interface Company {
  id: string
  name: string
  taxId: string // CNPJ ou CPF da empresa
  isOutsourced: boolean //se é terceirizada
  managerId?: string
  manager: Manager
  isActive: boolean
  createdAt?: Date
}

interface Funcionario {
  id: string
  name: string
  cpf: string
  status: string // O status na imagem é "Fulano De Tal", vou manter como string para simulação
  email: string
  phone: string
  isActive: boolean
  companyId: Company[]
}

export default defineComponent({
  components: { PageHeader },
  data() {
    return {
      users: [] as User[],
      cpfMask: '###.###.###-##',
      comparacaoPercentual: '',
      comparacaoCor: 'text-success',
      // filtros
      search: '',
      totalUsers: 0,

      // tabela
      itemsPerPage: 6,
      page: 1,
      headers: [
        { title: 'Nome', key: 'name', sortable: true },
        { title: 'Cpf', key: 'cpf', sortable: true },
        { title: 'Status', key: 'isActive', sortable: true },
        { title: 'Ações', key: 'acoes', sortable: false },
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
      allUsers: [] as User[],
    }
  },

  computed: {
    totalFuncionarios() {
      return this.users.length
    },
    pageCount() {
      return Math.ceil(this.users.length / this.itemsPerPage)
    },
    cpfMasked() {
      return this.cpfMask
    },
  },

  mounted() {
    this.getAllCompaniesAndUsers()
  },

  methods: {
    async getAllCompaniesAndUsers(): Promise<void> {
      await this.getAllUsers() // Em seguida, carrega os usuários
    },

    async getAllUsers(): Promise<void> {
      try {
        const response = await this.$api.get<User[]>('/users')
        this.allUsers = response.data
        this.totalUsers = this.allUsers.length
        this.users = [...this.allUsers]
      } catch (error) {
        console.error('Erro ao buscar usuários:', error)
      }
    },

    async editItem() {
      try {
        this.dialogEdit.loading = true
        await this.$api.patch(`/users/${this.dialogEdit?.item?.id}`, {
          name: this.dialogEdit?.item?.name,
          email: this.dialogEdit?.item?.email,
          organizationId: this.dialogEdit?.item?.organization,
          isActive: this.dialogEdit?.item?.isActive,
        })
      } catch (error) {
        console.error('Erro ao buscar usuário:', error)
      } finally {
        await this.getAllUsers()
        this.dialogEdit.loading = false
        this.dialogEdit.active = false
        this.dialogEdit.item = null
      }
    },

    openDialogEdit(item: User) {
      this.dialogEdit.active = true
      this.dialogEdit.item = item
    },
    closeDialogEdit() {
      this.dialogEdit.active = false
      this.dialogEdit.item = null
      this.dialogEdit.loading = false
    },

    /** 🔹 Usuário logado */
    getCurrentUser() {
      return this.$api?.isAuthenticated() ?? {}
    },

    addEmployee() {
      this.$router.push('/manager/register-employee')
    },

    /** 🔹 Excluir item */
    async deleteItem() {
      try {
        this.dialogDelete.loading = true
        await this.$api.delete(`/users/${this.dialogDelete?.item?.id}`)
      } catch (error) {
        console.error('Erro ao buscar usuário:', error)
      } finally {
        await this.getAllUsers()
        this.dialogDelete.loading = false
        this.dialogDelete.active = false
        this.dialogDelete.item = null
      }
    },

    /** 🔹 Aplicar filtros */
    applyFilters() {
      this.users = this.users.filter((g) => {
        const matchName = this.search
          ? g.name?.toLowerCase().includes(this.search.toLowerCase())
          : true

        return matchName
      })
      this.page = 1
    },

    openDialogDelete(item: User) {
      this.dialogDelete.active = true
      this.dialogDelete.item = item
    },
    closeDialogDelete() {
      this.dialogDelete.active = false
      this.dialogDelete.item = null
      this.dialogDelete.loading = false
    },

    /** 🔹 Voltar */
    goBack() {
      this.$router.back()
    },
  },
})
</script>

<style scoped>
.v-select.ml-2 :deep(.v-field__input) {
  padding-top: 5px;
  padding-bottom: 5px;
}
.new-funcionario-btn {
  height: 42px !important;
  background: #c6f513 !important;
  border-radius: 8px;
  margin-top: 10px !important;
  margin-bottom: 10px !important;
}
.table-title-text {
  font-size: 15px;
  margin-bottom: 8px !important;
  padding: 10px !important;
}
</style>
