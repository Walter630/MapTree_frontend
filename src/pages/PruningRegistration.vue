<template>
  <v-container fluid class="page-shell">
    <PageHeader
      title="Registrar Poda"
      subtitle="Registre uma nova poda realizada no sistema"
      :breadcrumbs="[
        { text: 'Meu Painel', to: '/user' },
        { text: 'Podas', to: '/user/podas' },
        { text: '#Nova Poda' },
      ]"
    />

    <v-alert type="info" variant="tonal" class="mb-5"
      >Está atendendo uma rota? Registre o serviço na própria parada, com a árvore já
      selecionada.<v-btn
        class="ml-2"
        variant="text"
        :to="`${route.path.startsWith('/admin') ? '/admin' : route.path.startsWith('/manager') ? '/manager' : '/user'}/routes/daily`"
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
                  placeholder="Selecione a árvore"
                  variant="outlined"
                  density="comfortable"
                  :loading="loadingTrees"
                  no-data-text="Nenhuma árvore disponível"
                />
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
            color="#C5E11F"
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
      <v-card class="pa-4 text-center">
        <v-icon size="64" color="success" class="mb-4">mdi-check-circle</v-icon>
        <h3 class="text-h6 font-weight-bold mb-2">Poda Registrada!</h3>
        <p class="text-body-2 text-grey mb-4">A poda foi registrada com sucesso no sistema.</p>
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
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { localDate, treeIdentity, treeCoordinates } from '@/utils/pruningWorkflow'
import PageHeader from '@/components/shared/PageHeader.vue'
import { apiConnect } from '@/plugins/apiConnect'
import { getApiErrorMessage } from '@/utils/apiError'

const router = useRouter()
const route = useRoute()

// Refs
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
const isValid = ref(false)
const showValidation = ref(false)
const submitting = ref(false)
const showSuccess = ref(false)
const showError = ref(false)
const errorMessage = ref('')

// Data
const trees = ref<(TreeApiRecord & { displayName: string })[]>([])
const loadingTrees = ref(true)

const form = ref({
  idTree: '',
  type: '',
  date: localDate(),
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

const loadTrees = async () => {
  loadingTrees.value = true
  try {
    const response = await apiConnect.get<TreeApiRecord[]>('/trees')
    trees.value = (response.data || []).map((tree) => ({
      ...tree,
      displayName: `${treeIdentity(tree)} · ${treeCoordinates(tree)}`,
    }))
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

const submit = async () => {
  if (submitting.value) return
  showValidation.value = true

  const validation = await formRef.value?.validate()
  const valid = validation?.valid
  if (!valid) return

  submitting.value = true
  try {
    await apiConnect.post('/pruning', {
      idTree: form.value.idTree,
      type: form.value.type,
      date: `${form.value.date}T12:00:00-03:00`,
      observations: form.value.observations,
    })

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
  router.back()
}

const goToList = () => {
  router.push('/user/podas')
}

// Lifecycle
onMounted(() => {
  loadTrees()
})
</script>

<style scoped>
.form-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  padding: 24px;
}

.form-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #c5e11f 0%, #9ed013 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.field-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #555;
  margin-bottom: 6px;
  display: block;
}

.required {
  color: #c80c34;
}

.summary-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  padding: 24px;
  position: sticky;
  top: 24px;
}
</style>
