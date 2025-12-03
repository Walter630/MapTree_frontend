<template>
  <v-container class="pa-6 empresas-container">
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center mb-6">
          <span class="text-caption text-grey-darken-1" @click="$router.push('/admin')">Meu Painel</span>
          <v-icon small class="mx-1 text-grey-darken-1">mdi-chevron-right</v-icon>
          <span class="text-caption font-weight-bold" style="color: #2f3367">#Empresas</span>
        </div>

        <div class="d-flex align-center">
          <v-btn icon depressed class="mr-3 back-btn" @click="goBack">
            <v-icon>mdi-chevron-left</v-icon>
          </v-btn>
          <div>
            <p class="title-text">Empresas</p>
            <p class="subtitle-text">Gerencie empresas cadastradas no sistema</p>
          </div>
        </div>
      </v-col>
    </v-row>

    <v-row class="mt-3">
      <v-col cols="12">
        <v-btn
          color="#C6F513"
          size="large"
          class="font-weight-bold text-black text-none new-empresa-btn"
          prepend-icon="mdi-plus"
          @click="addEmpresa"
        >
          Novo Empresa
        </v-btn>
      </v-col>
    </v-row>


    <!-- Quick cards (com "ocr" ícone no canto direito) -->
    <v-row class="cards-row" align="stretch" justify="start" elevation="0">
      <v-col cols="12" sm="6" md="3">
        <v-card class="summary-card">
          <div class="card-head">
            <div class="summary-head">
              <span>Total de Empresas</span>
            </div>
            <v-icon class="corner-icon" small>mdi-domain</v-icon>
          </div>

          <div class="summary-value">{{ totalEmpresas }}</div> <div class="summary-note">+ 12% vs mês anterior</div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="summary-card">
          <div class="card-head">
            <div class="summary-head">
              <span>Pendentes</span>
            </div>
            <v-icon class="corner-icon" small>mdi-alert-circle-outline</v-icon>
          </div>

          <div class="summary-value">18</div>
          <div class="summary-note text-danger">Requerem atenção</div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="summary-card">
          <div class="card-head">
            <div class="summary-head">
              <span>Taxa de Conclusão</span>
            </div>
            <v-icon class="corner-icon" small>mdi-chart-donut</v-icon>
          </div>

          <div class="summary-value">94%</div>
          <div class="summary-note text-success">▲ 2% vs última semana</div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="summary-card">
          <div class="card-head">
            <div class="summary-head">
              <span>Taxa de Conclusão</span>
            </div>
            <v-icon class="corner-icon" small>mdi-chart-donut</v-icon>
          </div>

          <div class="summary-value">94%</div>
          <div class="summary-note text-success">▲ 2% vs última semana</div>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-10">
      <v-col cols="12" class="filters-box pa-4">
        <div class="d-flex align-center mb-4">
          <v-icon class="mr-2 filter-icon">mdi-filter-variant</v-icon>
          <p class="filter-text">Filtros</p>
        </div>
        <v-row
          align="center"
          no-gutters
          style="display: flex; align-items: center; justify-content: space-between"
        >
          <v-col cols="12" sm="4" md="2" class="pr-4">
            <p class="mb-2">Empresa</p>
            <v-select
              v-model="filterEmpresa"
              :items="contas"
              label="Empresa"
              placeholder="Nome da Empresa"
              variant="outlined"
              density="compact"
              hide-details
              class="filter-field"
            />
          </v-col>

          <v-col cols="12" sm="4" md="2" class="pr-4">
            <p class="mb-2">Nome</p>
            <v-text-field
              v-model="search"
              label="Nome"
              placeholder="Nome do Representante"
              variant="outlined"
              density="compact"
              hide-details
              clearable
              class="filter-field"
            />
          </v-col>

          <v-col cols="12" sm="4" md="2" class="pr-4">
            <p class="mb-2">Cidade</p>
            <v-select
              v-model="filterCidade"
              :items="cidades"
              label="Cidade"
              placeholder="Selecione a Cidade"
              variant="outlined"
              density="compact"
              hide-details
              class="filter-field"
            />
          </v-col>
          <v-col cols="auto">
            <v-btn color="black" class="text-white buscar-btn" height="40" @click="applyFilters">
              BUSCAR
            </v-btn>
          </v-col>
        </v-row>
      </v-col>
    </v-row>

    <v-row class="mt-8" style="background-color: #F6F6F6">
      <v-col cols="12" class="pa-0">
        <p class="table-title-text mb-4">Empresas Cadastradas</p>

        <v-data-table
          :headers="headers"
          :items="empresas"
          :search="search"
          class="elevation-0 data-table-custom"
          hide-default-footer
        >
          <!-- slot genérico da linha: aqui você monta todas as células -->
          <template #item="{ item }">
            <!-- células para cada coluna (substitua classes/estrutura conforme seu table) -->
            <tr>
              <td class="table-id">{{ item.name }}</td>
              <td class="table-text">{{ item.taxId }}</td>
              <td class="table-text">{{ item.manager.name }}</td>
              <td>
                <v-chip color="green" class="font-weight-bold status-chip">
                  {{ item.isActive }}
                </v-chip>
              </td>
              <!-- coluna de ações (sem usar item.acoes) -->
              <td>
                <v-icon size="small" class="mr-2 action-icon" @click="openDialogUpdate(item)">
                  mdi-square-edit-outline
                </v-icon>
                <v-icon size="small" class="action-icon" @click="openDialogDelete(item)">
                  mdi-trash-can-outline
                </v-icon>
              </td>
            </tr>
          </template>
        </v-data-table>
      </v-col>
    </v-row>
  </v-container>

  <v-dialog v-model="dialogDelete.active" max-width="500px">
    <v-card width="500px">
      <v-card-title class="text-h6">
        Confirmação de Exclusão
        <v-btn
          style="position: absolute; top: 0; right: 0;"
          icon="mdi-close"
          variant="text"
          @click="closeDialogDelete"
          color="red"
          :disabled="dialogDelete.loading"
        />
      </v-card-title>
      <v-card-text>
        <p>Tem certeza de que deseja excluir esta empresa?</p>
        <ul class="ml-5">
          <li style="font-weight: bold">{{ dialogDelete?.item?.name }}</li>
          <li>{{ dialogDelete?.item?.taxId }}</li>
        </ul>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn text @click="closeDialogDelete" :disabled="dialogDelete.loading">Cancelar</v-btn>
        <v-btn color="red" :loading="dialogDelete.loading" :disabled="dialogDelete.loading" text @click="deleteItem">Excluir</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <v-dialog v-model="dialogUpdate.active" max-width="500px">
    <v-card width="500px">
      <v-card-title class="text-h6">
        Edição de Empresa
        <v-btn
          style="position: absolute; top: 0; right: 0;"
          icon="mdi-close"
          variant="text"
          @click="closeDialogUpdate"
          color="red"
          :disabled="dialogUpdate.loading"
        />
      </v-card-title>
      <v-card-text>
        <p>Tem certeza de que deseja editar esta empresa?</p>
        <ul class="ml-5">
          <li>{{ dialogUpdate?.item?.name }}</li>
          <li>{{ dialogUpdate?.item?.taxId }}</li>
        </ul>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn text @click="closeDialogUpdate" :disabled="dialogUpdate.loading">Cancelar</v-btn>
        <v-btn color="red" :loading="dialogUpdate.loading" :disabled="dialogUpdate.loading" text @click="editItem">Editar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { Company } from '@/plugins/apiConnect.ts'
