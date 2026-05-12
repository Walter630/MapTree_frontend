<template>
  <v-container fluid class="pt-3 pb-6 px-6" style="max-width: 1400px; margin: 0 auto;">
    <PageHeader
      title="Podas"
      subtitle="Gerencie Todas As Podas De Vegetação Próxima À Rede Elétrica"
      :breadcrumbs="[{ text: 'Meu Painel', to: '/user' }, { text: '#Podas' }]"
    />

    <!-- Botão Nova Poda -->
    <v-btn
      color="#C5E11F"
      class="mb-4 text-none font-weight-bold"
      prepend-icon="mdi-plus"
      elevation="0"
      @click="createPruning"
    >
      Nova Poda
    </v-btn>

    <!-- Cards de Resumo -->
    <v-row class="mb-4" dense>
      <v-col cols="6" md="4">
        <v-card class="kpi-card" flat>
          <div class="kpi-header">
            <span class="kpi-label">Total de Podas</span>
            <v-icon size="20" color="blue-darken-2">mdi-content-cut</v-icon>
          </div>
          <div class="kpi-value">{{ stats.total }}</div>
          <div class="kpi-subtitle">Registradas</div>
        </v-card>
      </v-col>
      <v-col cols="6" md="4">
        <v-card class="kpi-card" :class="{ 'kpi-card--warning': stats.pending > 0 }" flat>
          <div class="kpi-header">
            <span class="kpi-label">Pendentes</span>
            <v-icon size="20" :color="stats.pending > 0 ? 'warning' : 'grey'">mdi-clock-alert</v-icon>
          </div>
          <div class="kpi-value" :class="{ 'text-warning': stats.pending > 0 }">{{ stats.pending }}</div>
          <div class="kpi-subtitle">Aguardando</div>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card class="kpi-card" flat>
          <div class="kpi-header">
            <span class="kpi-label">Taxa de Conclusão</span>
            <v-icon size="20" color="success">mdi-check-circle</v-icon>
          </div>
          <div class="kpi-value text-success">{{ stats.completionRate }}%</div>
          <div class="kpi-subtitle">{{ stats.completed }} concluídas</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Loading -->
    <v-card v-if="loading" class="pa-8 text-center" flat>
      <v-progress-circular indeterminate color="green" size="48" />
      <p class="mt-4 text-grey">Carregando podas...</p>
    </v-card>

    <!-- Tabela de Podas -->
    <v-card v-else class="pruning-card" flat>
      <div class="d-flex align-center justify-space-between mb-4">
        <h3 class="text-subtitle-1 font-weight-bold mb-0">Histórico de Podas</h3>
        <v-chip size="small" color="grey-lighten-3">{{ prunings.length }} registros</v-chip>
      </div>

      <v-data-table
        :items="prunings"
        :headers="headers"
        :items-per-page="10"
        density="comfortable"
        class="pruning-table"
        no-data-text="Nenhuma poda registrada"
      >
        <!-- Árvore -->
        <template #item.tree="{ item }">
          <div class="d-flex align-center">
            <v-icon size="18" color="green-darken-2" class="mr-2">mdi-tree</v-icon>
            <span class="text-body-2">
              {{ item.tree?.species?.commonName || 'Árvore #' + item.idTree?.slice(-4) }}
            </span>
          </div>
        </template>

        <!-- Localização -->
        <template #item.location="{ item }">
          <div v-if="item.tree?.latitude" class="text-caption text-grey-darken-1">
            {{ item.tree.latitude.toFixed(4) }}, {{ item.tree.longitude.toFixed(4) }}
          </div>
          <span v-else class="text-caption text-grey">—</span>
        </template>

        <!-- Tipo -->
        <template #item.type="{ item }">
          <v-chip
            :color="getTypeColor(item.type)"
            size="small"
            variant="flat"
            class="font-weight-medium"
          >
            {{ getTypeLabel(item.type) }}
          </v-chip>
        </template>

        <!-- Data -->
        <template #item.date="{ item }">
          <span class="text-body-2">{{ formatDate(item.date) }}</span>
        </template>

        <!-- Observações -->
        <template #item.observations="{ item }">
          <span class="text-caption text-grey-darken-1 text-truncate" style="max-width: 200px; display: block;">
            {{ item.observations || '—' }}
          </span>
        </template>

        <!-- Ações -->
        <template #item.actions="{ item }">
          <v-btn
            icon
            size="small"
            variant="text"
            color="primary"
            @click="viewDetails(item)"
          >
            <v-icon size="18">mdi-eye</v-icon>
          </v-btn>
        </template>
      </v-data-table>
    </v-card>

    <!-- Error Snackbar -->
    <v-snackbar v-model="showError" color="error" timeout="5000">
      {{ errorMessage }}
      <template #actions>
        <v-btn variant="text" @click="showError = false">Fechar</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import { apiConnect } from '@/plugins/apiConnect'

const router = useRouter()

// State
const prunings = ref<any[]>([])
const loading = ref(true)
const showError = ref(false)
const errorMessage = ref('')

// Headers da tabela
const headers = [
  { title: 'Árvore', key: 'tree', sortable: false },
  { title: 'Localização', key: 'location', sortable: false },
  { title: 'Tipo', key: 'type', sortable: true },
  { title: 'Data', key: 'date', sortable: true },
  { title: 'Observações', key: 'observations', sortable: false },
  { title: 'Ações', key: 'actions', sortable: false, align: 'center' },
] as const

// Stats computadas
const stats = computed(() => {
  const total = prunings.value.length
  const completed = prunings.value.filter(p => p.type === 'HEAVY').length // HEAVY = poda completa
  const pending = total - completed
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

  return { total, completed, pending, completionRate }
})

// Métodos
const createPruning = () => router.push('/user/podas/nova')

const viewDetails = (item: any) => {
  console.log('Ver detalhes:', item)
  // router.push(`/user/podas/${item.id}`)
}

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    'LIGHT': 'blue',
    'MODERATE': 'orange',
    'HEAVY': 'green',
  }
  return colors[type] || 'grey'
}

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    'LIGHT': 'Leve',
    'MODERATE': 'Moderada',
    'HEAVY': 'Pesada',
  }
  return labels[type] || type
}

const formatDate = (date: string | Date | undefined) => {
  if (!date) return '—'
  const d = new Date(date)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const loadPrunings = async () => {
  loading.value = true
  try {
    const response = await apiConnect.get<any[]>('/pruning')
    prunings.value = response.data || []
  } catch (error: any) {
    console.error('Erro ao carregar podas:', error)
    errorMessage.value = error.response?.data?.message || 'Erro ao carregar podas'
    showError.value = true
  } finally {
    loading.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadPrunings()
})
</script>

<style scoped>
.kpi-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 16px;
  height: 100%;
  transition: all 0.2s ease;
}

.kpi-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.kpi-card--warning {
  background: linear-gradient(135deg, #fff8e1 0%, #ffffff 100%);
  border-color: #ffe082;
}

.kpi-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.kpi-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #666;
}

.kpi-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #333;
  line-height: 1;
}

.kpi-subtitle {
  font-size: 0.75rem;
  color: #888;
  margin-top: 4px;
}

.pruning-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 20px;
}

.pruning-table :deep(th) {
  font-weight: 600 !important;
  color: #555 !important;
  font-size: 0.8rem !important;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.pruning-table :deep(td) {
  padding-top: 12px !important;
  padding-bottom: 12px !important;
}
</style>
