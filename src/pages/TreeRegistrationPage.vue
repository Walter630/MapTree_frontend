<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiConnect, type Measurement } from '@/plugins/apiConnect'
import { getApiErrorMessage } from '@/utils/apiError'
import {
  parseMeasurementPair,
  readMeters,
  type FieldMeasurementInput,
} from '@/utils/measurementInput'
import PageHeader from '@/components/shared/PageHeader.vue'
import TreeSavingOverlay from '@/components/shared/TreeSavingOverlay.vue'

interface SpeciesOption {
  id: string
  commonName: string
  scientificName?: string
}

interface PendingMeasurement extends FieldMeasurementInput {
  treeId: string
  location: string
}

const router = useRouter()
const route = useRoute()
const formRef = ref()
const loading = ref(false)
const loadingSpecies = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const warningMessage = ref('')
const pendingMeasurement = ref<PendingMeasurement | null>(null)
const savingMeasurement = ref(false)
const meters = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
// Tela de carregamento: cobre as duas gravações (árvore e, se houver, medição).
const isSaving = computed(() => loading.value || savingMeasurement.value)
const savingStep = computed<'tree' | 'measurement'>(() =>
  savingMeasurement.value ? 'measurement' : 'tree',
)
const species = ref<SpeciesOption[]>([])
const speciesDialog = ref(false)
const speciesMenu = ref(false)
const savingSpecies = ref(false)
const speciesError = ref('')
const speciesFormRef = ref()
const newSpecies = reactive({ commonName: '', scientificName: '', family: '' })

function normalizeSpeciesName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('pt-BR')
}

function filterSpecies(_value: string, query: string, item?: { raw: SpeciesOption }): boolean {
  const search = normalizeSpeciesName(query)
  return [item?.raw.commonName, item?.raw.scientificName].some((name) =>
    normalizeSpeciesName(name || '').includes(search),
  )
}

function openSpeciesDialog() {
  speciesMenu.value = false
  speciesError.value = ''
  Object.assign(newSpecies, { commonName: '', scientificName: '', family: '' })
  speciesDialog.value = true
}

async function saveSpecies() {
  if (savingSpecies.value) return
  const validation = await speciesFormRef.value?.validate()
  if (!validation?.valid) return
  const payload = {
    commonName: newSpecies.commonName.trim(),
    scientificName: newSpecies.scientificName.trim(),
    family: newSpecies.family.trim(),
  }
  const normalize = (value: string) => value.trim().toLocaleLowerCase('pt-BR')
  if (
    species.value.some(
      (item) =>
        normalize(item.commonName) === normalize(payload.commonName) ||
        normalize(item.scientificName || '') === normalize(payload.scientificName),
    )
  ) {
    speciesError.value = 'Esta espécie já está no catálogo. Selecione o registro existente.'
    return
  }
  savingSpecies.value = true
  speciesError.value = ''
  try {
    const { data } = await apiConnect.post<SpeciesOption>('/species', payload)
    species.value = [...species.value, data].sort((a, b) =>
      a.commonName.localeCompare(b.commonName, 'pt-BR'),
    )
    form.speciesId = data.id
    speciesDialog.value = false
  } catch (error: unknown) {
    speciesError.value = getApiErrorMessage(
      error,
      'Não foi possível cadastrar a espécie. Confira se ela já existe e tente novamente.',
    )
  } finally {
    savingSpecies.value = false
  }
}

const form = reactive({
  speciesId: '',
  latitude: '',
  longitude: '',
  age: '',
  status: 'NORMAL',
  vigor: 'GOOD',
  height: '',
  canopyWidth: '',
})

const backRoute = computed(() => {
  if (route.path.startsWith('/manager')) return '/manager'
  if (route.path.startsWith('/user')) return '/user'
  return '/admin'
})
const heatMapUrl = computed(() => {
  const path = backRoute.value === '/user' ? 'user/mapUser' : backRoute.value.slice(1) + '/map'
  return import.meta.env.BASE_URL + path + '?camada=calor'
})
const isAdmin = computed(() => route.path.startsWith('/admin'))
const pageTitle = computed(() =>
  isAdmin.value ? 'Cadastrar árvore na organização' : 'Cadastrar árvore',
)

