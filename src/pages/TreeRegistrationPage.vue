<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiConnect, type Measurement } from '@/plugins/apiConnect'
import type { TreeApiRecord } from '@/types/treeApi'
import { useAppStore } from '@/stores/app'
import { getApiErrorMessage } from '@/utils/apiError'
import {
  parseMeasurementPair,
  readMeters,
  type FieldMeasurementInput,
} from '@/utils/measurementInput'
import PageHeader from '@/components/shared/PageHeader.vue'
import TreeSavingOverlay from '@/components/shared/TreeSavingOverlay.vue'
import MunicipalityLocationPicker from '@/components/shared/MunicipalityLocationPicker.vue'
import { clearTreeCreateAttemptKey, getTreeCreateAttemptKey } from '@/utils/treeCreateAttempt'
import {
  createMunicipalityPointValidator,
  isMunicipalityGeometry,
  type MunicipalityGeometry,
} from '@/utils/municipalityGeometry'

interface SpeciesOption {
  id: string
  commonName: string
  scientificName?: string
}

interface PendingMeasurement extends FieldMeasurementInput {
  treeId: string
  location: string
}

interface OrganizationMunicipality {
  municipalityName?: string | null
  municipalityUf?: string | null
  municipalityGeometry?: unknown
}

interface GeographicPoint {
  latitude: number
  longitude: number
}

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()
const formRef = ref()
const loading = ref(false)
const loadingExistingTree = ref(false)
const loadingSpecies = ref(false)
const errorMessage = ref('')
const editLoadError = ref('')
const successMessage = ref('')
const warningMessage = ref('')
const pendingMeasurement = ref<PendingMeasurement | null>(null)
const savingMeasurement = ref(false)
const saveProgress = ref(0)
const meters = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
const isSaving = computed(() => loading.value || savingMeasurement.value)
const showSaveProgress = computed(
  () => isSaving.value || (Boolean(pendingMeasurement.value) && Boolean(warningMessage.value)),
)
const savingStep = computed<'tree' | 'measurement'>(() =>
  savingMeasurement.value ? 'measurement' : 'tree',
)
const isEditMode = computed(() => typeof route.params.treeId === 'string')
const editTreeId = computed(() => (typeof route.params.treeId === 'string' ? route.params.treeId : ''))
const editUpdatedAt = ref<string | null>(null)
const editReady = ref(false)
const species = ref<SpeciesOption[]>([])
const canManageSpecies = computed(() => appStore.user?.role === 'ADMIN')
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
  if (!canManageSpecies.value) return
  speciesMenu.value = false
  speciesError.value = ''
  Object.assign(newSpecies, { commonName: '', scientificName: '', family: '' })
  speciesDialog.value = true
}

