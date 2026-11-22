<template>
  <v-container fluid class="page-shell">
    <PageHeader
      title="Registrar Poda"
      subtitle="Registre uma nova poda realizada no sistema"
      :breadcrumbs="pruningBreadcrumbs"
    />

    <v-alert type="info" variant="tonal" class="mb-5"
      >Se houver uma parada pendente da sua rota para a mesma árvore e data, este registro também
      conclui a parada.<v-btn
        class="ml-2"
        variant="text"
        :to="{ name: profileRoutes.daily, query: { date: form.date } }"
        >Abrir rota diária</v-btn
      ></v-alert
    >
    <v-row>
      <!-- Formulário Principal -->
      <v-col cols="12" lg="8">
        <v-card class="form-card" flat>
          <v-card-title class="px-0 pt-0 pb-4">
            <div class="d-flex align-center">
              <div class="form-icon mr-3">
                <v-icon size="24" color="white">mdi-content-cut</v-icon>
              </div>
              <span class="text-h6 font-weight-bold">Informações da Poda</span>
            </div>
          </v-card-title>

          <v-form ref="formRef" v-model="isValid" lazy-validation>
            <v-row>
              <!-- Árvore -->
              <v-col cols="12" md="6">
                <label class="field-label">Árvore <span class="required">*</span></label>
                <v-autocomplete
                  v-model="form.idTree"
                  :items="trees"
                  item-title="displayName"
                  item-value="id"
                  :rules="[rules.required]"
                  placeholder="Busque por espécie ou identificador"
                  prepend-inner-icon="mdi-magnify"
                  variant="outlined"
                  density="comfortable"
                  :loading="loadingTrees"
                  no-data-text="Nenhuma árvore disponível"
                />
                <v-alert
                  v-if="selectedTree"
                  type="info"
                  variant="tonal"
                  density="compact"
                  class="mt-1"
                  role="status"
                >
                  <strong>{{ selectedTree.species?.commonName || 'Árvore' }}</strong
                  ><br />
                  Identificação: #{{ selectedTree.id }}<br />
                  {{ treeCoordinates(selectedTree) }}
                </v-alert>
              </v-col>

              <!-- Tipo de Poda -->
              <v-col cols="12" md="6">
                <label class="field-label">Tipo de Poda <span class="required">*</span></label>
                <v-select
                  v-model="form.type"
                  :items="pruningTypes"
                  item-title="label"
                  item-value="value"
                  :rules="[rules.required]"
                  placeholder="Selecione o tipo"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>

              <!-- Data -->
              <v-col cols="12" md="6">
                <label class="field-label">Data <span class="required">*</span></label>
                <v-text-field
                  v-model="form.date"
                  type="date"
                  :rules="[rules.required]"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>

              <!-- Observações -->
              <v-col cols="12">
                <label class="field-label">Observações</label>
                <v-textarea
                  v-model="form.observations"
                  placeholder="Descreva detalhes sobre a poda realizada..."
                  variant="outlined"
                  rows="4"
                  counter="500"
                  maxlength="500"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card>
      </v-col>

      <!-- Sidebar com Resumo -->
      <v-col cols="12" lg="4">
        <v-card class="summary-card" flat>
          <v-card-title class="px-0 pt-0 pb-4">
            <span class="text-subtitle-1 font-weight-bold">Resumo</span>
          </v-card-title>

          <div v-if="selectedTree" class="mb-4">
            <div class="d-flex align-center mb-2">
              <v-icon size="20" color="green-darken-2" class="mr-2">mdi-tree</v-icon>
              <span class="font-weight-medium">{{
                selectedTree.species?.commonName || 'Árvore'
              }}</span>
            </div>
            <div class="text-caption text-grey-darken-1 ml-7">
              Identificação: {{ selectedTree.id }}<br />
              {{ treeCoordinates(selectedTree) }}
            </div>
          </div>

          <v-divider v-if="selectedTree" class="mb-4" />

          <div v-if="form.type" class="mb-4">
            <div class="d-flex align-center mb-1">
              <v-icon size="18" :color="getTypeColor(form.type)" class="mr-2">mdi-tag</v-icon>
              <span class="text-body-2">{{ getTypeLabel(form.type) }}</span>
            </div>
          </div>

          <v-alert
            v-if="!isValid && showValidation"
            type="error"
            variant="tonal"
            density="compact"
            class="mb-4"
          >
            Preencha todos os campos obrigatórios
          </v-alert>

          <v-btn
            color="primary"
            block
            height="48"
            class="mb-3 font-weight-bold text-none"
            :loading="submitting"
            :disabled="submitting || (!isValid && showValidation)"
            @click="submit"
          >
            <v-icon start>mdi-check</v-icon>
            Registrar Poda
          </v-btn>

          <v-btn
            variant="outlined"
            color="grey-darken-1"
            block
            height="48"
            class="text-none"
            @click="cancel"
          >
            Cancelar
          </v-btn>
        </v-card>
      </v-col>
    </v-row>

    <!-- Success Dialog -->
    <v-dialog v-model="showSuccess" max-width="400">
      <v-card class="pa-4 text-center pruning-success-card">
        <div class="success-confirmation-icon" aria-hidden="true">
          <v-icon size="34" color="white">mdi-check</v-icon>
        </div>
        <h3 class="text-h6 font-weight-bold mb-2">Poda registrada!</h3>
        <p class="text-body-2 text-medium-emphasis mb-4">
          A data da poda aparece na árvore no mapa. A avaliação de risco é exibida separadamente.
        </p>
        <v-btn color="success" block @click="goToList"> Ver Lista de Podas </v-btn>
      </v-card>
    </v-dialog>

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
import type { TreeApiRecord } from '@/types/treeApi'
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { localDate, treeIdentity, treeCoordinates } from '@/utils/pruningWorkflow'
import PageHeader from '@/components/shared/PageHeader.vue'
import { apiConnect } from '@/plugins/apiConnect'
import { getApiErrorMessage } from '@/utils/apiError'
import { getDailyRouteSchedules, getDailyRouteSchedulesByStatus } from '@/utils/dailyRouteSchedules'