const statusOptions = [
  { title: 'Normal', value: 'NORMAL' },
  { title: 'Precisa de poda', value: 'TO_PRUNE' },
  { title: 'Em observação', value: 'UNDER_OBSERVATION' },
]

const vigorOptions = [
  { title: 'Bom', value: 'GOOD' },
  { title: 'Excelente', value: 'EXCELLENT' },
  { title: 'Debilitado', value: 'POOR' },
]

const rules = {
  required: (value: unknown) =>
    (value !== null && value !== undefined && String(value).trim().length > 0) ||
    'Campo obrigatório',
  coordinate: (value: unknown) => {
    const number = Number(value)
    return Number.isFinite(number) || 'Informe uma coordenada válida'
  },
  latitude: (value: unknown) => {
    const number = Number(value)
    if (!Number.isFinite(number)) return 'Informe uma latitude válida'
    return (number >= -90 && number <= 90) || 'Latitude deve estar entre -90 e 90'
  },
  longitude: (value: unknown) => {
    const number = Number(value)
    if (!Number.isFinite(number)) return 'Informe uma longitude válida'
    return (number >= -180 && number <= 180) || 'Longitude deve estar entre -180 e 180'
  },
}

function isFilled(value: unknown): boolean {
  return String(value ?? '').trim().length > 0
}

// Altura e largura da copa são gravadas juntas (POST /measurements exige as duas).
const measurementRules = {
  height: (value: unknown) => {
    if (!isFilled(value)) return isFilled(form.canopyWidth) ? 'Informe também a altura.' : true
    const number = readMeters(String(value))
    return (Number.isFinite(number) && number > 0) || 'Informe a altura em metros, maior que zero.'
  },
  canopyWidth: (value: unknown) => {
    if (!isFilled(value)) {
      return isFilled(form.height) ? 'Informe também a largura da copa.' : true
    }
    return Number.isFinite(readMeters(String(value))) || 'Informe a largura da copa em metros.'
  },
}

const pendingMeasurementLabel = computed(() => {
  const pending = pendingMeasurement.value
  if (!pending) return ''
  return `altura ${meters.format(pending.height)} m, copa ${meters.format(pending.canopyWidth)} m`
})

async function loadSpecies() {
  loadingSpecies.value = true
  try {
    const catalog: SpeciesOption[] = []
    const pageSize = 100
    for (let page = 1; ; page++) {
      const response = await apiConnect.get<SpeciesOption[]>('/species', {
        params: { page, limit: pageSize },
      })
      const batch = response.data || []
      catalog.push(...batch)
      if (batch.length < pageSize) break
    }
    species.value = catalog.sort((a, b) => a.commonName.localeCompare(b.commonName, 'pt-BR'))
  } catch {
    errorMessage.value = 'Não foi possível carregar as espécies. Tente atualizar a página.'
  } finally {
    loadingSpecies.value = false
  }
}

function resetForm() {
  form.speciesId = ''
  form.latitude = ''
  form.longitude = ''
  form.age = ''
  form.status = 'NORMAL'
  form.vigor = 'GOOD'
  form.height = ''
  form.canopyWidth = ''
}

const TREE_SAVED_MESSAGE =
  'Árvore cadastrada com sucesso. Ela já pode aparecer no mapa após a atualização.'
const TREE_AND_MEASUREMENT_SAVED_MESSAGE =
  'Árvore e medição cadastradas com sucesso. Elas já podem aparecer no mapa após a atualização.'

/** Grava a medição pendente. Só considera salva quando a API confirma com id e treeId. */
async function postPendingMeasurement() {
  const pending = pendingMeasurement.value
  if (!pending || savingMeasurement.value) return

  savingMeasurement.value = true
  warningMessage.value = ''
  try {
    const { data } = await apiConnect.post<Measurement>('/measurements', {
      treeId: pending.treeId,
      height: pending.height,
      canopyWidth: pending.canopyWidth,
    })
    if (data?.treeId !== pending.treeId || !data.id) {
      warningMessage.value =
        'A árvore foi cadastrada, mas a API não confirmou a medição. Tente salvar de novo ou confira o histórico no mapa.'
      return
    }
    pendingMeasurement.value = null
    successMessage.value = TREE_AND_MEASUREMENT_SAVED_MESSAGE
  } catch (cause: unknown) {
    warningMessage.value =
      'A árvore foi cadastrada, mas a medição não foi salva. ' +
      getApiErrorMessage(cause, 'Não foi possível registrar a medição.')
  } finally {
    savingMeasurement.value = false
  }
}