async function saveSpecies() {
  if (!canManageSpecies.value) return
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
  latitude: initialCoordinate(route.query.latitude, -90, 90),
  longitude: initialCoordinate(route.query.longitude, -180, 180),
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
const returnMapPath = computed(() =>
  backRoute.value === '/user' ? '/user/mapUser' : `${backRoute.value}/map`,
)
const canReturnToMap = computed(() => route.query.returnMap === returnMapPath.value)
const returnMapQuery = computed(() => {
  const query: Record<string, string> = {}
  for (const key of [
    'treeMapLat',
    'treeMapLng',
    'treeMapZoom',
    'treeMapRegion',
    'treeMapFilter',
    'treeMapDimension',
    'treeMapCategory',
    'treeMapHeat',
  ]) {
    const value = route.query[key]
    if (typeof value === 'string' && value) query[key] = value
  }
  const date = route.query.routeDate
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) query.routeDate = date
  return query
})
const treeSaved = ref(false)
const heatMapUrl = computed(() => {
  const path = backRoute.value === '/user' ? 'user/mapUser' : backRoute.value.slice(1) + '/map'
  return import.meta.env.BASE_URL + path + '?camada=calor'
})
const isAdmin = computed(() => route.path.startsWith('/admin'))
const pageTitle = computed(() =>
  isEditMode.value
    ? 'Editar árvore'
    : isAdmin.value
      ? 'Cadastrar árvore na organização'
      : 'Cadastrar árvore',
)
const pageSubtitle = computed(() =>
  isEditMode.value
    ? 'Atualize os dados da árvore cadastrada por você.'
    : 'Cadastre a localização e os dados mínimos para a equipe encontrar a árvore.',
)
const requiresMunicipalityBoundary = computed(() => !isAdmin.value && !isEditMode.value)
const municipalityGeometry = ref<MunicipalityGeometry | null>(null)
const municipalityName = ref('')
const municipalityUf = ref('')
const municipalityBoundaryLoading = ref(false)
const municipalityBoundaryError = ref('')
const outsideMapPickMessage = ref('')
const municipalityPointValidator = computed(() =>
  createMunicipalityPointValidator(municipalityGeometry.value),
)
const currentGeographicPoint = computed<GeographicPoint | null>(() => {
  if (!form.latitude.trim() || !form.longitude.trim()) return null
  const latitude = Number(form.latitude)
  const longitude = Number(form.longitude)
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null
  }
  return { latitude, longitude }
})
const currentPointInsideMunicipality = computed(() => {
  const point = currentGeographicPoint.value
  if (!point || !municipalityGeometry.value) return false
  return municipalityPointValidator.value(point.longitude, point.latitude)
})
const currentPointOutsideMunicipality = computed(
  () =>
    requiresMunicipalityBoundary.value &&
    Boolean(municipalityGeometry.value && currentGeographicPoint.value) &&
    !currentPointInsideMunicipality.value,
)
const formattedMunicipalityName = computed(() =>
  [municipalityName.value, municipalityUf.value].filter(Boolean).join(' / '),
)
const outsideMunicipalityMessage = computed(() => {
  const area = formattedMunicipalityName.value || 'município da empresa'
  return `A localização da árvore precisa estar dentro do limite de ${area}. Selecione um ponto dentro da área verde ou ajuste as coordenadas.`
})
const locationBoundaryMessage = computed(() =>
  currentPointOutsideMunicipality.value
    ? outsideMunicipalityMessage.value
    : outsideMapPickMessage.value,
)
const canSubmitLocation = computed(() => {
  if (!requiresMunicipalityBoundary.value) return true
  if (
    municipalityBoundaryLoading.value ||
    municipalityBoundaryError.value ||
    !municipalityGeometry.value
  ) {
    return false
  }
  return !currentPointOutsideMunicipality.value && !outsideMapPickMessage.value
})
const mapLocation = computed<GeographicPoint | null>({
  get: () => currentGeographicPoint.value,
  set: (point) => {
    if (!point) return
    form.latitude = String(point.latitude)
    form.longitude = String(point.longitude)
    outsideMapPickMessage.value = ''
  },
})

function initialCoordinate(value: unknown, min: number, max: number): string {
  if (typeof value !== 'string' || !value.trim()) return ''
  const number = Number(value)
  return Number.isFinite(number) && number >= min && number <= max ? value : ''
}

async function loadMunicipalityBoundary() {
  if (!requiresMunicipalityBoundary.value || municipalityBoundaryLoading.value) return
  municipalityBoundaryLoading.value = true
  municipalityBoundaryError.value = ''
  municipalityGeometry.value = null
  try {
    const { data: profile } = await apiConnect.get<{
      organizationId?: string | null
      organization?: { id?: string | null }
    }>('/users/me/profile')
    const organizationId = profile.organization?.id ?? profile.organizationId
    if (!organizationId) {
      throw new Error('Sua conta não está vinculada a uma empresa com área municipal configurada.')
    }

    const { data: organization } = await apiConnect.get<OrganizationMunicipality>(
      `/organizations/${encodeURIComponent(organizationId)}`,
    )
    municipalityName.value = organization.municipalityName?.trim() || 'Município da empresa'
    municipalityUf.value = organization.municipalityUf?.trim() || ''
    if (!isMunicipalityGeometry(organization.municipalityGeometry)) {
      throw new Error(
        'O limite municipal da empresa não está configurado. Peça ao gestor para configurar a área antes do cadastro.',
      )
    }

    municipalityGeometry.value = organization.municipalityGeometry
  } catch (error: unknown) {
    const response = (error as { response?: unknown })?.response
    municipalityBoundaryError.value =
      !response && error instanceof Error
        ? error.message
        : getApiErrorMessage(
            error,
            'Não foi possível carregar o limite municipal da empresa. Atualize a página ou fale com o gestor.',
          )
  } finally {
    municipalityBoundaryLoading.value = false
  }
}

