<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { apiConnect, type User } from '@/plugins/apiConnect'

interface MunicipalityOption {
  id: number
  nome: string
}

interface GeoGeometry {
  type: 'Polygon' | 'MultiPolygon'
  coordinates: unknown
}

type Coordinate = [number, number]

interface OrganizationSettings {
  id: string
  name: string
  municipalityCode?: string | null
  municipalityUf?: string | null
  municipalityName?: string | null
  municipalityGeometry?: unknown
  municipalityGeometrySource?: string | null
  municipalityGeometrySourceVersion?: string | null
  municipalityGeometryRetrievedAt?: string | null
}

const states = [
  { uf: 'AC', code: 12, name: 'Acre' }, { uf: 'AL', code: 27, name: 'Alagoas' },
  { uf: 'AP', code: 16, name: 'Amapá' }, { uf: 'AM', code: 13, name: 'Amazonas' },
  { uf: 'BA', code: 29, name: 'Bahia' }, { uf: 'CE', code: 23, name: 'Ceará' },
  { uf: 'DF', code: 53, name: 'Distrito Federal' }, { uf: 'ES', code: 32, name: 'Espírito Santo' },
  { uf: 'GO', code: 52, name: 'Goiás' }, { uf: 'MA', code: 21, name: 'Maranhão' },
  { uf: 'MT', code: 51, name: 'Mato Grosso' }, { uf: 'MS', code: 50, name: 'Mato Grosso do Sul' },
  { uf: 'MG', code: 31, name: 'Minas Gerais' }, { uf: 'PA', code: 15, name: 'Pará' },
  { uf: 'PB', code: 25, name: 'Paraíba' }, { uf: 'PR', code: 41, name: 'Paraná' },
  { uf: 'PE', code: 26, name: 'Pernambuco' }, { uf: 'PI', code: 22, name: 'Piauí' },
  { uf: 'RJ', code: 33, name: 'Rio de Janeiro' }, { uf: 'RN', code: 24, name: 'Rio Grande do Norte' },
  { uf: 'RS', code: 43, name: 'Rio Grande do Sul' }, { uf: 'RO', code: 11, name: 'Rondônia' },
  { uf: 'RR', code: 14, name: 'Roraima' }, { uf: 'SC', code: 42, name: 'Santa Catarina' },
  { uf: 'SP', code: 35, name: 'São Paulo' }, { uf: 'SE', code: 28, name: 'Sergipe' },
  { uf: 'TO', code: 17, name: 'Tocantins' },
]