function dismissPendingMeasurement() {
  pendingMeasurement.value = null
  warningMessage.value = ''
}

/** Segunda gravação do cadastro: nunca lança, pois a árvore já foi salva. */
async function saveInitialMeasurement(
  treeId: string | undefined,
  measurement: FieldMeasurementInput | null,
  location: string,
) {
  if (!measurement) {
    successMessage.value = TREE_SAVED_MESSAGE
    return
  }
  if (!treeId) {
    warningMessage.value = `A árvore foi cadastrada em ${location}, mas a API não devolveu o identificador para vincular a medição. Abra a árvore no mapa e use Registrar medição.`
    return
  }
  pendingMeasurement.value = { treeId, location, ...measurement }
  await postPendingMeasurement()
}

async function submit() {
  // Reserve the submit synchronously, before Vuetify's async validation yields.
  // Two fast clicks can otherwise validate in parallel and both POST /trees.
  if (loading.value || savingMeasurement.value) return
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  warningMessage.value = ''
  try {
    const result = await formRef.value?.validate()
    if (result && !result.valid) return

    let measurement: FieldMeasurementInput | null = null
    if (isFilled(form.height) || isFilled(form.canopyWidth)) {
      const parsed = parseMeasurementPair(form.height, form.canopyWidth)
      if (!parsed.ok) {
        errorMessage.value = parsed.error
        return
      }
      measurement = parsed.value
    }

    const payload: {
      idSpecies: string
      latitude: number
      longitude: number
      status: string
      vigor: string
      age?: string
    } = {
      idSpecies: form.speciesId,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      status: form.status,
      vigor: form.vigor,
    }

    if (form.age) {
      payload.age = new Date(`${form.age}-01-01`).toISOString()
    }

    const location = `${payload.latitude}, ${payload.longitude}`
    const response = await apiConnect.post<{ id?: string }>('/trees', payload)
    // A árvore está gravada: limpa o formulário antes da segunda gravação para
    // que um reenvio não duplique o cadastro.
    resetForm()
    await saveInitialMeasurement(response?.data?.id, measurement, location)
  } catch (error: unknown) {
    errorMessage.value = getApiErrorMessage(
      error,
      'Não foi possível cadastrar a árvore. Confira os dados e tente novamente.',
    )
  } finally {
    loading.value = false
  }
}

onMounted(loadSpecies)
</script>

