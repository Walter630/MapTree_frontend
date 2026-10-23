<template>
  <v-container fluid class="page-shell">
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

    <v-card flat class="employees-card mt-6">
      <!-- Cabeçalho do card: título + busca -->
      <div class="employees-card-header">
        <div class="d-flex align-center">
          <v-icon color="green-darken-1" class="mr-2">mdi-account-group</v-icon>
          <div>
            <p class="employees-card-title mb-0">Funcionários cadastrados</p>
            <p class="employees-card-subtitle mb-0">
              {{ users.length }} {{ users.length === 1 ? 'registro' : 'registros' }}
            </p>
          </div>
        </div>
        <v-text-field
          v-model="search"
          placeholder="Buscar por nome, e-mail ou CPF"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          class="employees-search"
        />
      </div>

      <v-divider />

      <v-data-table
        :headers="headers"
        :items="users"
        :search="search"
        :loading="loading"
        class="elevation-0 modern-table"
        hover
      >
        <template #[`item.name`]="{ item }">
          <div class="d-flex align-center py-1">
            <v-avatar size="34" color="green-lighten-5" class="mr-3">
              <span class="text-green-darken-2 font-weight-bold">{{ getInitials(item.name) }}</span>
            </v-avatar>
            <div class="d-flex flex-column">
              <span class="font-weight-bold text-body-2">{{ item.name }}</span>
              <span class="text-caption text-grey-darken-1">{{ item.email }}</span>
            </div>
          </div>
        </template>

        <template #[`item.cpf`]="{ item }">
          <span class="text-body-2 text-grey-darken-2">{{ formatCpf(item.cpf) }}</span>
        </template>

        <template #[`item.isActive`]="{ item }">
          <v-chip
            :color="item.isActive ? 'green-darken-1' : 'red-darken-1'"
            size="small"
            variant="tonal"
            class="font-weight-bold"
          >
            <v-icon start size="14">{{ item.isActive ? 'mdi-check-circle' : 'mdi-close-circle' }}</v-icon>
            {{ item.isActive ? 'Ativo' : 'Inativo' }}
          </v-chip>
        </template>

        <template #[`item.acoes`]="{ item }">
          <v-btn icon size="small" variant="text" color="blue-grey-darken-2" @click="openDialogEdit(item)">
            <v-icon>mdi-pencil-outline</v-icon>
            <v-tooltip activator="parent" location="top">Editar</v-tooltip>
          </v-btn>
          <v-btn icon size="small" variant="text" color="red-darken-2" @click="openDialogDelete(item)">
            <v-icon>mdi-trash-can-outline</v-icon>
            <v-tooltip activator="parent" location="top">Excluir</v-tooltip>
          </v-btn>
        </template>

        <template #no-data>
          <div class="text-center py-10">
            <v-icon size="48" color="grey-lighten-1">mdi-account-off-outline</v-icon>
            <p class="text-body-2 text-grey mt-2">Nenhum funcionário encontrado</p>
          </div>
        </template>
      </v-data-table>
    </v-card>
    
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
              <v-text-field v-model="dialogEdit.item.cpf" label="CPF" variant="outlined" density="comfortable" />
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="dialogEdit.item.phone" label="Telefone" variant="outlined" density="comfortable" />
            </v-col>
            <v-col cols="12">
              <v-select
                v-model="dialogEdit.item.role"
                :items="roleOptions"
                label="Perfil"
                variant="outlined"
                density="comfortable"
              />
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
  role: string
  isActive: boolean
  companyId: Company[]
}

export default defineComponent({
  components: { PageHeader },
  data() {
    return {
      users: [] as Funcionario[],
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
        item: null as Funcionario | null,
      },
      dialogEdit: {
        active: false,
        loading: false,
        item: null as Funcionario | null,
      },
      roleOptions: [
        { title: 'Usuário', value: 'USER' },
        { title: 'Gestor', value: 'GESTOR' },
      ],

      // backup para filtros
      allUsers: [] as Funcionario[],
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
        const response = await this.$api.get<Funcionario[]>('/users')
        this.allUsers = response.data.map((user) => ({
          ...user,
          isActive: user.isActive ?? true,
          role: user.role ?? 'USER',
        }))
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
        // Obs.: não enviamos "role" aqui — o backend só permite que um ADMIN
        // altere a role de um usuário (gestor recebe 403 se enviar role).
        await this.$api.patch(`/users/${this.dialogEdit.item.id}`, {
          name: this.dialogEdit.item.name,
          email: this.dialogEdit.item.email,
          cpf: this.onlyDigits(this.dialogEdit.item.cpf),
          phone: this.onlyDigits(this.dialogEdit.item.phone),
        })
        this.notify('Funcionário atualizado!', 'success')
      } catch (error) {
        console.error('Erro ao editar:', error)
        this.notify('Não foi possível atualizar o funcionário.', 'error')
      } finally {
        await this.getAllUsers()
        this.closeDialogEdit()
      }
    },

    openDialogEdit(item: any) {
      this.dialogEdit.item = { ...item, role: item.role ?? 'USER' }
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

    onlyDigits(value: string) {
      return value?.replace(/\D/g, '') ?? ''
    },

    /** Iniciais do nome para o avatar (ex.: "João Silva" -> "JS") */
    getInitials(name: string): string {
      if (!name) return '?'
      const parts = name.trim().split(/\s+/)
      const first = parts[0]?.[0] ?? ''
      const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
      return (first + last).toUpperCase()
    },

    /** Formata CPF para 000.000.000-00 (apenas visual) */
    formatCpf(cpf: string): string {
      const digits = this.onlyDigits(cpf)
      if (digits.length !== 11) return cpf || '—'
      return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
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

    openDialogDelete(item: Funcionario) {
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
.new-funcionario-btn {
  height: 44px !important;
  background: #c6f513 !important;
  border-radius: 10px;
}

/* Card que envolve a tabela */
.employees-card {
  border: 1px solid #e8e8e8;
  border-radius: 16px;
  background: #ffffff;
  overflow: hidden;
}

.employees-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  flex-wrap: wrap;
}

.employees-card-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #2c3e2c;
}

.employees-card-subtitle {
  font-size: 0.78rem;
  color: #9a9a9a;
}

.employees-search {
  max-width: 320px;
  flex: 1 1 240px;
}

/* Tabela */
.modern-table {
  background: transparent;
}

.modern-table :deep(thead th) {
  font-weight: 700 !important;
  color: #556 !important;
  text-transform: uppercase;
  font-size: 0.72rem !important;
  letter-spacing: 0.4px;
  background: #fafafa;
}

.modern-table :deep(tbody tr:hover) {
  background: #f6faf4 !important;
}

.modern-table :deep(td) {
  border-bottom: 1px solid #f0f0f0 !important;
}
</style>
