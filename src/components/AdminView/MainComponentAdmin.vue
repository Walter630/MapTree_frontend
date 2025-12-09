<script lang="ts">
import { defineComponent } from 'vue';
import type { Manager } from '@/plugins/apiConnect.ts'

interface Company {
  name: string
  manager: Manager
  isActive: boolean
  createdAt?: Date
}
export default defineComponent({
  name: 'CompaniesListComponent',
  data() {
    return {
      search: '' as string,
      empresas: [] as Company[], // Lista vazia inicialmente
      managers: [] as Manager[],
      empresasFiltradas: [] as Company[],
      empresasRecentes: [] as Company[],
      loading: false as boolean,
      error: null as string | null,
    };
  },
  computed: {
    totalCompanies() {
      return this.empresas.length;
    },
    totalManagers() {
      return this.managers.length;
    },
  },
  methods: {
    async getCompanies() {
      this.loading = true;
      this.error = null;
      try {
        const response = await this.$api.get<Company[]>('/organizations');
        this.empresas = response.data.map(item => {
          return {
            name: item.name,
            createdAt: item.createdAt,
            manager: item.manager.name || 'Sem gestor',
            isActive: item.isActive,
          };
        });
        this.filterRecentCompanies();
        this.totalCompanies = this.empresas.length;
      } catch (e: Error) {
        console.error('Erro ao buscar empresas:', e.message);
        this.error = 'Falha ao carregar dados das empresas.';
      } finally {
        this.loading = false;
      }
    },
    async getManagers() {
      this.loading = true;
      this.error = null;
      try {
        const response = await this.$api.get<Manager[]>('/users');
        this.managers = response.data;
        this.totalManagers = this.managers.length;
      } catch (e: Error) {
        console.error('Erro ao buscar gestores:', e.message);
        this.error = 'Falha ao carregar dados dos gestores.';
      } finally {
        this.loading = false;
      }
    },
    clearSearch() {
      this.search = '';
    },
    filterCompanies() {
      this.empresasFiltradas = this.empresas.filter(empresa =>
        empresa.name.toLowerCase().includes(this.search.toLowerCase())
      );
    },
    filterRecentCompanies() {
      this.empresasRecentes = this.empresas.filter(empresa =>
        empresa.createdAt && empresa.createdAt >= new Date(new Date().setDate(new Date().getDate() - 7))
      );
    },

  },
  mounted() {
    // Chamar a API automaticamente ao carregar o componente
    this.getCompanies();
    this.getManagers();

  },
});
</script>
<template>
  <v-container style="margin-top: 40px;">
    <!-- Cabeçalho -->
    <v-row align="center" justify="space-between" class="mb-6">
      <v-col cols="12" md="7">
        <div class="d-flex align-center mb-6">
          <span class="text-caption text-grey-darken-1">Meu Painel</span>


        </div>
        <p class="title-text">Olá, Administrador!</p>
        <p class="subtitle-text">Aqui está o resumo de suas operações.</p>
      </v-col>

      <v-col cols="12" md="4" class="d-flex justify-end">
        <v-text-field
          v-model="search"
          placeholder="Buscar..."
          hide-details
          density="comfortable"
          variant="outlined"
          style="max-width: 350px;"
          prepend-inner-icon="mdi-magnify"
          clearable
          @click:append="clearSearch"
        />

      </v-col>
    </v-row>

    <!-- Cards de Resumo -->
    <v-row style="margin-top: 25px;" class="d-flex" justify="start">
      <v-col cols="12" md="3" >
        <v-card class="cardResumo">
          <div class="cardHeader">
            <span>Empresas</span>
            <v-icon>mdi-domain</v-icon>
          </div>
          <p class="cardNumero">{{ totalCompanies }}</p>
          <p class="cardInfo">+3 este mês</p>
        </v-card>
      </v-col>

      <v-col cols="12" md="3">
        <v-card class="cardResumo">
          <div class="cardHeader">
            <span>Gestores</span>
            <v-icon>mdi-account-group</v-icon>
          </div>
          <p class="cardNumero">{{ totalManagers }}</p>
          <p class="cardInfo">+7 este mês</p>
        </v-card>
      </v-col>

      <v-col cols="12" md="3">
        <v-card class="cardResumo">
          <div class="cardHeader">
            <span>Espécies</span>
            <v-icon>mdi-sprout</v-icon>
          </div>
          <p class="cardNumero">156</p>
          <p class="cardInfo">Catalogadas</p>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-10">
      <v-col cols="12" md="6">
        <v-card class="cardBox">
          <h4 class="titleBox">Distribuição de Planos</h4>
          <div v-if="loading" class="centerBox">
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
            <p class="ml-3">Carregando empresas...</p>
          </div>
          <div v-else-if="error" class="centerBox" style="color: #F44336;">
            <p>{{ error }}</p>
            <v-btn small color="error" @click="getCompanies">Tentar Novamente</v-btn>
          </div>
          <div v-else class="centerBox">
            <p style="color: #000000;">Nenhuma ação realizada.</p>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" md="6" >
        <v-card class="cardBox">
          <h4 class="titleBox">Empresas Cadastradas Recentemente</h4>

          <!-- Indicador de Carregamento -->
          <div v-if="loading" class="centerBox">
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
            <p class="ml-3">Carregando empresas...</p>
          </div>

          <!-- Mensagem de Erro -->
          <div v-else-if="error" class="centerBox" style="color: #F44336;">
            <p>{{ error }}</p>
            <v-btn small color="error" @click="getCompanies">Tentar Novamente</v-btn>
          </div>

          <!-- Lista Vazia -->
          <div v-else-if="empresas.length === 0" class="centerBox">
            Nenhuma empresa encontrada ou cadastrada recentemente.
          </div>

          <!-- Lista de Empresas -->
          <div v-else>
            <v-row class="headerTable">
              <v-col cols="4">Empresa</v-col>
              <v-col cols="4">Gestor</v-col>
              <v-col cols="4">Status</v-col>
            </v-row>

            <div
              v-for="(empresa, i) in empresas"
              :key="empresa.name"
              class="linhaEmpresa"
            >
              <v-row align="center" >
                <v-col cols="4">
                  <div>{{ empresa.name }}</div>
                  <div class="dataEmpresa">{{ empresa.createdAt }}</div>
                </v-col>

                <v-col cols="4">{{ empresa.manager }}</v-col>

                <v-col cols="4">
                  <span
                    class="badgeStatus"
                    :style="{ backgroundColor: empresa.isActive ? '#4CAF50' : '#F44336' }"
                  >
                    {{ empresa.isActive ? 'Ativo' : 'Inativo' }}
                  </span>
                </v-col>
              </v-row>

              <v-divider v-if="i < empresas.length - 1"></v-divider>
            </div>
          </div>
        </v-card>
      </v-col>

    </v-row>
  </v-container>
</template>

<style scoped>
.cardResumo {
  background: #F6F6F6;
  border: 1px solid #CDCDCD;
  height: 150px;
  border-radius: 8px;
  padding: 15px;
  box-shadow: none;
}

.cardHeader {
display: flex;
justify-content: space-between;
font-weight: 600;
}

.cardNumero {
font-size: 26px;
margin-top: 25px;
font-weight: bold;
}

.cardInfo {
margin-top: 5px;
font-size: 13px;
color: #777;
}

.cardBox {
  background: #F6F6F6;
  border: 1px solid #CDCDCD;
  border-radius: 8px;
  padding: 20px;
  min-height: 350px;
  box-shadow: none;
}

.titleBox {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 20px;
}

.centerBox {
display: flex;
align-items: center;
justify-content: center;
height: 220px;
color: #555;
}

.headerTable {
font-weight: bold;
padding-bottom: 5px;
color: #444;
}

.dataEmpresa {
font-size: 12px;
color: #999;
}

.badgeStatus {
padding: 5px 14px;
border-radius: 12px;
font-size: 13px;
display: inline-block;
}
.linhaEmpresa {
  padding: 15px 0 3px 6px;
}
</style>
