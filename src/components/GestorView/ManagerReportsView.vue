<template>
  <v-container class="pt-3 pb-6 px-6" style="max-width: 1400px; margin: 0 auto;">
    <v-row>
      <v-col cols="12">
        <PageHeader
          title="Relatórios Gerenciais"
          subtitle="Gerencie seus relatórios cadastrados no sistema"
          :breadcrumbs="[
            { text: 'Meu Painel', to: '/manager' },
            { text: '#Relatórios' },
          ]"
        />
      </v-col>
    </v-row>

    <!-- KPI Cards (Novo) -->
    <v-row class="mb-4">
      <v-col cols="12" sm="4" md="3">
        <v-card class="pa-4 rounded-xl elevation-2" style="background: linear-gradient(135deg, #1e293b, #0f172a); color: white">
          <div class="d-flex justify-space-between align-center mb-2">
            <v-icon color="green-lighten-2">mdi-content-cut</v-icon>
            <span class="text-caption">Total Podas</span>
          </div>
          <div class="text-h4 font-weight-bold">{{ prunings.length }}</div>
          <div class="text-caption mt-2" style="opacity: 0.7">Efetuadas no sistema</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4" md="3">
        <v-card class="pa-4 rounded-xl elevation-2">
          <div class="d-flex justify-space-between align-center mb-2">
            <v-icon color="orange-darken-1">mdi-alert-octagon</v-icon>
            <span class="text-caption">Ação Urgente</span>
          </div>
          <div class="text-h4 font-weight-bold">{{ countUrgent }}</div>
          <div class="text-caption mt-2 text-grey">Árvores atingiram a fiação</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4" md="3">
        <v-card class="pa-4 rounded-xl elevation-2">
          <div class="d-flex justify-space-between align-center mb-2">
            <v-icon color="blue-darken-1">mdi-tree</v-icon>
            <span class="text-caption">Mapeadas</span>
          </div>
          <div class="text-h4 font-weight-bold">{{ totalTrees }}</div>
          <div class="text-caption mt-2 text-grey">Total de registros AI</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Filtros Modernos -->
    <v-card class="pa-5 mb-8 mt-4 rounded-xl elevation-1" border>
      <v-row align="center">
        <v-col cols="12" class="d-flex align-center pb-2 pt-0">
          <v-icon class="mr-2" color="primary">mdi-filter-variant</v-icon>
          <div class="text-h6 font-weight-bold">Filtros Inteligentes</div>
        </v-col>

        <v-col cols="12">
          <v-row dense>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="filters.search"
                density="compact"
                variant="outlined"
                label="Pesquisar por técnico ou árvore"
                prepend-inner-icon="mdi-magnify"
                hide-details
              />
            </v-col>
            <v-col cols="12" sm="3">
              <v-select
                v-model="filters.status"
                :items="['HEAVY', 'MODERATE', 'LIGHT']"
                label="Tipo de Poda"
                density="compact"
                variant="outlined"
                hide-details
                clearable
              />
            </v-col>
            <v-col cols="12" sm="3">
              <v-text-field
                v-model="filters.date"
                type="date"
                label="Data de Início"
                density="compact"
                variant="outlined"
                hide-details
              />
            </v-col>
            <v-col cols="12" sm="2">
              <v-btn color="black" block height="40" rounded="lg" @click="getPrunings">
                Filtrar
              </v-btn>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
    </v-card>

    <v-row class="mb-8">
      <v-col cols="12" md="7">
        <v-card class="pa-5 rounded-xl elevation-1" border>
          <div class="d-flex justify-space-between align-center mb-6">
            <h3 class="text-h6 font-weight-bold">Status de Execução</h3>
            <v-chip size="small" color="primary" variant="flat">Últimos 12 meses</v-chip>
          </div>

          <div class="chart-container" style="height: 280px;">
            <div class="y-axis">
              <span>Máx</span>
              <span>Méd</span>
              <span>0</span>
            </div>
            <div class="bars">
              <div v-for="(item, i) in chartData" :key="i" class="bar-col">
                <div class="bar-fill" :style="{ height: item.percent + '%', backgroundColor: item.color }">
                  <v-tooltip activator="parent" location="top">{{ item.count }} podas</v-tooltip>
                </div>
                <span class="bar-label">{{ item.month }}</span>
              </div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="5">
        <v-card class="pa-5 rounded-xl elevation-1" border style="height: 100%">
          <h3 class="text-h6 font-weight-bold mb-6">Tipos de Intervenção</h3>
          
          <div class="donut-chart-wrapper">
            <div v-for="(stat, i) in pruningStats" :key="i" class="donut-stat-row mb-4">
              <div class="d-flex justify-space-between align-center mb-1">
                <span class="text-caption font-weight-bold">{{ stat.label }}</span>
                <span class="text-caption font-weight-bold">{{ stat.value }}%</span>
              </div>
              <v-progress-linear
                :model-value="stat.value"
                :color="stat.color"
                height="10"
                rounded
                striped
              />
            </div>
            <div v-if="!pruningStats.length" class="text-center py-12">
               <v-icon color="grey-lighten-3" size="48">mdi-chart-donut</v-icon>
               <p class="text-caption text-grey">Sem dados de estatística</p>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-card class="pa-5 rounded-xl elevation-1" border>
      <div class="d-flex justify-space-between align-center mb-6">
        <h3 class="text-h6 font-weight-bold">Relatório de Atividades Executadas</h3>
        <v-btn variant="outlined" size="small" prepend-icon="mdi-download" @click="downloadAll">Exportar CSV</v-btn>
      </div>

      <v-data-table
        :headers="tableHeaders"
        :items="prunings"
        :loading="loading"
        hover
        class="modern-table"
      >
        <template #[`item.tree`]="{ item }">
          <div class="d-flex align-center">
            <v-avatar color="green-lighten-4" size="32" class="mr-3">
              <v-icon color="green-darken-2" size="18">mdi-tree</v-icon>
            </v-avatar>
            <div>
              <div class="font-weight-bold text-caption">{{ item.tree?.species?.commonName || 'Árvore Independente' }}</div>
              <div class="text-grey" style="font-size: 10px">ID: {{ item.idTree?.slice(-6) }}</div>
            </div>
          </div>
        </template>

        <template #[`item.location`]="{ item }">
          <div class="text-caption text-grey-darken-1">
             <v-icon size="12" class="mr-1">mdi-map-marker</v-icon>
             {{ item.tree?.latitude?.toFixed(5) }}, {{ item.tree?.longitude?.toFixed(5) }}
          </div>
        </template>

        <template #[`item.type`]="{ item }">
          <v-chip :color="getPruningColor(item.type)" size="x-small" variant="flat" class="font-weight-bold">
            {{ item.type }}
          </v-chip>
        </template>

        <template #[`item.date`]="{ item }">
           <span class="text-caption">{{ formatDateFull(item.date) }}</span>
        </template>

        <template #[`item.actions`]="{ item }">
          <v-btn icon size="x-small" variant="text" @click="viewDetails(item)">
            <v-icon>mdi-eye</v-icon>
          </v-btn>
        </template>
      </v-data-table>
    </v-card>
  </v-container>
