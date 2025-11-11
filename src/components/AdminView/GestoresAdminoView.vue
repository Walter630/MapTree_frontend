<template>

    <v-container class="pa-6">
      <!-- Cabeçalho -->
      <v-row>
        <v-col cols="12">
          <div class="d-flex align-center mb-4">
            <span class="text-caption text-grey-darken-1">Meu Painel</span>
            <v-icon small class="mx-1 text-grey-darken-1">mdi-chevron-right</v-icon>
            <span class="text-caption font-weight-bold">#Gestores</span>
          </div>
          <v-col cols="12" md="8">
            <div>
              <p style="color: #667085; font-size: 14px; font-weight: bold; margin: 0; margin-bottom: 10px;"
                 class="text-medium-emphasis">Gestores</p>
              <p style="margin: 0;">Gerencie usuários e suas permissões no sistema</p>
            </div>
          </v-col>

        </v-col>
      </v-row>

      <!-- Filtros -->
      <v-row class="mt-6" align="center" style="margin-top: 20px;">
        <v-col cols="12" sm="3" md="2">
          <v-btn
            color="#C6F513"
            size="large"
            style="margin-top: 60px;"
            class="font-weight-bold text-black"
            prepend-icon="mdi-plus"
            @click="addGestor"
          >
            Novo Gestor

          </v-btn>
        </v-col>
      </v-row>


      <!-- Cards de resumo -->
      <v-row>
        <v-col cols="12" md="7" style="margin: 20px; display: flex; flex-direction: row; gap: 30px;">
          <v-card style="width: 264px; height: 174px; background-color: #CDCDCD; border-radius: 10px; box-shadow: none; border: 1px solid #000000;">
            <v-card-title style="display: flex; justify-content: space-between;">Empresas<v-icon>mdi-domain</v-icon></v-card-title>
            <v-card-text>
              <p style="margin-top: 60px;" class="text-h5">90</p>
              <p style="margin-top: 10px;">+ 3 este mês</p>
            </v-card-text>
          </v-card>

          <v-card style="width: 264px; height: 174px; background-color: #CDCDCD; border-radius: 10px; box-shadow: none; border: 1px solid #000000;">
            <v-card-title style="display: flex; justify-content: space-between;">Gestores<v-icon>mdi-account-group</v-icon></v-card-title>
            <v-card-text>
              <p style="margin-top: 60px;" class="text-h5">90</p>
              <p style="margin-top: 10px;">+ 3 este mês</p>
            </v-card-text>
          </v-card>

          <v-card style="width: 264px; height: 174px; background-color: #CDCDCD; border-radius: 10px; box-shadow: none; border: 1px solid #000000;">
            <v-card-title style="display: flex; justify-content: space-between;">Espécies<v-icon>mdi-sprout</v-icon></v-card-title>
            <v-card-text>
              <p style="margin-top: 60px;" class="text-h5">90</p>
              <p style="margin-top: 10px;">+ 3 este mês</p>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Filtros de busca -->

        <v-col cols="12" style="margin: 20px; display: flex; flex-direction: row; gap: 30px; justify-content: space-between; background-color: #CDCDCD">
          <v-icon>mdi-filters</v-icon> <p class="text-medium-emphasis text-h6">Filtros</p>
          <v-row align="center" class="pa-4" style="display: flex; flex-wrap: wrap; gap: 15px; justify-content: space-between;">
            <v-col cols="12" sm="4" md="3" lg="2">
              <v-select
                v-model="filterConta"
                :items="contas"
                label="Empresa"
                variant="outlined"
                density="compact"
                hide-details
                prepend-inner-icon="mdi-map-marker-outline"
              />
            </v-col>



            <v-col cols="12" sm="4" md="4" lg="3">
              <v-text-field
                v-model="search"
                label="Nome"

                variant="outlined"
                density="compact"
                hide-details
                clearable
              />
            </v-col>
            <v-col cols="12" sm="4" md="3" lg="2">
              <v-select
                v-model="filterCidade"
                :items="cidades"
                label="Cidade"
                variant="outlined"
                density="compact"
                hide-details
                prepend-inner-icon="mdi-city-variant-outline"
              />
            </v-col>
            <v-col cols="auto" class="pl-0">
              <v-btn
                color="black"
                class="text-white"
                height="40"
                @click="applyFilters"
              >
                BUSCAR
              </v-btn>
            </v-col>
          </v-row>
        </v-col>

        <!-- Tabela -->
      <v-row class="mt-4">
        <v-col cols="12">
          <v-data-table
            :headers="headers"
            :items="paginatedGestores"
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

            <template #item.empresa="{ item }">
              <div class="text-body-1">{{ item.empresa }}</div>
            </template>

            <template #item.acoes="{ item }">
              <v-icon size="small" class="mr-2" @click="editItem(item)">mdi-pencil</v-icon>
              <v-icon size="small" @click="deleteItem(item)">mdi-delete</v-icon>
            </template>
          </v-data-table>
        </v-col>
      </v-row>

      <!-- Paginação -->
      <v-row justify="center" class="mt-4">
        <v-pagination
          v-model="page"
          :length="pageCount"
          total-visible="5"
          rounded="circle"
          active-color="black"
        />
      </v-row>
    </v-container>

