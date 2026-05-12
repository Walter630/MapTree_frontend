<template>
  <v-container class="pt-3 pb-6 px-6" style="max-width: 1400px; margin: 0 auto;">
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
          :loading="loading"
          class="elevation-0 modern-table"
        >
          <template #[`item.name`]="{ item }">
            <span class="font-weight-bold">{{ item.name }}</span>
          </template>

          <template #[`item.isActive`]="{ item }">
            <v-chip :color="item.isActive ? 'green-darken-1' : 'red-darken-1'" size="x-small" variant="flat" class="font-weight-bold">
              {{ item.isActive ? 'ATIVO' : 'INATIVO' }}
            </v-chip>
          </template>

          <template #[`item.acoes`]="{ item }">
             <v-btn icon size="x-small" variant="text" color="blue-grey-darken-2" @click="openDialogEdit(item)">
                <v-icon>mdi-pencil-outline</v-icon>
             </v-btn>
             <v-btn icon size="x-small" variant="text" color="red-darken-2" @click="openDialogDelete(item)">
                <v-icon>mdi-trash-can-outline</v-icon>
             </v-btn>
          </template>
        </v-data-table>
      </v-col>
    </v-row>
    
    <v-dialog v-model="dialogEdit.active" max-width="500px">
      <v-card v-if="dialogEdit.item" class="rounded-xl pa-4">
        <v-card-title class="text-h6 font-weight-bold">Editar Funcionário</v-card-title>
        <v-card-text>
          <v-row dense>
            <v-col cols="12">
              <v-text-field v-model="dialogEdit.item.name" label="Nome Completo" variant="outlined" density="comfortable" />
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="dialogEdit.item.email" label="Email" variant="outlined" density="comfortable" />
            </v-col>
            <v-col cols="12">
              <v-select
                v-model="dialogEdit.item.isActive"
                :items="[{ title: 'Ativo', value: true }, { title: 'Inativo', value: false }]"
                label="Status da Conta"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeDialogEdit">Cancelar</v-btn>
          <v-btn color="black" variant="flat" :loading="dialogEdit.loading" @click="editItem">Salvar Alterações</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ===== Diálogo de Exclusão ===== -->
    <v-dialog v-model="dialogDelete.active" max-width="450px">
      <v-card v-if="dialogDelete.item" class="rounded-xl pa-4">
        <v-card-title class="text-h6 font-weight-bold text-error">Excluir Funcionário?</v-card-title>
        <v-card-text>
          Tem certeza que deseja remover <strong>{{ dialogDelete.item.name }}</strong>? 
          Esta ação removerá o acesso do usuário permanentemente.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeDialogDelete">Pensa melhor</v-btn>
          <v-btn color="error" variant="flat" :loading="dialogDelete.loading" @click="deleteItem">Sim, Excluir</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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
      users: [] as any[],
      loading: false,
      search: '',
      itemsPerPage: 10,
      page: 1,
      headers: [
        { title: 'Nome Completo', key: 'name', align: 'start' as const },
        { title: 'CPF / Registro', key: 'cpf', align: 'center' as const },
        { title: 'Status', key: 'isActive', align: 'center' as const },
        { title: 'Ações', key: 'acoes', align: 'end' as const, sortable: false },
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
      totalUsers: 0,
      cpfMask: '###.###.###-##',
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
      if (!this.dialogEdit.item) return
      try {
        this.dialogEdit.loading = true
        await this.$api.patch(`/users/${this.dialogEdit.item.id}`, {
          name: this.dialogEdit.item.name,
          email: this.dialogEdit.item.email,
          isActive: this.dialogEdit.item.isActive,
        })
        this.notify('Funcionário atualizado!', 'success')
      } catch (error) {
        console.error('Erro ao editar:', error)
      } finally {
        await this.getAllUsers()
        this.closeDialogEdit()
      }
    },

    openDialogEdit(item: any) {
      this.dialogEdit.item = { ...item } // Clone necessário para evitar erro de null na transição
      this.dialogEdit.active = true
    },
    closeDialogEdit() {
      this.dialogEdit.active = false
      this.dialogEdit.item = null
      this.dialogEdit.loading = false
    },
    notify(text: string, color = 'success') {
       // Notifica se houver snackbar ou similar no parent
       console.log(text, color)
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
      if (!this.dialogDelete.item) return
      try {
        this.dialogDelete.loading = true
        await this.$api.delete(`/users/${this.dialogDelete.item.id}`)
        this.notify('Usuário removido.', 'success')
      } catch (error) {
        console.error('Erro ao excluir:', error)
      } finally {
        await this.getAllUsers()
        this.closeDialogDelete()
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