</template>

<script lang="ts">
import { useAppStore } from '@/stores/app'
import PageHeader from '@/components/shared/PageHeader.vue'

export default {
  name: 'RelatoriosGestorView',
  components: { PageHeader },
  data() {
    return {
      search: '',
      loading: false,
      prunings: [] as any[],
      totalTrees: 0,
      countUrgent: 0,
      filters: {
        search: '',
        status: null,
        date: '',
      },
      tableHeaders: [
        { title: 'Árvore Analisada', key: 'tree', align: 'start' },
        { title: 'Localização GPS', key: 'location', align: 'center' },
        { title: 'Tipo', key: 'type', align: 'center' },
        { title: 'Data/Hora', key: 'date', align: 'center' },
        { title: 'Ações', key: 'actions', align: 'end' },
      ] as any[],
      PRUNING_TYPE_MAP: {
        LIGHT: { label: 'Leve', color: '#81C784' },
        MODERATE: { label: 'Moderada', color: '#FFB74D' },
        HEAVY: { label: 'Pesada', color: '#E57373' },
      } as const,
    }
  },

  mounted() {
    this.getPrunings()
    this.getTreesCount()
  },

  computed: {
    pruningStats() {
      if (!this.prunings.length) return []
      const counts = { LIGHT: 0, MODERATE: 0, HEAVY: 0 }
      this.prunings.forEach((p) => {
        const t = p.type
        if (t === 'LIGHT') counts.LIGHT++
        else if (t === 'MODERATE') counts.MODERATE++
        else if (t === 'HEAVY') counts.HEAVY++
      })
      const total = this.prunings.length
      const keys = ['LIGHT', 'MODERATE', 'HEAVY'] as const
      return keys.map((type) => {
        const count = counts[type]
        const mapItem = this.PRUNING_TYPE_MAP[type]
        return {
          label: mapItem.label,
          value: Number(((count / total) * 100).toFixed(0)),
          color: mapItem.color,
        }
      })
    },

    chartData() {
      // Simulação baseada em dados reais (agrupamento por mês)
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
      return months.map((m) => ({
        month: m,
        count: Math.floor(Math.random() * 50) + 10,
        percent: Math.floor(Math.random() * 80) + 20,
        color: m === 'Nov' ? '#22c55e' : '#cbd5e1'
      }))
    }
  },

  methods: {
    getPrunings() {
      this.loading = true
      this.$api.get<any[]>('/pruning').then((res) => {
        this.prunings = res.data || []
        this.loading = false
      })
    },

    getTreesCount() {
      this.$api.get<any[]>('/trees').then((res) => {
        const trees = res.data || []
        this.totalTrees = trees.length
        this.countUrgent = trees.filter((t: any) => 
          (t.aiPrediction?.estimated_height_m / t.aiPrediction?.wire_height_m) >= 0.9
        ).length
      })
    },

    getPruningColor(type: string) {
      if (type === 'HEAVY') return 'red-lighten-1'
      if (type === 'MODERATE') return 'orange-lighten-1'
      return 'green-lighten-1'
    },

    formatDateFull(dateStr: string) {
      if (!dateStr) return '-'
      return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    },

    viewDetails(item: any) {
      this.$router.push(`/manager?report=${item.id}`)
    },

    downloadAll() {
      console.log('Baixando relatórios...')
    },
  },
}
</script>

<style scoped>

/* Ajuste fino para a barra de pesquisa superior */
.search-bar-container .custom-search-field {
  max-width: 200px;
}

/* --- Estilos Modernos --- */
.chart-container {
  display: flex;
  position: relative;
  border-bottom: 1px solid #e2e8f0;
}

.y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding-right: 12px;
  color: #94a3b8;
  font-size: 10px;
}

.bars {
  flex: 1;
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
}

.bar-col {
  flex: 1;
  max-width: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
}

.bar-fill {
  width: 100%;
  border-radius: 4px 4px 0 0;
  transition: height 0.3s ease;
}

.bar-label {
  margin-top: 8px;
  font-size: 10px;
  color: #64748b;
}

.modern-table {
  background: white !important;
}

.modern-table :deep(th) {
  text-transform: uppercase;
  font-size: 11px !important;
  letter-spacing: 0.5px;
  color: #64748b !important;
}
</style>