const organization = ref<OrganizationSettings | null>(null)
const municipalityOptions = ref<MunicipalityOption[]>([])
const selectedUf = ref('')
const selectedCode = ref('')
const previewGeometry = ref<GeoGeometry | null>(null)
const loading = ref(true)
const loadingMunicipalities = ref(false)
const loadingBoundary = ref(false)
const saving = ref(false)
const confirmMunicipalityChange = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const stateCode = computed(() => states.find((state) => state.uf === selectedUf.value)?.code)
const selectedMunicipality = computed(() =>
  municipalityOptions.value.find((municipality) => String(municipality.id) === selectedCode.value),
)
const isChangingMunicipality = computed(() =>
  Boolean(organization.value?.municipalityCode && selectedCode.value &&
    organization.value.municipalityCode !== selectedCode.value),
)
const canSave = computed(() =>
  Boolean(organization.value && selectedCode.value && previewGeometry.value &&
    !saving.value && (!isChangingMunicipality.value || confirmMunicipalityChange.value)),
)
const svgPaths = computed(() => geometryPaths(previewGeometry.value))

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function isGeometry(value: unknown): value is GeoGeometry {
  const geometry = asRecord(value)
  return Boolean(geometry &&
    (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') &&
    Array.isArray(geometry.coordinates))
}

function isCoordinate(point: unknown): point is Coordinate {
  if (!Array.isArray(point)) return false
  const [longitude, latitude] = point
  return typeof longitude === 'number' && Number.isFinite(longitude) &&
    typeof latitude === 'number' && Number.isFinite(latitude)
}

function geometryRings(geometry: GeoGeometry): Coordinate[][] {
  const polygons = geometry.type === 'Polygon'
    ? [geometry.coordinates]
    : geometry.coordinates
  if (!Array.isArray(polygons)) return []

  const rings: Coordinate[][] = []
  for (const polygon of polygons) {
    if (!Array.isArray(polygon)) continue
    for (const ring of polygon) {
      if (!Array.isArray(ring)) continue
      const points = ring.filter(isCoordinate)
      if (points.length >= 3) rings.push(points)
    }
  }
  return rings
}

function geometryPaths(geometry: GeoGeometry | null): string[] {
  if (!geometry) return []
  const rings = geometryRings(geometry)
  if (!rings.length) return []

  let minLongitude = Infinity
  let maxLongitude = -Infinity
  let minLatitude = Infinity
  let maxLatitude = -Infinity
  for (const ring of rings) {
    for (const [longitude, latitude] of ring) {
      minLongitude = Math.min(minLongitude, longitude)
      maxLongitude = Math.max(maxLongitude, longitude)
      minLatitude = Math.min(minLatitude, latitude)
      maxLatitude = Math.max(maxLatitude, latitude)
    }
  }
  if (![minLongitude, maxLongitude, minLatitude, maxLatitude].every(Number.isFinite)) return []

  const cosLatitude = Math.cos((minLatitude + maxLatitude) * Math.PI / 360)
  let minX = Infinity
  let maxX = -Infinity
  for (const ring of rings) {
    for (const [longitude] of ring) {
      const x = longitude * cosLatitude
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
    }
  }
  const minY = minLatitude
  const maxY = maxLatitude
  const width = maxX - minX
  const height = maxY - minY
  if (!width || !height) return []

  const scale = Math.min(88 / width, 88 / height)
  const offsetX = (100 - width * scale) / 2
  const offsetY = (100 - height * scale) / 2
  const path = rings.map((ring) => {
    const commands = ring.map(([longitude, latitude], index) => {
      const x = offsetX + (longitude * cosLatitude - minX) * scale
      const y = 100 - offsetY - (latitude - minY) * scale
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`
    })
    return `${commands.join(' ')} Z`
  }).join(' ')
  return [path]
}

function messageFromError(cause: unknown, fallback: string): string {
  const message = (cause as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
  return Array.isArray(message) ? message.join(' ') : message || fallback
}

async function fetchMunicipalities(keepCode?: string | null) {
  municipalityOptions.value = []
  selectedCode.value = ''
  if (!stateCode.value) return

  loadingMunicipalities.value = true
  errorMessage.value = ''
  try {
    const response = await fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateCode.value}/municipios?orderBy=nome`,
    )
    if (!response.ok) throw new Error('IBGE indisponível')
    municipalityOptions.value = await response.json() as MunicipalityOption[]
    if (keepCode && municipalityOptions.value.some((item) => String(item.id) === keepCode)) {
      selectedCode.value = keepCode
    }
  } catch {
    errorMessage.value = 'Não foi possível carregar a lista oficial de municípios do IBGE. Tente novamente.'
  } finally {
    loadingMunicipalities.value = false
  }
}

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data: profile } = await apiConnect.get<User>('/users/me/profile')
    const organizationId = profile.organization?.id ?? profile.organizationId
    if (!organizationId) {
      throw new Error('Sua conta ainda não está vinculada a uma empresa ativa. Peça à equipe MapTree para concluir o vínculo.')
    }

    const { data } = await apiConnect.get<OrganizationSettings>(`/organizations/${encodeURIComponent(organizationId)}`)
    organization.value = data
    if (data.municipalityUf) {
      selectedUf.value = data.municipalityUf
      await fetchMunicipalities(data.municipalityCode)
      if (isGeometry(data.municipalityGeometry)) previewGeometry.value = data.municipalityGeometry
    }
  } catch (cause) {
    errorMessage.value = cause instanceof Error && !('response' in cause)
      ? cause.message
      : messageFromError(cause, 'Não foi possível carregar a configuração da sua empresa.')
  } finally {
    loading.value = false
  }
}

