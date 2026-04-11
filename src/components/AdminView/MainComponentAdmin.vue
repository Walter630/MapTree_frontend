<script lang="ts">
import { defineComponent } from 'vue';
import type { Manager, Company as ApiCompany } from '@/plugins/apiConnect.ts'

interface CompanyDisplay {
  name: string
  manager: string
  isActive: boolean
  createdAt?: Date
}
export default defineComponent({
  name: 'CompaniesListComponent',
  data() {
    return {
      search: '' as string,
      empresas: [] as CompanyDisplay[],
      managers: [] as Manager[],
      empresasFiltradas: [] as CompanyDisplay[],
      empresasRecentes: [] as CompanyDisplay[],
      loading: false as boolean,
      error: null as string | null,

      // Importação IA
      importLoading: false,
      importSuccess: false,
      importError: '',
      importResult: '',

      // Snackbar
      snackbar: false,
      snackbarText: '',
      snackbarColor: 'success',
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
        const response = await this.$api.get<ApiCompany[]>('/organizations');
        this.empresas = response.data.map(item => {
          return {
            name: item.name,
            createdAt: item.createdAt,
            manager: item.manager?.name || 'Sem gestor',
            isActive: item.isActive,
          };
        });
        this.filterRecentCompanies();
        this.totalCompanies = this.empresas.length;
      } catch (e: unknown) {
        console.error('Erro ao buscar empresas:', e);
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
      } catch (e: unknown) {
        console.error('Erro ao buscar gestores:', e);
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

    /* ---------- Importação de Dados da IA ---------- */

    async importExternalData() {
      this.importLoading = true;
      this.importError = '';
      this.importResult = '';
      this.importSuccess = false;

      try {
        const response = await this.$api.post<{ message?: string }>('/trees/import-external');
        this.importSuccess = true;
        this.importResult = `Importação concluída com sucesso! ${JSON.stringify(response.data?.message || response.data || '')}`;
        this.notify('Dados da IA importados com sucesso!', 'success');

        // Reset do estado de sucesso após 5 segundos
        setTimeout(() => {
          this.importSuccess = false;
        }, 5000);
      } catch (e: unknown) {
        console.error('Erro ao importar dados externos:', e);
        const err = e as { response?: { data?: { message?: string } } };
        this.importError = err.response?.data?.message || 'Falha ao importar dados. Verifique se o arquivo JSON existe no servidor.';
        this.notify(this.importError, 'error');
      } finally {
        this.importLoading = false;
      }
    },

    notify(text: string, color = 'success') {
      this.snackbarText = text;
      this.snackbarColor = color;
      this.snackbar = true;
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
  <v-container class="pa-6">
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
        <v-card class="card-resumo ">
          <div class="card-header">
            <span>Empresas</span>
            <v-icon>mdi-domain</v-icon>
          </div>
          <p class="card-numero">{{ totalCompanies }}</p>
          <p class="card-info">+3 este mês</p>
        </v-card>
      </v-col>

      <v-col cols="12" md="3">
        <v-card class="card-resumo">
          <div class="card-header">
            <span>Gestores</span>
            <v-icon>mdi-account-group</v-icon>
          </div>
          <p class="card-numero">{{ totalManagers }}</p>
          <p class="card-info">+7 este mês</p>
        </v-card>
      </v-col>

      <v-col cols="12" md="3">
        <v-card class="card-resumo">
          <div class="card-header">
            <span>Espécies</span>
            <v-icon>mdi-sprout</v-icon>
          </div>
          <p class="card-numero">156</p>
          <p class="card-info">Catalogadas</p>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-10">
      <v-col cols="12" md="6">
        <v-card class="card-box">
          <h4 class="title-box">Distribuição de Planos</h4>
          <div v-if="loading" class="center-box">
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
            <p class="ml-3">Carregando empresas...</p>
          </div>
          <div v-else-if="error" class="center-box" style="color: #F44336;">
            <p>{{ error }}</p>
            <v-btn small color="error" @click="getCompanies">Tentar Novamente</v-btn>
          </div>
          <div v-else class="center-box">
            <p style="color: #000000;">Nenhuma ação realizada.</p>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" md="6" >
        <v-card class="card-box">
          <h4 class="title-box">Empresas Cadastradas Recentemente</h4>

          <!-- Indicador de Carregamento -->
          <div v-if="loading" class="center-box">
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
            <p class="ml-3">Carregando empresas...</p>
          </div>

          <!-- Mensagem de Erro -->
          <div v-else-if="error" class="center-box" style="color: #F44336;">
            <p>{{ error }}</p>
            <v-btn small color="error" @click="getCompanies">Tentar Novamente</v-btn>
          </div>

          <!-- Lista Vazia -->
          <div v-else-if="empresas.length === 0" class="center-box">
            Nenhuma empresa encontrada ou cadastrada recentemente.
          </div>

          <!-- Lista de Empresas -->
          <div v-else>
            <v-row class="header-table">
              <v-col cols="4">Empresa</v-col>
              <v-col cols="4">Gestor</v-col>
              <v-col cols="4">Status</v-col>
            </v-row>

            <div
              v-for="(empresa, i) in empresas"
              :key="empresa.name"
              class="linha-empresa"
            >
              <v-row align="center" >
                <v-col cols="4">
                  <div>{{ empresa.name }}</div>
                  <div class="data-empresa">{{ empresa.createdAt }}</div>
                </v-col>

                <v-col cols="4">{{ empresa.manager }}</v-col>

                <v-col cols="4">
                  <span
                    class="badge-status"
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

    <!-- ===== Seção: Manutenção & IA ===== -->
    <v-row class="mt-10">
      <v-col cols="12">
        <div class="d-flex align-center mb-4">
          <v-icon class="mr-2" color="deep-purple">mdi-cog-outline</v-icon>
          <span class="text-h6 font-weight-bold">Manutenção & IA</span>
        </div>
      </v-col>

      <v-col cols="12" md="4">
        <v-card class="import-card" elevation="0">
          <div class="import-card-header">
            <div class="import-icon-wrapper">
              <v-icon size="28" color="white">mdi-brain</v-icon>
            </div>
            <div>
              <p class="import-title">Importar Dados da IA</p>
              <p class="import-subtitle">
                Sincronize os dados de predição gerados pelo modelo de IA
              </p>
            </div>
          </div>

          <v-divider class="my-3" />

          <v-btn
            block
            size="large"
            :color="importSuccess ? 'green' : 'deep-purple'"
            variant="flat"
            :loading="importLoading"
            :disabled="importLoading"
            :prepend-icon="importSuccess ? 'mdi-check-circle' : 'mdi-cloud-upload'"
            class="import-btn"
            @click="importExternalData"
          >
            {{ importSuccess ? 'Importado!' : 'Importar JSON IA' }}
          </v-btn>

          <v-alert v-if="importError" type="error" variant="tonal" density="compact" closable class="mt-3">
            {{ importError }}
          </v-alert>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card class="import-card" elevation="0" style="border-color: #2196F3;">
          <div class="import-card-header">
            <div class="import-icon-wrapper" style="background: linear-gradient(135deg, #2196F3, #1976D2);">
              <v-icon size="28" color="white">mdi-map-search</v-icon>
            </div>
            <div>
              <p class="import-title">Visualizar no Mapa</p>
              <p class="import-subtitle">Acesse o mapa para ver as predições em tempo real</p>
            </div>
          </div>
          <v-divider class="my-3" />
          <v-btn 
            block 
            size="large"
            color="blue-darken-2" 
            variant="flat"
            prepend-icon="mdi-map"
            to="/admin/map" 
            class="import-btn"
          >
            Abrir Mapa de Riscos
          </v-btn>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card class="import-card import-card--info" elevation="0">
          <div class="import-card-header">
            <div class="import-icon-wrapper" style="background: linear-gradient(135deg, #FF8F00, #FFB300);">
              <v-icon size="28" color="white">mdi-information-outline</v-icon>
            </div>
            <div>
              <p class="import-title">Como funciona?</p>
              <p class="import-subtitle">Fluxo de importação dos dados</p>
            </div>
          </div>

          <v-divider class="my-3" />

          <div class="info-steps">
            <div class="info-step">
              <div class="step-number">1</div>
              <span>Admin importa o JSON externo</span>
            </div>
            <div class="info-step">
              <div class="step-number">2</div>
              <span>Admin e Gestores analisam riscos no mapa</span>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Snackbar global -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000" location="bottom right">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<style scoped>
.card-resumo {
  background: #F6F6F6;
  border: 1px solid #CDCDCD;
  height: 150px;
  border-radius: 8px;
  padding: 15px;
  box-shadow: none;
}

.card-header {
  display: flex;
  justify-content: space-between;
  font-weight: 600;
}

.card-numero {
  font-size: 26px;
  margin-top: 25px;
  font-weight: bold;
}

.card-info {
  margin-top: 5px;
  font-size: 13px;
  color: #777;
}

.card-box {
  background: #F6F6F6;
  border: 1px solid #CDCDCD;
  border-radius: 8px;
  padding: 20px;
  min-height: 350px;
  box-shadow: none;
}

.title-box {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 20px;
}

.center-box {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 220px;
  color: #555;
}

.header-table {
  font-weight: bold;
  padding-bottom: 5px;
  color: #444;
}

.data-empresa {
  font-size: 12px;
  color: #999;
}

.badge-status {
  padding: 5px 14px;
  border-radius: 12px;
  font-size: 13px;
  display: inline-block;
}

.linha-empresa {
  padding: 15px 0 3px 6px;
}

/* ===== Seção de Importação IA ===== */
.import-card {
  background: #F6F6F6;
  border: 1px solid #CDCDCD;
  border-radius: 12px;
  padding: 24px;
  height: 100%;
  transition: all 0.2s ease;
}

.import-card:hover {
  border-color: #B0BEC5;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

.import-card-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.import-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: linear-gradient(135deg, #7B1FA2, #AB47BC);
}

.import-title {
  font-size: 16px;
  font-weight: 700;
  color: #333;
  margin-bottom: 4px;
}

.import-subtitle {
  font-size: 13px;
  color: #777;
  line-height: 1.4;
}

.import-btn {
  font-weight: 700;
  letter-spacing: 0.5px;
  border-radius: 10px;
  text-transform: none;
  font-size: 14px;
}

.info-steps {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.info-step {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: #555;
  line-height: 1.4;
}

.step-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FF8F00, #FFB300);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
  flex-shrink: 0;
}
</style>
