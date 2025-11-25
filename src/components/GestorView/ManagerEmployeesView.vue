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
          <v-btn class="mr-4" style="box-shadow: none; border: 1px solid #D0D5DD; height: 56px; border-radius: 8px; background-color: #FFFFFF; width: 56px" @click="goBack">
            <v-icon>mdi-chevron-left</v-icon>
          </v-btn>
          <div>
            <span class="text-h5 font-weight-regular" style="color: #2F3367">FUNCIONÁRIOS</span>
            <p class="text-body-2 text-grey-darken-1" style="margin-top: 10px">Gerencie Os Funcionários E Suas Atribuições.</p>
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
          :items="paginatedFuncionarios"
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
              <v-avatar size="40" class="mr-3">
                <v-img :src="item.fotoUrl" :alt="item.nome" />
              </v-avatar>
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
            style="width: 70px; font-size: 12px;"
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
              v-for="p in pageCount"
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
          <v-btn size="small" variant="text" :color="page === 11 ? 'black' : 'grey'" @click="page = 11" class="font-weight-bold">11</v-btn>
          <v-btn size="small" variant="text" :color="page === 12 ? 'black' : 'grey'" @click="page = 12" class="font-weight-bold">12</v-btn>

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
import { defineComponent, computed, ref } from 'vue'

interface Funcionario {
  id: string;
  nome: string;
  status: string; // O status na imagem é "Fulano De Tal", vou manter como string para simulação
  fotoUrl: string;
  gerente: string;
}

export default defineComponent({
  name: 'FuncionarioGestorView',

  setup() {
    // --- ESTADO E DADOS ---
    const page = ref(1)
    const itemsPerPage = ref(4) // Ajustado para 4, conforme 'Linhas por página 4' na imagem

    const filterGerente = ref<string | null>('Gerente A')
    const search = ref('')

    const gerentes = ['Gerente A', 'Gerente B', 'Gerente C']

    const funcionarios = ref<Funcionario[]>([
      { id: '#35R4Y57U6', nome: 'Fulano De Tal', status: 'Fulano De Tal', fotoUrl: 'https://cdn.vuetifyjs.com/images/lists/1.jpg', gerente: 'Gerente A' },
      { id: '#35R4Y57U6', nome: 'Ciclano De Oliveira', status: 'Fulano De Tal', fotoUrl: 'https://cdn.vuetifyjs.com/images/lists/2.jpg', gerente: 'Gerente B' },
      { id: '#35R4Y57U6', nome: 'Beltrana da Silva', status: 'Fulano De Tal', fotoUrl: 'https://cdn.vuetifyjs.com/images/lists/3.jpg', gerente: 'Gerente A' },
      { id: '#35R4Y57U6', nome: 'Marcos Lima', status: 'Fulano De Tal', fotoUrl: 'https://cdn.vuetifyjs.com/images/lists/1.jpg', gerente: 'Gerente C' },
      // Adicionando mais para simular paginação
      { id: '#1A2B3C4D5', nome: 'Joana Prado', status: 'Fulano De Tal', fotoUrl: 'https://cdn.vuetifyjs.com/images/lists/4.jpg', gerente: 'Gerente A' },
      { id: '#5J1T3U7B9', nome: 'Carlos Pereira', status: 'Fulano De Tal', fotoUrl: 'https://cdn.vuetifyjs.com/images/lists/2.jpg', gerente: 'Gerente B' },
      { id: '#8P9O2A6Q4', nome: 'Ana Souza', status: 'Fulano De Tal', fotoUrl: 'https://cdn.vuetifyjs.com/images/lists/3.jpg', gerente: 'Gerente C' },
      { id: '#7D2K5L9M3', nome: 'Pedro Henrique', status: 'Fulano De Tal', fotoUrl: 'https://cdn.vuetifyjs.com/images/lists/1.jpg', gerente: 'Gerente A' },
      { id: '#6F8G4H2J0', nome: 'Sofia Nunes', status: 'Fulano De Tal', fotoUrl: 'https://cdn.vuetifyjs.com/images/lists/4.jpg', gerente: 'Gerente B' },
      { id: '#0Q9W8E7R6', nome: 'Lucas Rocha', status: 'Fulano De Tal', fotoUrl: 'https://cdn.vuetifyjs.com/images/lists/3.jpg', gerente: 'Gerente C' },
    ])

    // Headers ajustados para as colunas: ID, Nome, Status, Ações
    const headers = [
      { title: 'Id', key: 'id', align: 'start', sortable: true },
      { title: 'Nome', key: 'nome', sortable: true },
      { title: 'Status', key: 'status', sortable: true },
      { title: 'Ações', key: 'acoes', align: 'end', sortable: false },
    ]

    // --- COMPUTED: FILTRAGEM E PAGINAÇÃO ---
    const filteredFuncionarios = computed(() =>
      funcionarios.value.filter((f) => {
        // Filtra apenas pelo Gerente (o único filtro de v-select na imagem)
        const matchesGerente = filterGerente.value ? f.gerente === filterGerente.value : true
        // A busca global por 'search' é tratada pelo v-data-table
        return matchesGerente
      })
    )

    const pageCount = computed(() =>
      Math.ceil(filteredFuncionarios.value.length / itemsPerPage.value)
    )

    const paginatedFuncionarios = computed(() => {
      const start = (page.value - 1) * itemsPerPage.value
      const end = start + itemsPerPage.value
      // Aplica a paginação APÓS a filtragem do gerente
      return filteredFuncionarios.value.slice(start, end)
    })

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

    return {
      funcionarios,
      headers,
      gerentes,
      filterGerente,
      search,
      paginatedFuncionarios,
      page,
      pageCount,
      itemsPerPage,
      goBack,
      addFuncionario,
      applyFilters,
      editItem,
      deleteItem,
    }
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