async function onUfChange() {
  selectedCode.value = ''
  previewGeometry.value = null
  confirmMunicipalityChange.value = false
  successMessage.value = ''
  await fetchMunicipalities()
}

function onMunicipalityChange() {
  previewGeometry.value = null
  confirmMunicipalityChange.value = false
  successMessage.value = ''
}

async function previewBoundary() {
  if (!selectedCode.value) return
  loadingBoundary.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const url = `https://servicodados.ibge.gov.br/api/v3/malhas/municipios/${selectedCode.value}?formato=application/vnd.geo+json&qualidade=maxima`
    const response = await fetch(url)
    if (!response.ok) throw new Error('IBGE indisponível')
    const collection = asRecord(await response.json())
    const features = Array.isArray(collection?.features) ? collection.features : []
    const feature = features.map(asRecord).find((item) =>
      String(asRecord(item?.properties)?.codarea ?? '') === selectedCode.value,
    )
    if (!isGeometry(feature?.geometry)) {
      throw new Error('O IBGE não retornou um limite válido para este município.')
    }
    previewGeometry.value = feature.geometry
  } catch (cause) {
    errorMessage.value = cause instanceof Error && cause.message.includes('limite válido')
      ? cause.message
      : 'Não foi possível consultar o limite oficial do IBGE. Confira a conexão e tente novamente.'
  } finally {
    loadingBoundary.value = false
  }
}

async function save() {
  if (!organization.value || !selectedCode.value || !canSave.value) return
  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const { data } = await apiConnect.patch<OrganizationSettings>(
      `/organizations/${encodeURIComponent(organization.value.id)}/municipality`,
      { municipalityCode: selectedCode.value },
    )
    organization.value = data
    selectedUf.value = data.municipalityUf ?? selectedUf.value
    selectedCode.value = data.municipalityCode ?? selectedCode.value
    if (isGeometry(data.municipalityGeometry)) previewGeometry.value = data.municipalityGeometry
    confirmMunicipalityChange.value = false
    successMessage.value = `Limite oficial salvo para ${data.municipalityName} / ${data.municipalityUf}.`
  } catch (cause) {
    errorMessage.value = messageFromError(cause, 'Não foi possível salvar o município. Tente novamente.')
  } finally {
    saving.value = false
  }
}

function formatRetrievedAt(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('pt-BR')
}

onMounted(load)
</script>