function rejectOutsideMapPick() {
  outsideMapPickMessage.value = outsideMunicipalityMessage.value
}

watch(
  () => [form.latitude, form.longitude],
  () => {
    outsideMapPickMessage.value = ''
  },
)

function returnToMap() {
  if (!canReturnToMap.value) return
  void router.push({ path: returnMapPath.value, query: returnMapQuery.value })
}

function cancelForm() {
  if (canReturnToMap.value) returnToMap()
  else void router.push(backRoute.value)
}

const statusOptions = [
  { title: 'Normal', value: 'NORMAL' },
  { title: 'Precisa de poda', value: 'TO_PRUNE' },
  { title: 'Em observação', value: 'UNDER_OBSERVATION' },
]
const formStatusOptions = computed(() =>
  statusOptions.some(({ value }) => value === form.status)
    ? statusOptions
    : [{ title: form.status.replace(/_/g, ' '), value: form.status }, ...statusOptions],
)

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

let editLoadRequest = 0
async function loadExistingTree() {
  const request = ++editLoadRequest
  editReady.value = false
  editLoadError.value = ''
  editUpdatedAt.value = null
  if (!editTreeId.value) return

  loadingExistingTree.value = true
  try {
    const { data } = await apiConnect.get<TreeApiRecord>(
      `/trees/${encodeURIComponent(editTreeId.value)}`,
    )
    if (request !== editLoadRequest) return
    if (!data?.id || data.id !== editTreeId.value || !data.updatedAt) {
      throw new Error('A API não devolveu a versão da árvore.')
    }
    if (appStore.user?.role === 'USER' && data.createdById !== appStore.user.id) {
      editLoadError.value = 'Você só pode editar árvores cadastradas por você na sua empresa.'
      return
    }

    const updatedAt = new Date(data.updatedAt)
    if (!Number.isFinite(updatedAt.getTime())) {
      throw new Error('A API não devolveu uma versão válida da árvore.')
    }
    form.speciesId = data.idSpecies || data.speciesId || data.species?.id || ''
    form.latitude = String(data.latitude ?? data.lat ?? '')
    form.longitude = String(data.longitude ?? data.lng ?? '')
    form.age = data.age ? String(new Date(data.age).getUTCFullYear()) : ''
    form.status = data.status || 'NORMAL'
    form.vigor = data.vigor || 'GOOD'
    form.height = ''
    form.canopyWidth = ''
    editUpdatedAt.value = updatedAt.toISOString()
    editReady.value = true
  } catch (error: unknown) {
    if (request !== editLoadRequest) return
    editLoadError.value = getApiErrorMessage(
      error,
      'Não foi possível abrir esta árvore para edição. Confira se ela está vinculada à sua empresa.',
    )
  } finally {
    if (request === editLoadRequest) loadingExistingTree.value = false
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
    saveProgress.value = 100
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
    saveProgress.value = 100
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
  if (loading.value || savingMeasurement.value || loadingExistingTree.value) return
  if (requiresMunicipalityBoundary.value && !canSubmitLocation.value) {
    if (currentPointOutsideMunicipality.value) {
      outsideMapPickMessage.value = outsideMunicipalityMessage.value
    }
    return
  }
  if (isEditMode.value && (!editReady.value || !editUpdatedAt.value)) return
  loading.value = true
  saveProgress.value = 0
  errorMessage.value = ''
  successMessage.value = ''
  warningMessage.value = ''
  treeSaved.value = false
  try {
    const result = await formRef.value?.validate()
    if (result && !result.valid) return

    let measurement: FieldMeasurementInput | null = null
    if (!isEditMode.value && (isFilled(form.height) || isFilled(form.canopyWidth))) {
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

    if (isEditMode.value) {
      const editPayload = {
        ...payload,
        ...(form.age ? {} : { age: null }),
        expectedUpdatedAt: editUpdatedAt.value,
      }
      const { data } = await apiConnect.patch<TreeApiRecord>(
        `/trees/${encodeURIComponent(editTreeId.value)}`,
        editPayload,
      )
      if (data?.id !== editTreeId.value || !data.updatedAt) {
        throw new Error('A API não confirmou a árvore atualizada.')
      }
      editUpdatedAt.value = new Date(data.updatedAt).toISOString()
      successMessage.value = 'Árvore atualizada com sucesso.'
      saveProgress.value = 100
      treeSaved.value = true
      return
    }

    const location = `${payload.latitude}, ${payload.longitude}`
    const idempotencyKey = await getTreeCreateAttemptKey(payload)
    const response = await apiConnect.createTree<{ id?: string }>(payload, idempotencyKey)
    clearTreeCreateAttemptKey(idempotencyKey)
    saveProgress.value = 50
    treeSaved.value = true
    // A árvore está gravada: limpa o formulário antes da segunda gravação para
    // que um reenvio não duplique o cadastro.
    resetForm()
    await saveInitialMeasurement(response?.data?.id, measurement, location)
  } catch (error: unknown) {
    const response = (error as {
      response?: { status?: number; data?: { message?: string | string[] } }
    })?.response
    const serverMessage = Array.isArray(response?.data?.message)
      ? response.data.message.join(' ')
      : response?.data?.message
    errorMessage.value =
      response?.status === 400 &&
      serverMessage?.toLocaleLowerCase('pt-BR').includes('localização da árvore precisa estar dentro')
        ? outsideMunicipalityMessage.value
        : getApiErrorMessage(
            error,
            isEditMode.value
              ? 'Não foi possível atualizar a árvore. Confira os dados e tente novamente.'
              : 'Não foi possível cadastrar a árvore. Confira os dados e tente novamente.',
          )
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadSpecies()
  if (isEditMode.value) void loadExistingTree()
  else if (requiresMunicipalityBoundary.value) void loadMunicipalityBoundary()
})

watch(
  () => route.params.treeId,
  (treeId) => {
    if (typeof treeId === 'string') void loadExistingTree()
    else {
      editLoadRequest += 1
      loadingExistingTree.value = false
      editReady.value = false
      editUpdatedAt.value = null
      editLoadError.value = ''
      if (requiresMunicipalityBoundary.value) void loadMunicipalityBoundary()
    }
  },
)
</script>

<template>
  <v-container fluid class="page-shell py-8">
    <PageHeader
      :title="pageTitle"
      :subtitle="pageSubtitle"
      :breadcrumbs="[{ text: 'Meu Painel', to: backRoute }, { text: pageTitle }]"
    />

    <v-card class="mx-auto registration-card" elevation="0">
      <v-card-item class="pb-2">
        <template #prepend>
          <v-avatar color="green-lighten-5" size="48">
            <v-icon color="green-darken-2" size="30" aria-hidden="true">mdi-tree-outline</v-icon>
          </v-avatar>
        </template>
        <v-card-title>{{ pageTitle }}</v-card-title>
        <v-card-subtitle>{{ pageSubtitle }}</v-card-subtitle>
      </v-card-item>

      <div v-if="!isEditMode" class="inventory-shortcut">
        <div>
          <strong>Mapa de calor</strong>
        </div>
        <v-btn
          :href="heatMapUrl"
          target="_blank"
          rel="noopener"
          color="green-darken-3"
          variant="flat"
          append-icon="mdi-open-in-new"
          >Abrir mapa de calor</v-btn
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
      <v-progress-linear v-if="loadingExistingTree" indeterminate color="green-darken-2" />
      <v-alert
        v-if="editLoadError"
        type="error"
        variant="tonal"
        class="ma-4 mb-0"
        data-testid="edit-load-error"
      >
        <div class="d-flex flex-wrap align-center justify-space-between ga-3">
          <span>{{ editLoadError }}</span>
          <v-btn variant="outlined" size="small" @click="cancelForm">Voltar</v-btn>
        </div>
      </v-alert>
      <div v-if="treeSaved && canReturnToMap" class="d-flex justify-end px-4 pt-4">
        <v-btn
          color="green-darken-3"
          variant="flat"
          prepend-icon="mdi-map"
          data-testid="return-to-map"
          @click="returnToMap"
          >Voltar ao mapa</v-btn
        >
      </div>
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
        v-if="!isEditMode || editReady"
        ref="formRef"
        validate-on="submit"
        class="pa-6"
        :inert="isSaving || loadingExistingTree ? '' : undefined"
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
                :no-data-text="canManageSpecies
                  ? 'Nenhuma espécie encontrada. Use Cadastrar espécie para adicioná-la.'
                  : 'Nenhuma espécie encontrada. Solicite a inclusão ao administrador.'"
                persistent-hint
              >
                <template v-if="!isEditMode && canManageSpecies" #prepend-item>
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
              <p v-if="!canManageSpecies" class="text-caption text-medium-emphasis mt-2 mb-0">
                Não encontrou a espécie? Solicite a inclusão ao administrador.
              </p>
            </v-card>
          </v-col>
          <v-col cols="12" md="5">
            <v-select
              v-model="form.status"
              :items="formStatusOptions"
              label="Status inicial"
              variant="outlined"
            />
          </v-col>
        </v-row>

        <p class="text-subtitle-1 font-weight-bold mb-4 mt-4">Localização</p>
        <v-alert
          v-if="requiresMunicipalityBoundary && municipalityBoundaryLoading"
          type="info"
          variant="tonal"
          density="comfortable"
          class="mb-4"
          role="status"
        >
          Carregando o limite municipal da empresa…
        </v-alert>
        <v-alert
          v-else-if="requiresMunicipalityBoundary && municipalityBoundaryError"
          type="error"
          variant="tonal"
          density="comfortable"
          class="mb-4"
          role="alert"
          data-testid="municipality-boundary-load-error"
        >
          {{ municipalityBoundaryError }}
        </v-alert>
        <v-alert
          v-if="requiresMunicipalityBoundary && municipalityGeometry && locationBoundaryMessage"
          type="error"
          variant="tonal"
          density="comfortable"
          class="mb-4"
          role="alert"
          data-testid="municipality-boundary-error"
        >
          {{ locationBoundaryMessage }}
        </v-alert>
        <MunicipalityLocationPicker
          v-if="requiresMunicipalityBoundary && municipalityGeometry"
          v-model="mapLocation"
          :geometry="municipalityGeometry"
          :municipality-name="formattedMunicipalityName || 'município da empresa'"
          :point-inside-boundary="currentPointInsideMunicipality"
          class="mb-4"
          @outside-boundary="rejectOutsideMapPick"
        />
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

        <p v-if="!isEditMode" class="text-subtitle-1 font-weight-bold mb-1 mt-4">
          Medição de campo
          <span class="text-caption text-grey font-weight-regular">(opcional)</span>
        </p>
        <p v-if="!isEditMode" class="text-caption text-medium-emphasis mb-3">
          Se você mediu a árvore, informe a altura e a largura da copa juntas. Os valores entram no
          histórico de medições e aparecem no mapa.
        </p>
        <v-row v-if="!isEditMode">
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
        <v-alert v-else type="info" variant="tonal" density="comfortable" class="mt-4">
          As medições ficam no histórico de campo. Para adicionar uma nova, abra a árvore no mapa e
          escolha <strong>Registrar medição</strong>.
        </v-alert>

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
          <TreeSavingOverlay
            :visible="showSaveProgress"
            :step="savingStep"
            :progress="saveProgress"
          />
          <v-btn variant="outlined" @click="cancelForm">Cancelar</v-btn>
          <v-btn
            color="green-darken-2"
            type="submit"
            :disabled="
              isSaving ||
              loadingExistingTree ||
              Boolean(pendingMeasurement) ||
              !canSubmitLocation
            "
            prepend-icon="mdi-content-save"
            >{{ isEditMode ? 'Salvar alterações' : 'Salvar árvore' }}</v-btn
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

  </v-container>
</template>

<style scoped>
.species-picker {
  background: var(--mt-surface-soft);
  border-color: var(--mt-border);
}
.inventory-shortcut {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin: 1rem;
  padding: 1rem;
  background: var(--mt-surface-soft);
  color: var(--mt-forest);
  border-radius: 12px;
}
.inventory-shortcut p {
  font-size: 0.875rem;
  margin: 0.2rem 0 0;
}
.registration-card {
  max-width: 980px;
  border: 1px solid var(--mt-border);
  border-radius: 18px;
}
</style>