import type { Manager } from '@/plugins/apiConnect.ts'

interface Company {
  id: string;
  name: string;
  taxId: string;
  isOutsourced: boolean     //se é terceirizada
  managerId?: string;
  manager: Manager;
  isActive: boolean;
}

export default defineComponent({
  name: 'EmpresasAdminView',

  data() {
    return {
      empresas: [] as Company[],
      filterEmpresa: null,
      filterCidade: null,
      search: '',
      contas: ['EcoEnergia Sul', 'Verde Luz Nordeste', 'PowerTree Centro'],
      cidades: ['Rio de Janeiro', 'São Paulo', 'Fortaleza'],
      page: 1,
      itemsPerPage: 10,

      // Headers ajustados para a imagem
      headers: [
        { title: 'Nome', key: 'name', sortable: true },
        { title: 'CNPJ', key: 'taxId', sortable: true },
        { title: 'Gestor', key: 'managerId', sortable: true },
        { title: 'Status', key: 'isActive', sortable: true },
        { title: 'Ações', key: 'acoes', sortable: false, align: 'end' },
      ],
      // backup para filtros
      allCompanies: [] as Company[],
      // Dados da Tabela simulando os estados da imagem

      // dialog delete
      dialogDelete: {
        active: false,
        item: null as Company | null,
        loading: false,
      },

      dialogUpdate: {
        active: false,
        item: null as Company | null,
        loading: false
      }
    }
  },
  computed: {
    pageCount() {
      return Math.ceil(this.empresas.length / this.itemsPerPage)
    },
    totalEmpresas() {
      return this.empresas.length
    }
  },
  mounted() {
    this.getCompanies()
  },


  methods: {
    // Função auxiliar para retornar a cor do v-chip com base no Status
    async getCompanies(): Promise<void> {
      try {
        const res = await this.$api.get<Company[]>('/organizations')
        this.allCompanies = res.data.map(company => ({
          id: company.id,
          name: company.name,
          taxId: company.taxId,
          isOutsourced: company.isOutsourced,
          manager: company.manager,
          managerId: company.managerId,
          isActive: company.isActive, // Transforma Boolean em String visual
        }))
        this.totalEmpresas = this.allCompanies.length

        this.empresas = [...this.allCompanies]
      } catch (error) {
        console.error('Failed to fetch companies:', error)

      }
    },

    goBack() {
      this.$router.push('/admin')
    },
    addEmpresa() {
      this.$router.push('/admin/register-company')
    },
    applyFilters() {
      console.log('Filtros aplicados:', this.filterEmpresa, this.search, this.filterCidade)
    },
    async editItem() {
      try {
        this.dialogUpdate.loading = true;
        await this.$api.patch(`/organizations/${this.dialogUpdate?.item?.id}`, {
          name: this.dialogUpdate?.item?.name,
          taxId: this.dialogUpdate?.item?.taxId,
          isOutsourced: this.dialogUpdate?.item?.isOutsourced,
          manager: this.dialogUpdate?.item?.manager,
          managerId: this.dialogUpdate?.item?.managerId,
          isActive: this.dialogUpdate?.item?.isActive,
        });
      } catch (error) {
        console.error('Erro ao buscar empresa:', error);
      } finally {
        await this.getCompanies();
        this.dialogUpdate.loading = false;
        this.dialogUpdate.active = false;
        this.dialogUpdate.item = null;
      }
    },
    async deleteItem() {
      try {
        this.dialogDelete.loading = true;
        await this.$api.delete(`/organizations/${this.dialogDelete?.item?.id}`);
      } catch (e) {
        console.error('Erro ao deletar empresa:', e);
      } finally {
        await this.getCompanies();
        this.dialogDelete.loading = false;
        this.dialogDelete.active = false;
        this.dialogDelete.item = null;
      }
    },
    openDialogDelete(item: Company) {
      this.dialogDelete.active = true
      this.dialogDelete.item = item
    },
    closeDialogDelete() {
      this.dialogDelete.active = false;
      this.dialogDelete.item = null;
      this.dialogDelete.loading = false;
    },
    closeDialogUpdate() {
      this.dialogUpdate.active = false;
      this.dialogUpdate.item = null;
      this.dialogUpdate.loading = false;
    },
    openDialogUpdate(item: Company) {
      this.dialogUpdate.active = true
      this.dialogUpdate.item = item
    },
  },
})
</script>

