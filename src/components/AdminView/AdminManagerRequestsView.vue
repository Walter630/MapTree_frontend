<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { apiConnect, type ManagerRequest, type ManagerRequestStatus } from '@/plugins/apiConnect'

type RequestList = { data: ManagerRequest[]; page: number; limit: number; total: number; pages: number }
type OrganizationOption = { id: string; name: string; municipalityName?: string | null; municipalityUf?: string | null; isActive?: boolean }

const requests = ref<ManagerRequest[]>([])
const organizations = ref<OrganizationOption[]>([])
const selected = ref<ManagerRequest | null>(null)
const loading = ref(false)
const detailLoading = ref(false)
const saving = ref(false)
const error = ref('')
const statusFilter = ref<ManagerRequestStatus | ''>('PENDING')
const municipalityUf = ref('')
const search = ref('')
const decision = reactive({
  target: 'new' as 'new' | 'existing',
  organizationId: '',
  organizationName: '',
  taxId: '',
  municipalityName: '',
  municipalityUf: '',
  rejectionReason: '',
})
const statuses: Array<{ value: ManagerRequestStatus | ''; label: string }> = [
  { value: 'PENDING', label: 'Pendentes' },
  { value: 'APPROVED', label: 'Aprovadas' },
  { value: 'REJECTED', label: 'Rejeitadas' },
  { value: '', label: 'Todas' },
]
const ufs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

function apiMessage(cause: unknown, fallback: string) {
  const message = (cause as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
  return Array.isArray(message) ? message.join(' ') : message || fallback
}

async function loadRequests() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await apiConnect.get<RequestList>('/admin/manager-requests', {
      params: {
        ...(statusFilter.value ? { status: statusFilter.value } : {}),
        ...(municipalityUf.value ? { municipalityUf: municipalityUf.value } : {}),
        ...(search.value.trim() ? { q: search.value.trim() } : {}),
        page: 1,
        limit: 50,
      },
    })
    requests.value = data.data
    if (selected.value && !requests.value.some((item) => item.id === selected.value?.id)) selected.value = null
  } catch (cause) {
    error.value = apiMessage(cause, 'Não foi possível carregar as solicitações.')
  } finally {
    loading.value = false
  }
}

async function loadOrganizations() {
  try {
    const { data } = await apiConnect.get<OrganizationOption[]>('/organizations', { params: { page: 1, limit: 100 } })
    organizations.value = data.filter((organization) => organization.isActive !== false)
  } catch {
    organizations.value = []
  }
}

async function openRequest(item: ManagerRequest) {
  selected.value = item
  detailLoading.value = true
  error.value = ''
  try {
    const { data } = await apiConnect.get<ManagerRequest>(`/admin/manager-requests/${item.id}`)
    selected.value = data
    decision.target = 'new'
    decision.organizationId = ''
    decision.organizationName = data.requestedOrganizationName
    decision.taxId = ''
    decision.municipalityName = data.municipalityName
    decision.municipalityUf = data.municipalityUf
    decision.rejectionReason = ''
  } catch (cause) {
    error.value = apiMessage(cause, 'Não foi possível abrir os dados da solicitação.')
  } finally {
    detailLoading.value = false
  }
}

function chooseOrganization() {
  const organization = organizations.value.find((item) => item.id === decision.organizationId)
  if (!organization) return
  if (organization.municipalityName) decision.municipalityName = organization.municipalityName
  if (organization.municipalityUf) decision.municipalityUf = organization.municipalityUf
}

async function approve() {
  if (!selected.value) return
  error.value = ''
  if (!decision.municipalityName.trim() || !decision.municipalityUf) {
    error.value = 'Confirme o município e a UF antes de aprovar.'
    return
  }
  const payload = {
    confirmedMunicipalityName: decision.municipalityName.trim(),
    confirmedMunicipalityUf: decision.municipalityUf,
    ...(decision.target === 'existing'
      ? { organizationId: decision.organizationId }
      : { organizationName: decision.organizationName.trim(), taxId: decision.taxId.replace(/\D/g, '') }),
  }
  if (decision.target === 'existing' && !decision.organizationId) {
    error.value = 'Selecione uma empresa existente.'
    return
  }
  if (decision.target === 'new' && (!decision.organizationName.trim() || decision.taxId.replace(/\D/g, '').length !== 14)) {
    error.value = 'Informe o nome e o CNPJ de 14 dígitos da nova empresa.'
    return
  }
  saving.value = true
  try {
    await apiConnect.post(`/admin/manager-requests/${selected.value.id}/approve`, payload)
    selected.value = null
    await loadRequests()
  } catch (cause) {
    error.value = apiMessage(cause, 'Não foi possível aprovar a solicitação.')
  } finally {
    saving.value = false
  }
}