<template>
  <v-container fluid class="page-shell py-8">
    <PageHeader
      :title="pageTitle"
      subtitle="Cadastre a localização e os dados mínimos para a equipe encontrar a árvore."
      :breadcrumbs="[{ text: 'Meu Painel', to: backRoute }, { text: 'Cadastrar árvore' }]"
    />

    <v-card class="mx-auto registration-card" elevation="0">
      <v-card-item class="pb-2">
        <template #prepend>
          <v-avatar color="green-lighten-5" size="48">
            <v-icon color="green-darken-2" size="30" aria-hidden="true">mdi-tree-outline</v-icon>
          </v-avatar>
        </template>
        <v-card-title>{{ pageTitle }}</v-card-title>
        <v-card-subtitle
          >Cadastre a localização e os dados mínimos para a equipe encontrar a
          árvore.</v-card-subtitle
        >
      </v-card-item>

      <div class="inventory-shortcut">
        <div>
          <strong>Mapa de calor</strong>
          <p>Consulte a concentração e a quantidade por espécie sem perder o cadastro.</p>
        </div>
        <v-btn
          :href="heatMapUrl"
          target="_blank"
          rel="noopener"
          color="green-darken-3"
          variant="flat"
          append-icon="mdi-open-in-new"
          >Abrir mapa</v-btn
        >
      </div>
      <v-divider />

      <v-alert
        v-if="successMessage"
        type="success"
        variant="tonal"
        class="ma-4 mb-0"
        closable
        @click:close="successMessage = ''"
      >
        {{ successMessage }}
      </v-alert>
      <v-alert
        v-if="warningMessage"
        type="warning"
        variant="tonal"
        class="ma-4 mb-0"
        closable
        data-testid="measurement-warning"
        @click:close="dismissPendingMeasurement"
      >
        <p class="mb-2">{{ warningMessage }}</p>
        <template v-if="pendingMeasurement">
          <p class="text-caption mb-3">
            Medição pendente ({{ pendingMeasurementLabel }}) da árvore em
            {{ pendingMeasurement.location }}. Tente de novo ou feche este aviso para descartá-la e
            registrar depois pelo mapa.
          </p>
          <v-btn
            size="small"
            variant="flat"
            color="warning"
            prepend-icon="mdi-refresh"
            :disabled="savingMeasurement"
            data-testid="retry-measurement"
            @click="postPendingMeasurement"
            >Tentar salvar a medição novamente</v-btn
          >
        </template>
      </v-alert>
      <v-alert
        v-if="errorMessage"
        type="error"
        variant="tonal"
        class="ma-4 mb-0"
        closable
        @click:close="errorMessage = ''"
      >
        {{ errorMessage }}
      </v-alert>

      <v-form
        ref="formRef"
        validate-on="submit"
        class="pa-6"
        :inert="isSaving ? '' : undefined"
        @submit.prevent="submit"
      >
        <div class="d-flex flex-wrap justify-space-between align-center ga-2 mb-4">
          <div>
            <p class="text-subtitle-1 font-weight-bold mb-0">Identificação</p>
            <p class="text-caption text-medium-emphasis mb-0">
              {{ species.length }} espécies disponíveis no catálogo
            </p>
          </div>
        </div>
        <v-row>
          <v-col cols="12" md="7">
            <v-card variant="outlined" rounded="lg" class="species-picker pa-4">
              <div class="d-flex align-center ga-2 mb-3">
                <v-icon color="green-darken-3" aria-hidden="true">mdi-tree-outline</v-icon>
                <span class="text-subtitle-2">Selecione a espécie da árvore</span>
              </div>
              <v-autocomplete
                v-model="form.speciesId"
                v-model:menu="speciesMenu"
                :menu-props="{ maxHeight: 360 }"
                :items="species"
                item-title="commonName"
                item-value="id"
                label="Espécie *"
                prepend-inner-icon="mdi-leaf"
                :loading="loadingSpecies"
                :rules="[rules.required]"
                variant="outlined"
                hint="Pesquise pelo nome popular ou científico."
                :custom-filter="filterSpecies"
                no-data-text="Nenhuma espécie encontrada. Use Cadastrar espécie para adicioná-la."
                persistent-hint
              >
                <template #prepend-item>
                  <div class="pa-2">
                    <v-btn
                      block
                      variant="tonal"
                      color="green-darken-3"
                      prepend-icon="mdi-plus"
                      :disabled="loadingSpecies"
                      data-testid="create-species-option"
                      @click="openSpeciesDialog"
                      >Cadastrar nova espécie</v-btn
                    >
                  </div>
                  <v-divider />
                </template>
                <template #item="{ props, item }">
                  <v-list-item v-bind="props" :subtitle="item.raw.scientificName" />
                </template>
              </v-autocomplete>
            </v-card>
          </v-col>
          <v-col cols="12" md="5">
            <v-select
              v-model="form.status"
              :items="statusOptions"
              label="Status inicial"
              variant="outlined"
            />
          </v-col>
        </v-row>

        <p class="text-subtitle-1 font-weight-bold mb-4 mt-4">Localização</p>
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="form.latitude"
              label="Latitude *"
              type="number"
              step="any"
              min="-90"
              max="90"
              variant="outlined"
              prepend-inner-icon="mdi-latitude"
              :rules="[rules.required, rules.coordinate, rules.latitude]"
              hint="Ex.: -3.731900"
              persistent-hint
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="form.longitude"
              label="Longitude *"
              type="number"
              step="any"
              min="-180"
              max="180"
              variant="outlined"
              prepend-inner-icon="mdi-longitude"
              :rules="[rules.required, rules.coordinate, rules.longitude]"
              hint="Ex.: -38.526700"
              persistent-hint
            />
          </v-col>
        </v-row>

        <p class="text-subtitle-1 font-weight-bold mb-1 mt-4">
          Medição de campo
          <span class="text-caption text-grey font-weight-regular">(opcional)</span>
        </p>
        <p class="text-caption text-medium-emphasis mb-3">
          Se você mediu a árvore, informe a altura e a largura da copa juntas. Os valores entram no
          histórico de medições e aparecem no mapa.
        </p>
        <v-row>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="form.height"
              label="Altura medida"
              inputmode="decimal"
              autocomplete="off"
              suffix="m"
              variant="outlined"
              prepend-inner-icon="mdi-ruler"
              :rules="[measurementRules.height]"
              hint="Ex.: 5,2"
              persistent-hint
              data-testid="initial-height"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="form.canopyWidth"
              label="Largura da copa"
              inputmode="decimal"
              autocomplete="off"
              suffix="m"
              variant="outlined"
              prepend-inner-icon="mdi-arrow-expand-horizontal"
              :rules="[measurementRules.canopyWidth]"
              hint="Ex.: 2,4"
              persistent-hint
              data-testid="initial-canopy-width"
            />
          </v-col>
        </v-row>

        <p class="text-subtitle-1 font-weight-bold mb-4 mt-4">
          Dados operacionais
          <span class="text-caption text-grey font-weight-regular">(opcionais)</span>
        </p>
        <v-row>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="form.age"
              label="Ano aproximado de plantio"
              type="number"
              min="1900"
              :max="new Date().getFullYear()"
              variant="outlined"
              prepend-inner-icon="mdi-calendar"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-select
              v-model="form.vigor"
              :items="vigorOptions"
              label="Saúde da árvore"
              variant="outlined"
            />
          </v-col>
        </v-row>

        <v-alert type="info" variant="tonal" density="comfortable" class="mt-2 mb-6">
          Use o status <strong>Precisa de poda</strong> somente quando houver uma necessidade
          confirmada. Assim o mapa mostra primeiro o que exige ação.
        </v-alert>

        <div class="d-flex flex-wrap justify-end ga-3">
          <v-btn variant="outlined" @click="router.push(backRoute)">Cancelar</v-btn>
          <v-btn
            color="green-darken-2"
            type="submit"
            :disabled="isSaving || Boolean(pendingMeasurement)"
            prepend-icon="mdi-content-save"
            >Salvar árvore</v-btn
          >
        </div>
      </v-form>
    </v-card>
    <v-dialog v-model="speciesDialog" max-width="520" :persistent="savingSpecies">
      <v-card rounded="xl" title="Cadastrar espécie">
        <v-form ref="speciesFormRef" @submit.prevent="saveSpecies">
          <v-card-text>
            <p class="text-body-2 mb-4">
              A espécie ficará disponível no catálogo para os próximos cadastros de árvores.
            </p>
            <v-alert v-if="speciesError" type="error" variant="tonal" class="mb-4">{{
              speciesError
            }}</v-alert>
            <v-text-field
              v-model="newSpecies.commonName"
              label="Nome popular *"
              :rules="[rules.required]"
              variant="outlined"
              :disabled="savingSpecies"
            />
            <v-text-field
              v-model="newSpecies.scientificName"
              label="Nome científico *"
              :rules="[rules.required]"
              variant="outlined"
              :disabled="savingSpecies"
            />
            <v-text-field
              v-model="newSpecies.family"
              label="Família botânica *"
              :rules="[rules.required]"
              variant="outlined"
              :disabled="savingSpecies"
            />
          </v-card-text>
          <v-card-actions class="px-6 pb-5">
            <v-spacer />
            <v-btn :disabled="savingSpecies" @click="speciesDialog = false">Cancelar</v-btn>
            <v-btn
              type="submit"
              color="green-darken-3"
              variant="flat"
              :loading="savingSpecies"
              :disabled="savingSpecies"
              >Salvar e selecionar</v-btn
            >
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>

    <TreeSavingOverlay :visible="isSaving" :step="savingStep" />
  </v-container>
</template>

<style scoped>
.species-picker {
  background: #f8fbf8;
  border-color: #cddfd2;
}
.inventory-shortcut {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin: 1rem;
  padding: 1rem;
  background: #edf6ef;
  color: #184e38;
  border-radius: 12px;
}
.inventory-shortcut p {
  font-size: 0.875rem;
  margin: 0.2rem 0 0;
}
.registration-card {
  max-width: 980px;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
}
</style>