<style scoped>

.empresas-container {
  margin-top: 20px;
  padding: 24px;
}

/* Título + voltar */
.back-btn {
  height: 40px !important;
  width: 40px !important;
  border-radius: 8px;
}

/* Título principal compacto */
.title-text {
  font-size: 22px;
  margin-bottom: 2px;
}

/* Subtítulo reduzido */
.subtitle-text {
  font-size: 14px;
  color: #667085;
}

/* Botão Novo Empresa — estilo Gestores */
.new-empresa-btn {
  height: 42px !important;
  background: #c6f513 !important;
  border-radius: 8px;
  margin-top: -10px !important;
  margin-bottom: 10px !important;
}

/* ---- CARDS RESUMO ---- */

.summary-card {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 16px;
  min-height: 120px;
  display: flex;
  background-color: #F6F6F6;
  flex-direction: column;
  justify-content: flex-start;
  position: relative;
  box-shadow: none;
}

.summary-value {
  margin-top: 22px;
  font-size: 28px;
  font-weight: 700;
}
.summary-note {
  margin-top: 6px;
  color: #6b7280;
  font-size: 13px;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: start;
}

/* ---- FILTROS ---- */

.filters-box {
  border-radius: 8px;
  padding: 18px !important;
  margin-top: 20px !important;
  background: #f9fafb !important;
}

.filter-field {
  margin-bottom: 10px !important;
}

.buscar-btn {
  height: 38px !important;
  border-radius: 8px;
  padding: 0 13px !important;
}

/* ---- TABELA ---- */

.table-title-text {
  font-size: 15px;
  margin-bottom: 8px !important;
}

.data-table-custom {
  border-radius: 8px;
  overflow: hidden;
  background-color: #F6F6F6;
}

.table-text,
.table-id {
  font-size: 13px !important;
}

.action-icon {
  opacity: 0.7;
  transition: 0.2s;
}
.action-icon:hover {
  opacity: 1;
}

/* STATUS */
.status-chip {
  font-size: 11px !important;
  height: 22px !important;
}

.cards-row {
  margin-top: 8px;
  box-shadow: none;

}

</style>
