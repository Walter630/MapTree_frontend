<script lang="ts">
import { defineComponent } from 'vue';

// Definindo um tipo TypeScript para os dados que vêm da API
// Adapte esta interface para corresponder exatamente à estrutura JSON que o seu backend retorna.
interface EmpresaAPI {
  id: number;
  name: string; // Ou 'nome', dependendo da API
  managerName: string; // Ou 'gestor'
  status: 'active' | 'pending' | 'inactive'; // Assumindo status em inglês
  createdAt: string; // Data de criação
}

// Interface para o objeto transformado que o template usa (mantendo a estrutura original do template)
interface EmpresaDisplay {
  nome: string;
  data: string;
  gestor: string;
  status: string;
  cor: string;
}

export default defineComponent({
  name: 'CompaniesListComponent',
  data() {
    return {
      search: '' as string,
      empresas: [] as EmpresaDisplay[], // Lista vazia inicialmente
      loading: false as boolean,
      error: null as string | null,
    };
  },
  methods: {
    formatStatus(status: EmpresaAPI['status']): { label: string, color: string } {
      switch (status) {
        case 'active':
          return { label: 'Ativo', color: '#4CAF50' };
        case 'pending':
          return { label: 'Pendente', color: '#FFEB3B' };
        case 'inactive':
          return { label: 'Inativo', color: '#F44336' };
        default:
          return { label: 'Desconhecido', color: '#9E9E9E' };
      }
    },
    async getCompanies() {
      this.loading = true;
      this.error = null;
      try {
        // ASSUMIMOS que this.$api está disponível globalmente via um plugin Vue/Nuxt
        const response = await this.$api.get<EmpresaAPI[]>('/organizations');

        // Mapeamos os dados da API para o formato que o template espera
        this.empresas = response.data.map(item => {
          const statusInfo = this.formatStatus(item.status);
          return {
            nome: item.name,
            data: new Date(item.createdAt).toLocaleDateString('pt-BR'),
            gestor: item.managerName,
            status: statusInfo.label,
            cor: statusInfo.color,
          };
        });

      } catch (e: any) {
        console.error('Erro ao buscar empresas:', e.message);
        this.error = 'Falha ao carregar dados das empresas.';
      } finally {
        this.loading = false;
      }
    },
    clearSearch() {
      this.search = '';
    },
  },
  mounted() {
    // Chamar a API automaticamente ao carregar o componente
    this.getCompanies();
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
    <v-row style="margin-top: 25px;" class="d-flex" justify="start" no-gutters>
      <v-col cols="12" md="3" class="mr-4">
        <v-card class="cardResumo">
          <div class="cardHeader">
            <span>Empresas</span>
            <v-icon>mdi-domain</v-icon>
          </div>
          <p class="cardNumero">90</p>
          <p class="cardInfo">+3 este mês</p>
        </v-card>
      </v-col>

      <v-col cols="12" md="3" class="mr-4">
        <v-card class="cardResumo">
          <div class="cardHeader">
            <span>Gestores</span>
            <v-icon>mdi-account-group</v-icon>
          </div>
          <p class="cardNumero">240</p>
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

    <v-row>
      <v-col cols="12" md="6" offset-md="3">
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
              :key="empresa.nome"
              class="linhaEmpresa"
            >
              <v-row align="center">
                <v-col cols="4">
                  <div>{{ empresa.nome }}</div>
                  <div class="dataEmpresa">{{ empresa.data }}</div>
                </v-col>

                <v-col cols="4">{{ empresa.gestor }}</v-col>

                <v-col cols="4">
                  <span
                    class="badgeStatus"
                    :style="{ backgroundColor: empresa.cor }"
                  >
                    {{ empresa.status }}
                  </span>
                </v-col>
              </v-row>

              <v-divider v-if="i < empresas.length - 1"></v-divider>
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="6" md="6">
        <v-card>

        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.cardResumo {
  background: #f4f4f4;
  border: 1px solid #E5E5E5;
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
background: #f4f4f4;
border: 1px solid #E5E5E5;
border-radius: 8px;
padding: 20px;
min-height: 350px;
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
padding: 15px 0 2px;
}
</style>