const router = useRouter()
const route = useRoute()

const profileRoutes = computed(() => {
  if (route.name === 'ManagerPruningRegistration' || route.path.startsWith('/manager')) {
    return { home: 'ManagerHome', list: 'ManagerPruningList', daily: 'ManagerDailyRoutes' }
  }
  if (route.name === 'AdminPruningRegistration' || route.path.startsWith('/admin')) {
    return { home: 'AdminHome', list: 'AdminPruningList', daily: 'AdminDailyRoutes' }
  }
  return { home: 'UserHome', list: 'PruningList', daily: 'UserDailyRoutes' }
})

const pruningBreadcrumbs = computed(() => [
  { text: 'Meu Painel', to: { name: profileRoutes.value.home } },
  { text: 'Podas', to: { name: profileRoutes.value.list } },
  { text: '#Nova Poda' },
])

// Refs
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
const isValid = ref(false)
const showValidation = ref(false)
const submitting = ref(false)
const showSuccess = ref(false)
const showError = ref(false)
const errorMessage = ref('')
let attemptedSchedule: { id: string; treeId: string; date: string } | undefined

// Data
const trees = ref<(TreeApiRecord & { displayName: string })[]>([])
const loadingTrees = ref(true)
let routePriorityRequest = 0

const form = ref({
  idTree: '',
  type: '',
  date:
    typeof route.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(route.query.date)
      ? route.query.date
      : localDate(),
  observations: '',
})

const pruningTypes = [
  { value: 'LIGHT', label: 'Leve - Limpeza básica' },
  { value: 'MODERATE', label: 'Moderada - Redução de copa' },
  { value: 'HEAVY', label: 'Pesada - Corte drástico' },
]

const rules = {
  required: (v: unknown) => !!v || 'Campo obrigatório',
}

// Computed
const selectedTree = computed(() => {
  return trees.value.find((t) => t.id === form.value.idTree)
})

// Methods
const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    LIGHT: 'blue',
    MODERATE: 'orange',
    HEAVY: 'green',
  }
  return colors[type] || 'grey'
}

const getTypeLabel = (type: string) => {
  const typeObj = pruningTypes.find((t) => t.value === type)
  return typeObj?.label || type
}