</template>

<script lang="ts">
import { defineComponent, computed, ref } from 'vue'

interface Gestor {
  id: string;
  nome: string;
  empresa: string;
  fotoUrl: string;
  conta: string;
  cidade: string;
}

export default defineComponent({
  name: 'GestoresAdminView',

  setup() {
    // Estado da página atual e tamanho da página
    const page = ref(1)
    const itemsPerPage = 5 // Número de gestores por página

    // Dados simulados
    const gestores = ref<Gestor[]>([
      { id: '#3S84Y57U6', nome: 'Fulano De Tal', empresa: 'Empresa Alpha', fotoUrl: 'https://cdn.vuetifyjs.com/images/lists/1.jpg', conta: 'Conta B', cidade: 'Cidade X' },
      { id: '#9S3A2B1C0', nome: 'Ciclano De Oliveira', empresa: 'Empresa Beta', fotoUrl: 'https://cdn.vuetifyjs.com/images/lists/2.jpg', conta: 'Conta A', cidade: 'Cidade Y' },
      { id: '#4R7T9Y0I2', nome: 'Beltrana da Silva', empresa: 'Empresa Gamma', fotoUrl: 'https://cdn.vuetifyjs.com/images/lists/3.jpg', conta: 'Conta B', cidade: 'Cidade Z' },
      { id: '#7D2K5L9M3', nome: 'Marcos Lima', empresa: 'Empresa Delta', fotoUrl: 'https://cdn.vuetifyjs.com/images/lists/1.jpg', conta: 'Conta C', cidade: 'Cidade Y' },
      { id: '#8P9O2A6Q4', nome: 'Ana Souza', empresa: 'Empresa Épsilon', fotoUrl: 'https://cdn.vuetifyjs.com/images/lists/2.jpg', conta: 'Conta B', cidade: 'Cidade X' },
      { id: '#5J1T3U7B9', nome: 'Carlos Pereira', empresa: 'Empresa Zeta', fotoUrl: 'https://cdn.vuetifyjs.com/images/lists/3.jpg', conta: 'Conta A', cidade: 'Cidade Z' },
      { id: '#1A2B3C4D5', nome: 'Joana Prado', empresa: 'Empresa Theta', fotoUrl: 'https://cdn.vuetifyjs.com/images/lists/1.jpg', conta: 'Conta C', cidade: 'Cidade X' },
    ])

    const filterConta = ref<string | null>('Conta B')
    const filterCidade = ref<string | null>(null)
    const search = ref('')

    const contas = ['Conta A', 'Conta B', 'Conta C']
    const cidades = ['Cidade X', 'Cidade Y', 'Cidade Z']

    const headers = [
      { title: 'ID', key: 'id', align: 'start', sortable: true },
      { title: 'Nome', key: 'nome', sortable: true },
      { title: 'Empresa', key: 'empresa', sortable: true },
      { title: 'Ações', key: 'acoes', align: 'end', sortable: false },
    ]

    // Filtragem
    const filteredGestores = computed(() =>
      gestores.value.filter((g) => {
        const matchesConta = filterConta.value ? g.conta === filterConta.value : true
        const matchesCidade = filterCidade.value ? g.cidade === filterCidade.value : true
        return matchesConta && matchesCidade
      })
    )

    // Paginação
    const pageCount = computed(() =>
      Math.ceil(filteredGestores.value.length / itemsPerPage)
    )

    const paginatedGestores = computed(() => {
      const start = (page.value - 1) * itemsPerPage
      const end = start + itemsPerPage
      return filteredGestores.value.slice(start, end)
    })

    // Métodos
    function goBack() {
      console.log('Voltar')
    }
    function addGestor() {
      console.log('Adicionar Gestor')
    }
    function applyFilters() {
      console.log('Filtros aplicados')
    }
    function editItem(item: Gestor) {
      console.log('Editar:', item)
    }
    function deleteItem(item: Gestor) {
      console.log('Excluir:', item)
    }

    return {
      gestores,
      headers,
      contas,
      cidades,
      filterConta,
      filterCidade,
      search,
      filteredGestores,
      paginatedGestores,
      page,
      pageCount,
      goBack,
      addGestor,
      applyFilters,
      editItem,
      deleteItem,
    }
  },
})
</script>
