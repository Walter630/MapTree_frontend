<template>

    <v-container class="pa-6">
      <v-row>
        <v-col cols="12">
          <div class="d-flex align-center mb-4">
            <span class="text-caption text-grey-darken-1">Meu Painel</span>
            <v-icon small class="mx-1 text-grey-darken-1">mdi-chevron-right</v-icon>
            <span class="text-caption font-weight-bold" style="color: #2F3367;">#Empresas</span>
          </div>

          <div class="d-flex align-center">
            <v-btn icon size="small" class="mr-2" @click="goBack">
              <v-icon>mdi-chevron-left</v-icon>
            </v-btn>
            <span class="text-h5 font-weight-regular" style="color: #2F3367; margin-left: 10px;">Empresas</span>
          </div>
        </v-col>
      </v-row>

      <v-row class="mt-4" align="center" style="margin-top: 20px;">
        <v-col cols="12" sm="3" md="2">
          <v-btn
            color="#C6F513"
            size="large"
            class="font-weight-bold text-black"
            style="margin-top: 60px;"
            @click="addEmpresa"
          >
            ADICIONAR
            <v-icon end>mdi-plus</v-icon>
          </v-btn>
        </v-col>

        <v-col cols="12" sm="9" md="10">
          <v-row justify="end" align="center">

            <v-col cols="12" sm="4" md="3" lg="2">
              <v-select
                v-model="filterLocalizacao"
                :items="localizacoes"
                label="Ceará"
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
                append-inner-icon="mdi-magnify"
                variant="outlined"
                density="compact"
                hide-details
                clearable
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
      </v-row>

      <v-row class="mt-4">
        <v-col cols="12">
          <v-data-table
            :headers="headers"
            :items="filteredEmpresas"
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

            <template #item.cidade="{ item }">
              <div class="text-body-1">{{ item.cidade }}</div>
            </template>

            <template #item.status="{ item }">
              <v-chip :color="getStatusColor(item.status)" class="font-weight-bold" label>
                {{ item.status }}
              </v-chip>
            </template>

            <template #item.acoes="{ item }">
              <v-icon size="small" class="mr-2" @click="editItem(item)">mdi-square-edit-outline</v-icon>
              <v-icon size="small" @click="deleteItem(item)">mdi-trash-can-outline</v-icon>
            </template>

          </v-data-table>
        </v-col>
      </v-row>
    </v-container>

</template>

<script lang="ts">
import { defineComponent } from 'vue'

interface Empresa {
  id: string;
  nome: string;
  cidade: string;
  status: 'Nome' | 'Nome' | 'Nome' | 'Nome'; // Status repetido na imagem, mas simulando 4 estados
  fotoUrl: string;
  localizacao: string;
}

export default defineComponent({
  name: 'EmpresasAdminView',

  data: () => ({
    filterLocalizacao: 'Ceará', // Valor inicial
    search: '', // Busca pelo Nome

    localizacoes: ['Ceará', 'Pernambuco', 'Bahia'], // Opções de filtro de Localização

    // Headers ajustados para a tela de Empresas
    headers: [
      { title: 'Id', align: 'start', sortable: true, key: 'id' },
      { title: 'Nome', key: 'nome', sortable: true },
      { title: 'Cidade', key: 'cidade', sortable: true },
      { title: 'Status', key: 'status', sortable: true },
      { title: 'Ações', key: 'acoes', sortable: false, align: 'end' },
    ],

    // Dados da Tabela simulando os estados da imagem
    empresas: [
      {
        id: '#35R4Y57U6',
        nome: 'Fulano De Tal',
        cidade: 'Fulano De Tal',
        status: 'Nome', // Cor verde claro
        fotoUrl: 'https://cdn.vuetifyjs.com/images/lists/1.jpg',
        localizacao: 'Ceará',
      },
      {
        id: '#35R4Y57U6',
        nome: 'Fulano De Tal',
        cidade: 'Fulano De Tal',
        status: 'Nome', // Cor vermelha clara
        fotoUrl: 'https://cdn.vuetifyjs.com/images/lists/2.jpg',
        localizacao: 'Pernambuco',
      },
      {
        id: '#35R4Y57U6',
        nome: 'Fulano De Tal',
        cidade: 'Fulano De Tal',
        status: 'Nome', // Cor amarela clara
        fotoUrl: 'https://cdn.vuetifyjs.com/images/lists/3.jpg',
        localizacao: 'Ceará',
      },
      {
        id: '#35R4Y57U6',
        nome: 'Fulano De Tal',
        cidade: 'Fulano De Tal',
        status: 'Nome', // Cor cinza claro
        fotoUrl: 'https://cdn.vuetifyjs.com/images/lists/4.jpg',
        localizacao: 'Ceará',
      },
    ] as Empresa[],
  }),

  computed: {
    // Filtragem pelos v-selects (Localizacao)
    filteredEmpresas(): Empresa[] {
      return this.empresas.filter((empresa) => {
        const matchesLocalizacao = this.filterLocalizacao ? empresa.localizacao === this.filterLocalizacao : true
        // A busca por 'Nome' é tratada pelo v-data-table via :search="search"
        return matchesLocalizacao
      })
    },
  },

  methods: {
    // Função auxiliar para retornar a cor do v-chip com base no Status
    getStatusColor(status: string): string {
      // Simulação das cores da imagem (verde, vermelho, amarelo, cinza)
      switch (status) {
        case 'Nome': return 'light-green-lighten-4'; // Primeira linha (Verde claro)
        case 'Nome': return 'red-lighten-4'; // Segunda linha (Vermelho claro)
        case 'Nome': return 'yellow-lighten-4'; // Terceira linha (Amarelo claro)
        default: return 'grey-lighten-3'; // Quarta linha (Cinza claro)
      }
    },

    goBack() {
      console.log('Voltar para a página anterior')
    },
    addEmpresa() {
      console.log('Abrir formulário Adicionar Empresa')
    },
    applyFilters() {
      console.log('Filtros aplicados:', this.filterLocalizacao, this.search)
    },
    editItem(item: Empresa) {
      console.log('Editar Empresa:', item)
    },
    deleteItem(item: Empresa) {
      console.log('Excluir Empresa:', item)
    },
  },
})
</script>

<style scoped>
/* Nenhum estilo adicional necessário, o Vuetify cuida do layout */
</style>