const prioritizePendingTrees = async (date: string) => {
  const request = ++routePriorityRequest
  try {
    const schedules = await getDailyRouteSchedules(date)
    if (request !== routePriorityRequest || date !== form.value.date) return
    const pendingOrder = new Map(
      getDailyRouteSchedulesByStatus(schedules, 'PENDING').map((stop, index) => [
        stop.treeId,
        index,
      ]),
    )
    trees.value = [...trees.value].sort((a, b) => {
      const aOrder = pendingOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER
      const bOrder = pendingOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER
      return aOrder - bOrder || a.displayName.localeCompare(b.displayName, 'pt-BR')
    })
  } catch {
    // A falha da agenda não impede poda avulsa; a busca ainda oferece o inventário completo.
  }
}

const loadTrees = async () => {
  loadingTrees.value = true
  try {
    const response = await apiConnect.get<TreeApiRecord[]>('/trees')
    const allTrees = (response.data || []).map((tree) => ({
      ...tree,
      displayName: `${treeIdentity(tree)} · ${treeCoordinates(tree)}`,
    }))
    trees.value = allTrees
    await prioritizePendingTrees(form.value.date)
    if (
      typeof route.query.treeId === 'string' &&
      trees.value.some((tree) => tree.id === route.query.treeId)
    )
      form.value.idTree = route.query.treeId
  } catch (error) {
    console.error('Erro ao carregar árvores:', error)
  } finally {
    loadingTrees.value = false
  }
}

watch(() => form.value.date, prioritizePendingTrees)

const submit = async () => {
  if (submitting.value) return
  showValidation.value = true
  submitting.value = true
  try {
    if (!(await formRef.value?.validate())?.valid) return
    const { idTree, type, date, observations } = form.value
    const payload = {
      type,
      date: date === localDate() ? new Date().toISOString() : `${date}T12:00:00-03:00`,
      observations,
    }
    if (
      !attemptedSchedule ||
      attemptedSchedule.treeId !== idTree ||
      attemptedSchedule.date !== date
    ) {
      const schedules = await getDailyRouteSchedules(date)
      const matches = schedules.filter(
        (stop) => stop.status === 'PENDING' && stop.treeId === idTree,
      )
      if (matches.length > 1) {
        errorMessage.value =
          'Há mais de uma parada para esta árvore e data. Escolha a parada na rota diária para registrar a poda.'
        showError.value = true
        return
      }
      const match = matches[0]
      attemptedSchedule = match ? { id: match.id, treeId: idTree, date } : undefined
    }
    if (attemptedSchedule)
      await apiConnect.post(`/scheduling/${attemptedSchedule.id}/complete`, payload)
    else await apiConnect.post('/pruning', { ...payload, idTree })

    showSuccess.value = true
  } catch (error: unknown) {
    console.error('Erro ao registrar poda:', error)
    errorMessage.value = getApiErrorMessage(
      error,
      'Não foi possível registrar a poda. Tente novamente.',
    )
    showError.value = true
  } finally {
    submitting.value = false
  }
}

const cancel = () => {
  void router.push({ name: profileRoutes.value.list })
}

const goToList = () => {
  void router.push({ name: profileRoutes.value.list })
}

// Lifecycle
onMounted(() => {
  loadTrees()
})
</script>

<style scoped>
.form-card {
  background: var(--mt-surface);
  border: 1px solid var(--mt-border);
  border-radius: 16px;
  padding: 24px;
}

.form-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgb(var(--v-theme-primary));
  display: flex;
  align-items: center;
  justify-content: center;
}

.pruning-success-card {
  align-items: center;
}

.success-confirmation-icon {
  display: flex;
  width: 64px;
  height: 64px;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  border-radius: 9999px;
  background: #16803c;
}

.field-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--mt-forest);
  margin-bottom: 6px;
  display: block;
}

.required {
  color: rgb(var(--v-theme-error));
}

.summary-card {
  background: var(--mt-surface);
  border: 1px solid var(--mt-border);
  border-radius: 16px;
  padding: 24px;
  position: sticky;
  top: 24px;
}
</style>
