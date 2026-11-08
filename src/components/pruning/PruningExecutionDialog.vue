<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { apiConnect } from '@/plugins/apiConnect'
import type { TreeApiRecord } from '@/types/treeApi'
import { getApiErrorMessage } from '@/utils/apiError'
import {
  localDate,
  pruningTypes,
  treeCoordinates,
  type RoutePruning,
} from '@/utils/pruningWorkflow'

const props = defineProps<{
  modelValue: boolean
  tree: Pick<TreeApiRecord, 'id' | 'species' | 'latitude' | 'longitude' | 'lat' | 'lng'> | null
  scheduleId?: string
  order?: number
  hasNext?: boolean
}>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: [record: RoutePruning, next: boolean]
}>()
const type = ref('')
const date = ref(localDate())
const observations = ref('')
const saving = ref(false)
const error = ref('')
const form = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
const today = computed(() => localDate())
watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    type.value = ''
    date.value = localDate()
    observations.value = ''
    error.value = ''
  },
)
function close() {
  if (!saving.value) emit('update:modelValue', false)
}
async function save(next: boolean) {
  if (saving.value || !props.tree) return
  saving.value = true
  error.value = ''
  try {
    if (!(await form.value?.validate())?.valid) return
    const payload = {
      type: type.value,
      date: date.value === localDate() ? new Date().toISOString() : `${date.value}T12:00:00-03:00`,
      observations: observations.value.trim(),
    }
    const response = props.scheduleId
      ? await apiConnect.post<RoutePruning>(`/scheduling/${props.scheduleId}/complete`, payload)
      : await apiConnect.post<RoutePruning>('/pruning', { ...payload, idTree: props.tree.id })
    emit('update:modelValue', false)
    emit('saved', response.data, next)
  } catch (cause) {
    error.value = getApiErrorMessage(
      cause,
      'Não foi possível salvar. Seus dados foram mantidos; tente novamente.',
    )
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="650"
    scrollable
    :persistent="saving"
    @update:model-value="close"
  >
    <v-card rounded="xl">
      <v-card-title class="execution-heading"
        ><div>
          <span class="text-overline text-green-darken-3">{{
            order ? `Parada ${order} da rota` : 'Registro de campo'
          }}</span>
          <h2 class="text-h6">Registrar poda realizada</h2>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          aria-label="Fechar registro de poda"
          :disabled="saving"
          @click="close"
      /></v-card-title>
      <v-card-text v-if="tree" class="pt-0">
        <div class="selected-tree">
          <v-icon size="30" color="green-darken-3">mdi-tree-outline</v-icon>
          <div>
            <strong>{{ tree.species?.commonName || 'Árvore' }}</strong
            ><span class="tree-id">Identificação: {{ tree.id }}</span
            ><span>{{ treeCoordinates(tree) }}</span
            ><span v-if="tree.species?.scientificName" class="font-italic">{{
              tree.species.scientificName
            }}</span>
          </div>
        </div>
        <p class="text-body-2 text-grey-darken-1 mb-5">
          A árvore já está vinculada a esta parada. Confira a identificação e a localização antes de
          confirmar o serviço.
        </p>
        <v-alert v-if="error" role="alert" type="error" variant="tonal" class="mb-4">{{
          error
        }}</v-alert>
        <v-form ref="form" :disabled="saving" @submit.prevent="save(false)">
          <v-select
            v-model="type"
            :items="pruningTypes"
            label="Como foi a poda?"
            variant="outlined"
            :rules="[(value) => !!value || 'Selecione a intensidade da poda.']"
          />
          <v-text-field
            v-model="date"
            type="date"
            label="Data em que o serviço foi realizado"
            variant="outlined"
            :max="today"
            :rules="[
              (value) => !!value || 'Informe a data.',
              (value) => value <= today || 'A data não pode estar no futuro.',
            ]"
          />
          <v-textarea
            v-model="observations"
            label="O que foi feito?"
            placeholder="Ex.: removidos galhos secos, feita a limpeza da copa e recolhidos os resíduos."
            variant="outlined"
            rows="3"
            counter="500"
            maxlength="500"
            hint="Registre detalhes do serviço e qualquer impedimento observado."
            persistent-hint
          />
        </v-form>
      </v-card-text>
      <v-card-actions class="execution-actions"
        ><v-btn :disabled="saving" @click="close">Cancelar</v-btn><v-spacer /><v-btn
          color="green-darken-3"
          :variant="hasNext ? 'outlined' : 'flat'"
          :loading="saving"
          @click="save(false)"
          >Salvar poda</v-btn
        ><v-btn
          v-if="hasNext"
          color="green-darken-3"
          variant="flat"
          :disabled="saving"
          append-icon="mdi-arrow-right"
          @click="save(true)"
          >Salvar e próxima árvore</v-btn
        ></v-card-actions
      >
    </v-card>
  </v-dialog>
</template>

<style scoped>
.execution-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  white-space: normal;
}
.selected-tree {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  background: #edf4ed;
  border: 1px solid #cbdccc;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}
.selected-tree strong,
.selected-tree span {
  display: block;
  overflow-wrap: anywhere;
}
.selected-tree span {
  font-size: 0.78rem;
  color: #506656;
  margin-top: 4px;
}
.tree-id {
  font-family: monospace;
}
.execution-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 16px 24px 24px;
}
@media (max-width: 600px) {
  .execution-actions .v-btn {
    width: 100%;
    margin: 0;
  }
  .execution-actions .v-spacer {
    display: none;
  }
}
</style>
