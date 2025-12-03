<template>
  <v-container class="pa-6">
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center mb-2">
          <span class="text-caption text-grey-darken-1">Meu Painel</span>
          <v-icon small class="mx-1 text-grey-darken-1">mdi-chevron-right</v-icon>
          <span class="text-caption font-weight-bold">#Funcionários</span>
        </div>

        <div class="d-flex align-center mb-4 mt-6">
          <v-btn
            class="mr-4"
            style="
              box-shadow: none;
              border: 1px solid #d0d5dd;
              height: 56px;
              border-radius: 8px;
              background-color: #ffffff;
              width: 56px;
            "
            @click="goBack"
          >
            <v-icon>mdi-chevron-left</v-icon>
          </v-btn>
          <div>
            <span class="text-h5 font-weight-regular" style="color: #2f3367">FUNCIONÁRIOS</span>
            <p class="text-body-2 text-grey-darken-1" style="margin-top: 10px">
              Gerencie Os Funcionários E Suas Atribuições.
            </p>
          </div>
        </div>
      </v-col>
    </v-row>

    <v-row class="mt-4" align="center">
      <v-col cols="12" sm="6" md="3" lg="8">
        <v-btn
          color="#C6F513"
          size="large"
          prepend-icon="mdi-plus"
          class="font-weight-bold text-black"
          @click="$router.push('/manager/register-employee')"
        >
          ADICIONAR FUNCIONÁRIO
        </v-btn>
      </v-col>
    </v-row>

    <v-row class="mt-6">
      <v-col cols="12">
        <v-data-table
          :headers="headers"
          :items="funcionarios"
          :search="search"
          :sort-by="[{ key: 'nome', order: 'asc' }]"
          class="elevation-1"
          hide-default-footer
        >
          <template #item.id="{ item }">
            <div class="text-subtitle-2 font-weight-bold py-2">{{ item.id }}</div>
          </template>

          <template #item.nome="{ item }">
            <div class="d-flex align-center py-2">
              <div class="text-body-1">{{ item.nome }}</div>
            </div>
          </template>

          <template #item.status="{ item }">
            <div class="text-body-1">{{ item.status }}</div>
          </template>

          <template #item.acoes="{ item }">
            <v-icon size="small" class="mr-2" @click="editItem(item)">mdi-pencil</v-icon>
            <v-icon size="small" @click="deleteItem(item)">mdi-delete</v-icon>
          </template>
        </v-data-table>
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
import { defineComponent, ref, inject } from 'vue'
import type { ApiConnect, User } from '@/plugins/apiConnect.ts'

interface Funcionario {
  id: string
  nome: string
  cpf: string
  status: string // O status na imagem é "Fulano De Tal", vou manter como string para simulação
}

export default defineComponent({
  name: 'FuncionarioGestorView',
  setup() {
    const api: ApiConnect = inject('api') as ApiConnect // Injeção do serviço API, se necessário
    const store: any = inject('store'); // Injeção do store, se necessário

    // --- ESTADO E DADOS ---
    const page = ref(1)
    const itemsPerPage = ref(4) // Ajustado para 4, conforme 'Linhas por página 4' na imagem

    const filterGerente = ref<string | null>('Gerente A')
    const search = ref('')

    const gerentes = ['Gerente A', 'Gerente B', 'Gerente C']

    const funcionarios = ref<Funcionario[]>([])

    // Headers ajustados para as colunas: ID, Nome, Status, Ações
    const headers = [
      { title: 'Id', key: 'id', align: 'start', sortable: true },
      { title: 'Nome', key: 'nome', sortable: true },
      { title: 'CPF', key: 'cpf', sortable: true },
      { title: 'Telefone', key: 'phone', sortable: true },
      { title: 'Status', key: 'status', sortable: true },
      { title: 'Ações', key: 'acoes', align: 'end', sortable: false },
    ]

    // --- MÉTODOS ---
    function goBack() {
      console.log('Voltar para a página anterior')
    }
    function addFuncionario() {
      console.log('Adicionar Funcionário')
    }
    function applyFilters() {
      console.log('Filtros aplicados:', filterGerente.value, search.value)
      // Volta para a primeira página após aplicar filtros
      page.value = 1
    }
    function editItem(item: Funcionario) {
      console.log('Editar:', item)
    }
    function deleteItem(item: Funcionario) {
      console.log('Excluir:', item)
    }
    async function fetchFuncionarios() {
      try {
        const response = await api.get<User[]>('users', {
          params: {
            role: 'USER',
          },
        });

        funcionarios.value = response.data.map((user) => ({
          id: user.id,
          nome: user.name,
          cpf: user.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '***.$2.$3-**'),
          phone: user.phone.replace(/(\d{2})(\d)(\d{4})(\d{4})/, '($1) $2 $3-$4'),
          status: user.isActive ? 'Ativo' : 'Inativo',
        }));
      } catch (error) {
        console.error('Erro ao buscar funcionários:', error)
      }
    }

    return {
      funcionarios,
      headers,
      gerentes,
      filterGerente,
      search,
      page,
      itemsPerPage,
      goBack,
      addFuncionario,
      applyFilters,
      editItem,
      deleteItem,
      fetchFuncionarios,
      store,
    }
  },
  async created() {
    await this.fetchFuncionarios();
  },
})
</script>

<style scoped>
/* Estilo para ajustar o alinhamento do v-select no footer */
.v-select.ml-2 {
  font-size: 12px;
}
.v-select.ml-2 :deep(.v-field__input) {
  padding-top: 5px;
  padding-bottom: 5px;
}
</style>
