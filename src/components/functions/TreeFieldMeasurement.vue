<script setup lang="ts">
import { computed, ref } from 'vue'
import { apiConnect, type Measurement } from '@/plugins/apiConnect'
import { getApiErrorMessage } from '@/utils/apiError'
import { parseMeasurementPair } from '@/utils/measurementInput'

const props = defineProps<{
  treeId: string
  measurement?: Measurement
  wireHeight?: number
}>()
const emit = defineEmits<{ saved: [measurement: Measurement] }>()

const editing = ref(false)
const saving = ref(false)
const height = ref('')
const canopyWidth = ref('')
const error = ref('')
const feedback = ref('')
const meters = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })

const heightText = computed(() =>
  props.measurement ? `${meters.format(props.measurement.height)} m` : '—',
)
const widthText = computed(() =>
  props.measurement ? `${meters.format(props.measurement.canopyWidth)} m` : '—',
)
const measuredOn = computed(() =>
  props.measurement
    ? new Date(props.measurement.date).toLocaleDateString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
      })
    : '',
)
const wireText = computed(() =>
  props.wireHeight !== undefined && props.wireHeight > 0
    ? `${meters.format(props.wireHeight)} m`
    : 'indisponível',
)

function startEditing() {
  height.value = ''
  canopyWidth.value = ''
  error.value = ''
  feedback.value = ''
  editing.value = true
}

async function save() {
  if (saving.value) return
  const parsed = parseMeasurementPair(height.value, canopyWidth.value)
  if (!parsed.ok) {
    error.value = parsed.error
    return
  }

  saving.value = true
  error.value = ''
  try {
    const { data } = await apiConnect.post<Measurement>('/measurements', {
      treeId: props.treeId,
      height: parsed.value.height,
      canopyWidth: parsed.value.canopyWidth,
    })
    if (data?.treeId !== props.treeId || !data.id) {
      error.value = 'A API não confirmou a medição. Reabra a árvore para conferir o histórico.'
      return
    }
    emit('saved', data)
    feedback.value = 'Medição registrada.'
    editing.value = false
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Não foi possível registrar a medição.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="field-measurement" aria-label="Medição de campo">
    <header class="fm-header">
      <span class="fm-icon" aria-hidden="true"><v-icon size="20">mdi-ruler</v-icon></span>
      <div>
        <h3 class="fm-title">Medição de campo</h3>
        <p class="fm-subtitle">
          <template v-if="measurement">Medição de {{ measuredOn }}</template>
          <template v-else>Sem medição de campo disponível.</template>
        </p>
      </div>
    </header>

    <dl class="fm-metrics">
      <div class="fm-metric">
        <dt>Altura medida</dt>
        <dd data-testid="measured-height">{{ heightText }}</dd>
      </div>
      <div class="fm-metric">
        <dt>Largura da copa</dt>
        <dd data-testid="measured-width">{{ widthText }}</dd>
      </div>
    </dl>

    <p class="fm-reference">
      <v-icon size="16" aria-hidden="true">mdi-flash-outline</v-icon>
      Referência da fiação: <strong>{{ wireText }}</strong>
    </p>
    <p class="fm-note">Valor de referência do tipo de local, não é uma medição física da fiação.</p>

    <p v-if="feedback" role="status" class="fm-feedback">{{ feedback }}</p>

    <v-btn
      v-if="!editing"
      class="fm-action"
      variant="tonal"
      color="green-darken-3"
      prepend-icon="mdi-ruler"
      @click="startEditing"
    >
      {{ measurement ? 'Registrar nova medição' : 'Registrar medição' }}
    </v-btn>

    <v-form v-else class="fm-form" :disabled="saving" @submit.prevent="save">
      <v-text-field
        v-model="height"
        inputmode="decimal"
        autocomplete="off"
        autofocus
        suffix="m"
        label="Altura medida da árvore (m)"
        hint="Use vírgula ou ponto. Ex.: 5,2"
        persistent-hint
        variant="outlined"
        density="compact"
      />
      <v-text-field
        v-model="canopyWidth"
        inputmode="decimal"
        autocomplete="off"
        suffix="m"
        label="Largura medida da copa (m)"
        hint="Ex.: 2,4"
        persistent-hint
        variant="outlined"
        density="compact"
      />
      <p v-if="error" role="alert" class="fm-error">{{ error }}</p>
      <div class="fm-buttons">
        <v-btn type="submit" color="green-darken-3" :loading="saving" :disabled="saving"
          >Salvar medição</v-btn
        >
        <v-btn variant="text" :disabled="saving" @click="editing = false">Cancelar</v-btn>
      </div>
    </v-form>
  </section>
</template>

<style scoped>
.field-measurement {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
}

.fm-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.fm-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: #e9f6ea;
  color: #2e7d32;
}

.fm-title {
  font-size: 1rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.2;
  margin: 0;
}

.fm-subtitle {
  font-size: 0.78rem;
  color: #64748b;
  margin: 2px 0 0;
}

.fm-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 0 0 12px;
}

.fm-metric {
  background: #f4f8f4;
  border-radius: 12px;
  padding: 12px 14px;
}

.fm-metric dt {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #64748b;
}

.fm-metric dd {
  margin: 4px 0 0;
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1.1;
  color: #1e293b;
}

.fm-reference {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  color: #334155;
  margin: 0;
}

.fm-note {
  font-size: 0.72rem;
  color: #64748b;
  margin: 2px 0 12px;
}

.fm-feedback {
  font-size: 0.875rem;
  color: #2e7d32;
  margin: 0 0 8px;
}

.fm-action {
  text-transform: none;
}

.fm-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fm-error {
  font-size: 0.875rem;
  color: #b3261e;
  margin: 0;
}

.fm-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