async function reject() {
  if (!selected.value) return
  error.value = ''
  if (decision.rejectionReason.trim().length < 10) {
    error.value = 'A justificativa deve ter pelo menos 10 caracteres.'
    return
  }
  saving.value = true
  try {
    await apiConnect.post(`/admin/manager-requests/${selected.value.id}/reject`, { reason: decision.rejectionReason.trim() })
    selected.value = null
    await loadRequests()
  } catch (cause) {
    error.value = apiMessage(cause, 'Não foi possível rejeitar a solicitação.')
  } finally {
    saving.value = false
  }
}

function statusLabel(status: ManagerRequestStatus) {
  return status === 'PENDING' ? 'Pendente' : status === 'APPROVED' ? 'Aprovada' : 'Rejeitada'
}

onMounted(() => { void Promise.all([loadRequests(), loadOrganizations()]) })
</script>

<template>
  <main class="tw:mx-auto tw:max-w-7xl tw:px-4 tw:py-8 tw:text-slate-900 tw:sm:px-6 tw:lg:px-8">
    <header class="tw:flex tw:flex-wrap tw:items-end tw:justify-between tw:gap-4">
      <div>
        <p class="tw:text-sm tw:font-semibold tw:uppercase tw:tracking-wide tw:text-emerald-800">Acesso à plataforma</p>
        <h1 class="tw:mt-1 tw:text-3xl tw:font-bold">Solicitações de gestores</h1>
        <p class="tw:mt-2 tw:text-sm tw:text-slate-600">Analise dados, confirme o município e vincule cada pessoa à empresa correta.</p>
      </div>
      <button type="button" class="tw:min-h-11 tw:rounded-lg tw:border tw:border-slate-300 tw:px-4 tw:font-semibold tw:hover:bg-white tw:focus-visible:outline tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-emerald-700" :disabled="loading" @click="loadRequests">Atualizar</button>
    </header>

    <p v-if="error" class="tw:mt-5 tw:rounded-lg tw:border tw:border-red-200 tw:bg-red-50 tw:p-4 tw:text-sm tw:text-red-800" role="alert">{{ error }}</p>

    <section class="tw:mt-6 tw:grid tw:gap-5 tw:xl:grid-cols-[minmax(0,0.95fr)_minmax(28rem,1.05fr)]">
      <div class="tw:rounded-2xl tw:border tw:border-slate-200 tw:bg-white tw:p-4 tw:shadow-sm tw:sm:p-5">
        <form class="tw:grid tw:gap-3 tw:sm:grid-cols-[1fr_10rem_auto]" @submit.prevent="loadRequests">
          <label class="tw:text-sm tw:font-medium">Buscar
            <input v-model="search" placeholder="Nome, e-mail ou empresa" class="tw:mt-1.5 tw:min-h-11 tw:w-full tw:rounded-lg tw:border tw:border-slate-300 tw:px-3 tw:outline-none tw:focus:border-emerald-700 tw:focus:ring-2 tw:focus:ring-emerald-700/20" />
          </label>
          <label class="tw:text-sm tw:font-medium">Situação
            <select v-model="statusFilter" class="tw:mt-1.5 tw:min-h-11 tw:w-full tw:rounded-lg tw:border tw:border-slate-300 tw:bg-white tw:px-3 tw:outline-none tw:focus:border-emerald-700 tw:focus:ring-2 tw:focus:ring-emerald-700/20"><option v-for="item in statuses" :key="item.label" :value="item.value">{{ item.label }}</option></select>
          </label>
          <label class="tw:text-sm tw:font-medium">UF
            <select v-model="municipalityUf" class="tw:mt-1.5 tw:min-h-11 tw:w-full tw:rounded-lg tw:border tw:border-slate-300 tw:bg-white tw:px-3 tw:outline-none tw:focus:border-emerald-700 tw:focus:ring-2 tw:focus:ring-emerald-700/20"><option value="">Todas</option><option v-for="uf in ufs" :key="uf" :value="uf">{{ uf }}</option></select>
          </label>
          <button type="submit" class="tw:min-h-11 tw:rounded-lg tw:bg-emerald-800 tw:px-4 tw:font-semibold tw:text-white tw:hover:bg-emerald-900 tw:focus-visible:outline tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-emerald-700 tw:sm:col-span-3">Aplicar filtros</button>
        </form>

        <p class="tw:mt-5 tw:text-sm tw:text-slate-600" aria-live="polite">{{ loading ? 'Carregando…' : `${requests.length} solicitação(ões)` }}</p>
        <ul v-if="requests.length" class="tw:mt-3 tw:divide-y tw:divide-slate-200">
          <li v-for="item in requests" :key="item.id">
            <button type="button" class="tw:w-full tw:rounded-lg tw:px-3 tw:py-4 tw:text-left tw:transition tw:hover:bg-slate-50 tw:focus-visible:outline tw:focus-visible:outline-2 tw:focus-visible:outline-emerald-700" :class="selected?.id === item.id ? 'tw:bg-emerald-50' : ''" @click="openRequest(item)">
              <span class="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2">
                <span class="tw:font-semibold">{{ item.applicant?.name || item.applicant?.email }}</span>
                <span class="tw:rounded-full tw:bg-slate-100 tw:px-2.5 tw:py-1 tw:text-xs tw:font-semibold">{{ statusLabel(item.status) }}</span>
              </span>
              <span class="tw:mt-1 tw:block tw:text-sm tw:text-slate-600">{{ item.requestedOrganizationName }} · {{ item.municipalityName }}/{{ item.municipalityUf }}</span>
              <span class="tw:mt-1 tw:block tw:text-xs tw:text-slate-500">{{ item.applicant?.email }} · {{ new Date(item.createdAt).toLocaleDateString('pt-BR') }}</span>
            </button>
          </li>
        </ul>
        <p v-else-if="!loading" class="tw:mt-4 tw:rounded-xl tw:bg-slate-50 tw:p-5 tw:text-sm tw:text-slate-600">Nenhuma solicitação corresponde aos filtros.</p>
      </div>

      <section class="tw:min-h-72 tw:rounded-2xl tw:border tw:border-slate-200 tw:bg-white tw:p-4 tw:shadow-sm tw:sm:p-6" aria-label="Análise da solicitação">
        <p v-if="!selected && !detailLoading" class="tw:flex tw:min-h-56 tw:items-center tw:justify-center tw:text-center tw:text-sm tw:text-slate-500">Selecione uma solicitação para ver os dados e analisar.</p>
        <p v-else-if="detailLoading" class="tw:animate-pulse tw:py-12 tw:text-center tw:text-sm tw:text-slate-500">Carregando os dados da solicitação…</p>
        <template v-else-if="selected">
          <div class="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-3">
            <div><p class="tw:text-sm tw:font-semibold tw:uppercase tw:tracking-wide tw:text-emerald-800">Detalhe da solicitação</p><h2 class="tw:mt-1 tw:text-xl tw:font-bold">{{ selected.applicant?.name }}</h2><p class="tw:text-sm tw:text-slate-600">{{ selected.applicant?.email }}</p></div>
            <span class="tw:rounded-full tw:bg-amber-100 tw:px-3 tw:py-1 tw:text-sm tw:font-semibold tw:text-amber-900">{{ statusLabel(selected.status) }}</span>
          </div>
          <dl class="tw:mt-5 tw:grid tw:gap-3 tw:rounded-xl tw:bg-slate-50 tw:p-4 tw:text-sm tw:sm:grid-cols-2">
            <div><dt class="tw:text-slate-500">CPF</dt><dd class="tw:font-medium">{{ selected.applicant?.cpf }}</dd></div>
            <div><dt class="tw:text-slate-500">Telefone</dt><dd class="tw:font-medium">{{ selected.applicant?.phone }}</dd></div>
            <div><dt class="tw:text-slate-500">Empresa informada</dt><dd class="tw:font-medium">{{ selected.requestedOrganizationName }}</dd></div>
            <div><dt class="tw:text-slate-500">Município informado</dt><dd class="tw:font-medium">{{ selected.municipalityName }}/{{ selected.municipalityUf }}</dd></div>
          </dl>
          <div v-if="selected.status === 'PENDING'" class="tw:mt-5 tw:space-y-4 tw:border-t tw:border-slate-200 tw:pt-5">
            <div class="tw:flex tw:flex-wrap tw:gap-4 tw:text-sm">
              <label class="tw:inline-flex tw:items-center tw:gap-2"><input v-model="decision.target" type="radio" value="new" /> Criar empresa</label>
              <label class="tw:inline-flex tw:items-center tw:gap-2"><input v-model="decision.target" type="radio" value="existing" /> Usar empresa existente</label>
            </div>
            <label v-if="decision.target === 'new'" class="tw:block tw:text-sm tw:font-medium">Nome aprovado da empresa
              <input v-model.trim="decision.organizationName" required maxlength="120" class="tw:mt-1.5 tw:min-h-11 tw:w-full tw:rounded-lg tw:border tw:border-slate-300 tw:px-3 tw:outline-none tw:focus:border-emerald-700 tw:focus:ring-2 tw:focus:ring-emerald-700/20" />
            </label>
            <label v-if="decision.target === 'new'" class="tw:block tw:text-sm tw:font-medium">CNPJ (14 dígitos)
              <input v-model="decision.taxId" required inputmode="numeric" maxlength="18" class="tw:mt-1.5 tw:min-h-11 tw:w-full tw:rounded-lg tw:border tw:border-slate-300 tw:px-3 tw:outline-none tw:focus:border-emerald-700 tw:focus:ring-2 tw:focus:ring-emerald-700/20" />
            </label>
            <label v-if="decision.target === 'existing'" class="tw:block tw:text-sm tw:font-medium">Empresa
              <select v-model="decision.organizationId" required class="tw:mt-1.5 tw:min-h-11 tw:w-full tw:rounded-lg tw:border tw:border-slate-300 tw:bg-white tw:px-3 tw:outline-none tw:focus:border-emerald-700 tw:focus:ring-2 tw:focus:ring-emerald-700/20" @change="chooseOrganization"><option disabled value="">Selecione uma empresa</option><option v-for="organization in organizations" :key="organization.id" :value="organization.id">{{ organization.name }}{{ organization.municipalityUf ? ` · ${organization.municipalityUf}` : '' }}</option></select>
            </label>
            <div class="tw:grid tw:gap-3 tw:sm:grid-cols-[1fr_8rem]">
              <label class="tw:text-sm tw:font-medium">Município confirmado
                <input v-model.trim="decision.municipalityName" required maxlength="100" class="tw:mt-1.5 tw:min-h-11 tw:w-full tw:rounded-lg tw:border tw:border-slate-300 tw:px-3 tw:outline-none tw:focus:border-emerald-700 tw:focus:ring-2 tw:focus:ring-emerald-700/20" />
              </label>
              <label class="tw:text-sm tw:font-medium">UF
                <select v-model="decision.municipalityUf" required class="tw:mt-1.5 tw:min-h-11 tw:w-full tw:rounded-lg tw:border tw:border-slate-300 tw:bg-white tw:px-3 tw:outline-none tw:focus:border-emerald-700 tw:focus:ring-2 tw:focus:ring-emerald-700/20"><option v-for="uf in ufs" :key="uf" :value="uf">{{ uf }}</option></select>
              </label>
            </div>
            <p class="tw:text-xs tw:leading-5 tw:text-slate-500">Código IBGE e limite municipal oficial podem ser configurados depois nas informações da empresa; este formulário não inventa limites geográficos.</p>
            <div class="tw:flex tw:flex-wrap tw:gap-3">
              <button type="button" class="tw:min-h-11 tw:rounded-lg tw:bg-emerald-800 tw:px-4 tw:font-semibold tw:text-white tw:hover:bg-emerald-900 tw:focus-visible:outline tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-emerald-700 tw:disabled:opacity-60" :disabled="saving" @click="approve">{{ saving ? 'Salvando…' : 'Aprovar como gestor' }}</button>
            </div>
            <label class="tw:block tw:text-sm tw:font-medium">Justificativa para rejeição
              <textarea v-model="decision.rejectionReason" rows="3" minlength="10" maxlength="1000" class="tw:mt-1.5 tw:w-full tw:rounded-lg tw:border tw:border-slate-300 tw:px-3 tw:py-2 tw:outline-none tw:focus:border-emerald-700 tw:focus:ring-2 tw:focus:ring-emerald-700/20"></textarea>
            </label>
            <button type="button" class="tw:min-h-11 tw:rounded-lg tw:border tw:border-amber-600 tw:px-4 tw:font-semibold tw:text-amber-900 tw:hover:bg-amber-50 tw:focus-visible:outline tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-amber-700 tw:disabled:opacity-60" :disabled="saving" @click="reject">Rejeitar solicitação</button>
          </div>
          <div v-if="selected.rejectionReason" class="tw:mt-5 tw:rounded-lg tw:border tw:border-amber-200 tw:bg-amber-50 tw:p-4 tw:text-sm"><strong>Justificativa registrada:</strong> {{ selected.rejectionReason }}</div>
          <div v-if="selected.history?.length" class="tw:mt-6 tw:border-t tw:border-slate-200 tw:pt-5">
            <h3 class="tw:font-semibold">Histórico</h3>
            <ol class="tw:mt-3 tw:space-y-3 tw:text-sm">
              <li v-for="item in selected.history" :key="item.revision" class="tw:border-l-2 tw:border-emerald-200 tw:pl-3">
                <span class="tw:font-medium">{{ statusLabel(item.status) }} · revisão {{ item.revision }}</span>
                <span class="tw:block tw:text-slate-600">{{ item.requestedOrganizationName }} · {{ item.municipalityName }}/{{ item.municipalityUf }}</span>
                <span class="tw:block tw:text-xs tw:text-slate-500">{{ new Date(item.createdAt).toLocaleString('pt-BR') }}</span>
                <span v-if="item.reason" class="tw:block tw:text-slate-700">{{ item.reason }}</span>
              </li>
            </ol>
          </div>
        </template>
      </section>
    </section>
  </main>
</template>
