<template>

    <v-container class="pa-6">
      <!-- Cabeçalho -->
      <v-row>
        <v-col cols="12">
          <div class="d-flex align-center mb-7">
            <span class="text-caption text-grey-darken-1">Meu Painel</span>
            <v-icon small class="mx-1 text-grey-darken-1">mdi-chevron-right</v-icon>
            <span class="text-caption font-weight-bold" style="color: #2F3367;">#Empresas</span>
          </div>

          <div class="d-flex align-center">
            <v-btn  class="mr-4" style="box-shadow: none; border: 1px solid; height: 56px; border-radius: 8px; background-color: #D0D5DD; width: 56px" @click="goBack">
              <v-icon>mdi-chevron-left</v-icon>
            </v-btn>
            <div>
              <p style="color: #2F3367; font-size: 20px; font-weight: bold; margin:  10px 1px; ">Empresas</p>
              <p style="margin: 0;">Gerencie empresas cadastradas no sistema</p>
            </div>
          </div>
        </v-col>
      </v-row>

      <!-- Filtros -->
      <v-row class="mt-3" align="center" style="margin-bottom: 20px">
        <v-col cols="12" sm="3" md="2">
          <v-btn
            color="#C6F513"
            size="large"
            style="margin-top: 60px; box-shadow: none"
            class="font-weight-bold text-black text-none"
            prepend-icon="mdi-plus"
            @click="addEmpresa"
          >
            Novo Empresa
          </v-btn>
        </v-col>
      </v-row>

        <!-- Cards de resumo -->
        <v-row>
          <v-col cols="12" md="7" style=" display: flex; flex-direction: row; gap: 30px;">
            <v-card style="width: 264px; height: 174px; background-color: #CDCDCD; border-radius: 10px; box-shadow: none; border: 1px solid #000000;">
              <v-card-title style="display: flex; justify-content: space-between;">Total de Empresas<v-icon>mdi-domain</v-icon></v-card-title>
              <v-card-text>
                <p style="margin-top: 60px;" size="34" class="text-h5">2,543</p>
                <p style="margin-top: 10px;">12% vs mês anterior</p>
              </v-card-text>
            </v-card>

            <v-card style="width: 264px; height: 174px; background-color: #CDCDCD; border-radius: 10px; box-shadow: none; border: 1px solid #000000;">
              <v-card-title style="display: flex; justify-content: space-between;">Ativas<v-icon>mdi-account-group</v-icon></v-card-title>
              <v-card-text>
                <p style="margin-top: 60px;" class="text-h5">18</p>
                <p style="margin-top: 10px; color: #FF0000">Requerem atenção</p>
              </v-card-text>
            </v-card>

            <v-card style="width: 264px; height: 174px; background-color: #CDCDCD; border-radius: 10px; box-shadow: none; border: 1px solid #000000;">
              <v-card-title style="display: flex; justify-content: space-between;">Planos Premium<v-icon>mdi-sprout</v-icon></v-card-title>
              <v-card-text>
                <p style="margin-top: 60px;" class="text-h5">94%</p>
                <p style="margin-top: 10px;">↑ 2% vs última semana</p>
              </v-card-text>
            </v-card>

            <v-card style="width: 264px; height: 174px; background-color: #CDCDCD; border-radius: 10px; box-shadow: none; border: 1px solid #000000;">
              <v-card-title style="display: flex; justify-content: space-between;">Suspensas<v-icon>mdi-domain-plus</v-icon></v-card-title>
              <v-card-text>
                <p style="margin-top: 60px;" class="text-h5">0</p>
                <p style="margin-top: 10px;">↑ 5% vs mês anterior</p>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

      <!-- Filtros de busca -->
      <v-col cols="12" style="margin-top: 40px; display: flex; flex-direction: row; gap: 20px; justify-content: space-between; background-color: #F6F6F6">
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
          <v-col cols="12" sm="4" md="3" lg="3">
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

      <!-- Tabela de Empresas -->
      <v-row class="mt-4" style="box-shadow: none; background-color: #F6F6F6">
        <v-col cols="12" style="box-shadow: none; background-color: #F6F6F6">
          <v-data-table
            :headers="headers"
            :items="filteredEmpresas"
            :search="search"
            :sort-by="[{ key: 'nome', order: 'asc' }]"
            class="elevation-0"
            style="box-shadow: none; background-color: #F6F6F6"
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
import router from '@/router'

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
      router.push('/admin/cadastro-empresa')
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