<template>
  <main class="tw:min-h-full tw:bg-slate-50 tw:px-4 tw:py-8 tw:text-slate-900 tw:sm:px-6">
    <section class="tw:mx-auto tw:max-w-5xl">
      <header class="tw:mb-7">
        <p class="tw:text-sm tw:font-semibold tw:uppercase tw:tracking-wide tw:text-emerald-800">Configuração da empresa</p>
        <h1 class="tw:mt-1 tw:text-2xl tw:font-bold tw:sm:text-3xl">Município e limite oficial</h1>
        <p class="tw:mt-2 tw:max-w-3xl tw:text-sm tw:leading-6 tw:text-slate-600">
          Selecione o município da sua empresa e confira o limite oficial do IBGE. Esse limite define a área das consultas geográficas do MapTree.
        </p>
      </header>

      <div v-if="loading" class="tw:rounded-2xl tw:border tw:border-slate-200 tw:bg-white tw:p-6 tw:text-sm tw:text-slate-600" role="status">
        Carregando empresa e configuração municipal…
      </div>

      <div v-else class="tw:space-y-5">
        <p v-if="errorMessage" class="tw:rounded-xl tw:border tw:border-red-200 tw:bg-red-50 tw:p-4 tw:text-sm tw:text-red-800" role="alert">{{ errorMessage }}</p>
        <p v-if="successMessage" class="tw:rounded-xl tw:border tw:border-emerald-200 tw:bg-emerald-50 tw:p-4 tw:text-sm tw:text-emerald-900" role="status" aria-live="polite">{{ successMessage }}</p>

        <section v-if="organization" class="tw:grid tw:gap-5 tw:lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
          <div class="tw:rounded-2xl tw:border tw:border-slate-200 tw:bg-white tw:p-5 tw:shadow-sm tw:sm:p-7">
            <h2 class="tw:text-lg tw:font-semibold">Empresa</h2>
            <p class="tw:mt-1 tw:text-sm tw:text-slate-600">{{ organization.name }}</p>

            <div class="tw:mt-6 tw:space-y-4">
              <label for="municipality-uf" class="tw:block tw:text-sm tw:font-semibold">Estado (UF)</label>
              <select
                id="municipality-uf"
                v-model="selectedUf"
                class="tw:-mt-2 tw:min-h-12 tw:w-full tw:rounded-lg tw:border tw:border-slate-300 tw:bg-white tw:px-3 tw:text-base tw:outline-none tw:focus:border-emerald-700 tw:focus:ring-2 tw:focus:ring-emerald-700/20"
                @change="onUfChange"
              >
                <option value="" disabled>Selecione um estado</option>
                <option v-for="state in states" :key="state.uf" :value="state.uf">{{ state.name }} ({{ state.uf }})</option>
              </select>

              <label for="municipality-city" class="tw:block tw:text-sm tw:font-semibold">Município</label>
              <select
                id="municipality-city"
                v-model="selectedCode"
                :disabled="!selectedUf || loadingMunicipalities || !municipalityOptions.length"
                class="tw:-mt-2 tw:min-h-12 tw:w-full tw:rounded-lg tw:border tw:border-slate-300 tw:bg-white tw:px-3 tw:text-base tw:outline-none tw:focus:border-emerald-700 tw:focus:ring-2 tw:focus:ring-emerald-700/20 tw:disabled:bg-slate-100 tw:disabled:text-slate-500"
                @change="onMunicipalityChange"
              >
                <option value="" disabled>{{ loadingMunicipalities ? 'Carregando municípios…' : 'Selecione um município' }}</option>
                <option v-for="municipality in municipalityOptions" :key="municipality.id" :value="String(municipality.id)">
                  {{ municipality.nome }}
                </option>
              </select>
              <p v-if="selectedCode" class="tw:-mt-2 tw:text-xs tw:text-slate-500">Código IBGE: {{ selectedCode }}</p>

              <button
                type="button"
                class="tw:min-h-11 tw:rounded-lg tw:border tw:border-emerald-800 tw:px-4 tw:font-semibold tw:text-emerald-900 tw:hover:bg-emerald-50 tw:focus-visible:outline tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-emerald-700 tw:disabled:cursor-not-allowed tw:disabled:opacity-60"
                :disabled="!selectedCode || loadingBoundary"
                @click="previewBoundary"
              >{{ loadingBoundary ? 'Consultando limite…' : previewGeometry ? 'Atualizar prévia oficial' : 'Pré-visualizar limite oficial' }}</button>
            </div>

            <div v-if="isChangingMunicipality" class="tw:mt-5 tw:rounded-xl tw:border tw:border-amber-300 tw:bg-amber-50 tw:p-4">
              <label class="tw:flex tw:items-start tw:gap-3 tw:text-sm tw:leading-5 tw:text-amber-950">
                <input v-model="confirmMunicipalityChange" type="checkbox" class="tw:mt-1 tw:h-4 tw:w-4 tw:shrink-0 tw:accent-amber-700" />
                <span>Confirmo a alteração do município da empresa. O recorte geográfico dos dados será atualizado.</span>
              </label>
            </div>

            <button
              type="button"
              class="tw:mt-5 tw:min-h-12 tw:w-full tw:rounded-lg tw:bg-emerald-800 tw:px-5 tw:font-semibold tw:text-white tw:hover:bg-emerald-900 tw:focus-visible:outline tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-emerald-700 tw:disabled:cursor-not-allowed tw:disabled:opacity-50"
              :disabled="!canSave"
              @click="save"
            >{{ saving ? 'Salvando…' : 'Salvar configuração oficial' }}</button>

            <p class="tw:mt-3 tw:text-xs tw:leading-5 tw:text-slate-500">O sistema confirma novamente código, nome, estado e geometria diretamente no IBGE ao salvar.</p>
          </div>

          <aside class="tw:rounded-2xl tw:border tw:border-slate-200 tw:bg-white tw:p-5 tw:shadow-sm tw:sm:p-7" aria-label="Prévia do limite municipal">
            <div class="tw:flex tw:items-start tw:justify-between tw:gap-3">
              <div>
                <h2 class="tw:text-lg tw:font-semibold">Prévia do limite</h2>
                <p class="tw:mt-1 tw:text-sm tw:text-slate-600">{{ selectedMunicipality?.nome || organization.municipalityName || 'Escolha um município' }}<span v-if="selectedUf"> / {{ selectedUf }}</span></p>
              </div>
              <span class="tw:rounded-full tw:bg-emerald-50 tw:px-3 tw:py-1 tw:text-xs tw:font-semibold tw:text-emerald-800">IBGE</span>
            </div>

            <div class="tw:mt-5 tw:flex tw:min-h-56 tw:items-center tw:justify-center tw:rounded-xl tw:bg-emerald-50 tw:p-4">
              <svg v-if="svgPaths.length" viewBox="0 0 100 100" class="tw:h-52 tw:w-full tw:max-w-sm" role="img" :aria-label="`Forma do limite municipal de ${selectedMunicipality?.nome || organization.municipalityName || 'município selecionado'}`">
                <path v-for="(path, index) in svgPaths" :key="index" :d="path" fill="#a3e635" fill-opacity="0.7" stroke="#166534" stroke-width="0.7" fill-rule="evenodd" />
              </svg>
              <p v-else class="tw:max-w-xs tw:text-center tw:text-sm tw:leading-6 tw:text-slate-600">Selecione o município e consulte o limite oficial para visualizar o polígono aqui.</p>
            </div>

            <dl v-if="organization.municipalityCode" class="tw:mt-5 tw:space-y-2 tw:border-t tw:border-slate-200 tw:pt-4 tw:text-xs tw:text-slate-600">
              <div class="tw:flex tw:justify-between tw:gap-3"><dt>Configuração atual</dt><dd class="tw:text-right tw:font-medium">{{ organization.municipalityCode }} · {{ organization.municipalityName }} / {{ organization.municipalityUf }}</dd></div>
              <div class="tw:flex tw:justify-between tw:gap-3"><dt>Obtido em</dt><dd class="tw:text-right">{{ formatRetrievedAt(organization.municipalityGeometryRetrievedAt) }}</dd></div>
              <div v-if="organization.municipalityGeometrySourceVersion" class="tw:flex tw:justify-between tw:gap-3"><dt>Fonte</dt><dd class="tw:text-right">{{ organization.municipalityGeometrySourceVersion }}</dd></div>
            </dl>
            <p class="tw:mt-4 tw:text-xs tw:leading-5 tw:text-slate-500">A prévia é ilustrativa e serve para confirmar o município selecionado. A geometria oficial é obtida e validada pelo servidor.</p>
          </aside>
        </section>
      </div>
    </section>
  </main>
</template>
