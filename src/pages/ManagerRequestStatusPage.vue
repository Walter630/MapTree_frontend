<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiConnect, type ManagerRequest } from '@/plugins/apiConnect'
import { formatPhone, onlyDigits } from '@/utils/masks'

const router = useRouter()
const request = ref<ManagerRequest | null>(null)
const loading = ref(true)
const submitting = ref(false)
const error = ref('')
const notice = ref('')
const form = reactive({
  name: '',
  phone: '',
  requestedOrganizationName: '',
  municipalityName: '',
  municipalityUf: '',
})
const phoneInput = computed({
  get: () => form.phone,
  set: (value: string) => { form.phone = formatPhone(value) },
})
const canEdit = computed(() => request.value?.status === 'REJECTED')

function syncForm(data: ManagerRequest) {
  form.name = data.applicant?.name ?? ''
  form.phone = formatPhone(data.applicant?.phone ?? '')
  form.requestedOrganizationName = data.requestedOrganizationName
  form.municipalityName = data.municipalityName
  form.municipalityUf = data.municipalityUf
}

async function load() {
  loading.value = true
  error.value = ''
  notice.value = ''
  try {
    const { data } = await apiConnect.get<ManagerRequest>('/users/me/manager-request')
    request.value = data
    syncForm(data)
  } catch (cause) {
    error.value = apiMessage(cause, 'Não foi possível carregar a solicitação. Tente novamente.')
  } finally {
    loading.value = false
  }
}

function apiMessage(cause: unknown, fallback: string) {
  const response = (cause as { response?: { data?: { message?: string | string[] } } })?.response
  const message = response?.data?.message
  return Array.isArray(message) ? message.join(' ') : message || fallback
}

async function resubmit() {
  error.value = ''
  notice.value = ''
  if (!form.name.trim() || !form.requestedOrganizationName.trim() || !form.municipalityName.trim() || !form.municipalityUf) {
    error.value = 'Preencha nome, empresa e município para reenviar.'
    return
  }
  const phone = onlyDigits(form.phone)
  if (![10, 11].includes(phone.length)) {
    error.value = 'Informe um telefone com DDD.'
    return
  }
  submitting.value = true
  try {
    const { data } = await apiConnect.patch<ManagerRequest>('/users/me/manager-request', {
      name: form.name.trim(),
      phone,
      requestedOrganizationName: form.requestedOrganizationName.trim(),
      municipalityName: form.municipalityName.trim(),
      municipalityUf: form.municipalityUf,
    })
    request.value = data
    syncForm(data)
    notice.value = 'Correção enviada. Sua solicitação voltou para análise.'
  } catch (cause) {
    error.value = apiMessage(cause, 'Não foi possível reenviar a solicitação.')
  } finally {
    submitting.value = false
  }
}

async function logout() {
  await apiConnect.logout()
  router.push('/login')
}

const statusLabel = computed(() => {
  if (request.value?.status === 'APPROVED') return 'Aprovada'
  if (request.value?.status === 'REJECTED') return 'Precisa de ajustes'
  return 'Em análise'
})
const statusClasses = computed(() => request.value?.status === 'REJECTED'
  ? 'tw:bg-amber-100 tw:text-amber-900'
  : request.value?.status === 'APPROVED'
    ? 'tw:bg-emerald-100 tw:text-emerald-900'
    : 'tw:bg-sky-100 tw:text-sky-900')

onMounted(load)
</script>

<template>
  <main class="tw:min-h-screen tw:bg-slate-50 tw:px-4 tw:py-10 tw:text-slate-900 tw:sm:px-6">
    <section class="tw:mx-auto tw:max-w-3xl">
      <header class="tw:mb-8 tw:flex tw:items-center tw:justify-between tw:gap-4">
        <a href="/" class="tw:inline-flex tw:items-center tw:gap-3" aria-label="MapTree, início">
          <img src="/icons/LogoMapTree.png" alt="" class="tw:h-10 tw:w-11 tw:object-contain" />
          <span class="tw:text-lg tw:font-bold">MapTree</span>
        </a>
        <button type="button" class="tw:rounded-lg tw:border tw:border-slate-300 tw:px-4 tw:py-2 tw:text-sm tw:font-semibold tw:hover:bg-white tw:focus-visible:outline tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-emerald-700" @click="logout">Sair</button>
      </header>

      <div class="tw:rounded-2xl tw:border tw:border-slate-200 tw:bg-white tw:p-5 tw:shadow-sm tw:sm:p-8">
        <div class="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-4">
          <div>
            <p class="tw:text-sm tw:font-semibold tw:uppercase tw:tracking-wide tw:text-emerald-800">Acompanhamento</p>
            <h1 class="tw:mt-1 tw:text-2xl tw:font-bold tw:sm:text-3xl">Solicitação de gestor</h1>
          </div>
          <button type="button" class="tw:rounded-lg tw:border tw:border-slate-300 tw:px-4 tw:py-2 tw:text-sm tw:font-semibold tw:hover:bg-slate-50 tw:focus-visible:outline tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-emerald-700" :disabled="loading" @click="load">Atualizar situação</button>
        </div>

        <p v-if="error" class="tw:mt-6 tw:rounded-lg tw:border tw:border-red-200 tw:bg-red-50 tw:p-4 tw:text-sm tw:text-red-800" role="alert">{{ error }}</p>
        <p v-if="notice" class="tw:mt-6 tw:rounded-lg tw:border tw:border-emerald-200 tw:bg-emerald-50 tw:p-4 tw:text-sm tw:text-emerald-900" role="status" aria-live="polite">{{ notice }}</p>
        <div v-if="loading" class="tw:mt-8 tw:animate-pulse tw:space-y-4" aria-label="Carregando solicitação"><div class="tw:h-5 tw:w-1/3 tw:rounded tw:bg-slate-200"></div><div class="tw:h-20 tw:rounded tw:bg-slate-100"></div></div>

        <template v-else-if="request">
          <div class="tw:mt-7 tw:rounded-xl tw:bg-slate-50 tw:p-5">
            <div class="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3">
              <h2 class="tw:text-lg tw:font-semibold">{{ statusLabel }}</h2>
              <span class="tw:rounded-full tw:px-3 tw:py-1 tw:text-sm tw:font-semibold" :class="statusClasses">{{ request.status }}</span>
            </div>
            <p class="tw:mt-2 tw:text-sm tw:text-slate-600">Enviada em {{ new Date(request.createdAt).toLocaleDateString('pt-BR') }} · versão {{ request.version }}</p>
            <dl class="tw:mt-5 tw:grid tw:gap-4 tw:text-sm tw:sm:grid-cols-2">
              <div><dt class="tw:font-medium tw:text-slate-500">Empresa</dt><dd class="tw:mt-1 tw:font-semibold">{{ request.requestedOrganizationName }}</dd></div>
              <div><dt class="tw:font-medium tw:text-slate-500">Município</dt><dd class="tw:mt-1 tw:font-semibold">{{ request.municipalityName }} / {{ request.municipalityUf }}</dd></div>
            </dl>
          </div>

          <div v-if="request.status === 'PENDING'" class="tw:mt-6 tw:rounded-xl tw:border tw:border-sky-200 tw:bg-sky-50 tw:p-5 tw:text-sm tw:leading-6 tw:text-sky-950">
            A equipe MapTree está analisando os dados enviados. Você pode entrar novamente nesta página para conferir a atualização.
          </div>
          <div v-if="request.status === 'APPROVED'" class="tw:mt-6 tw:rounded-xl tw:border tw:border-emerald-200 tw:bg-emerald-50 tw:p-5 tw:text-sm tw:leading-6 tw:text-emerald-950">
            A solicitação foi aprovada. Saia e entre novamente para carregar o acesso da empresa.
          </div>
          <div v-if="request.status === 'REJECTED'" class="tw:mt-6 tw:rounded-xl tw:border tw:border-amber-300 tw:bg-amber-50 tw:p-5 tw:text-sm tw:leading-6 tw:text-amber-950">
            <h2 class="tw:font-semibold">Justificativa da equipe</h2>
            <p class="tw:mt-1">{{ request.rejectionReason || 'A equipe pediu uma correção nos dados.' }}</p>
          </div>

          <form v-if="canEdit" class="tw:mt-7 tw:space-y-4 tw:border-t tw:border-slate-200 tw:pt-6" @submit.prevent="resubmit">
            <h2 class="tw:text-lg tw:font-semibold">Corrigir e reenviar</h2>
            <div class="tw:grid tw:gap-4 tw:sm:grid-cols-2">
              <label class="tw:text-sm tw:font-medium tw:sm:col-span-2">Nome
                <input v-model.trim="form.name" required maxlength="120" class="tw:mt-1.5 tw:min-h-12 tw:w-full tw:rounded-lg tw:border tw:border-slate-300 tw:px-3 tw:outline-none tw:focus:border-emerald-700 tw:focus:ring-2 tw:focus:ring-emerald-700/20" />
              </label>
              <label class="tw:text-sm tw:font-medium">Telefone
                <input v-model="phoneInput" required inputmode="tel" maxlength="15" class="tw:mt-1.5 tw:min-h-12 tw:w-full tw:rounded-lg tw:border tw:border-slate-300 tw:px-3 tw:outline-none tw:focus:border-emerald-700 tw:focus:ring-2 tw:focus:ring-emerald-700/20" />
              </label>
              <label class="tw:text-sm tw:font-medium">UF
                <input v-model.trim="form.municipalityUf" required maxlength="2" pattern="[A-Z]{2}" class="tw:mt-1.5 tw:min-h-12 tw:w-full tw:rounded-lg tw:border tw:border-slate-300 tw:px-3 tw:uppercase tw:outline-none tw:focus:border-emerald-700 tw:focus:ring-2 tw:focus:ring-emerald-700/20" />
              </label>
              <label class="tw:text-sm tw:font-medium tw:sm:col-span-2">Empresa
                <input v-model.trim="form.requestedOrganizationName" required maxlength="120" class="tw:mt-1.5 tw:min-h-12 tw:w-full tw:rounded-lg tw:border tw:border-slate-300 tw:px-3 tw:outline-none tw:focus:border-emerald-700 tw:focus:ring-2 tw:focus:ring-emerald-700/20" />
              </label>
              <label class="tw:text-sm tw:font-medium tw:sm:col-span-2">Município
                <input v-model.trim="form.municipalityName" required maxlength="100" class="tw:mt-1.5 tw:min-h-12 tw:w-full tw:rounded-lg tw:border tw:border-slate-300 tw:px-3 tw:outline-none tw:focus:border-emerald-700 tw:focus:ring-2 tw:focus:ring-emerald-700/20" />
              </label>
            </div>
            <button type="submit" class="tw:min-h-12 tw:rounded-lg tw:bg-lime-300 tw:px-5 tw:font-semibold tw:text-slate-950 tw:hover:bg-lime-400 tw:focus-visible:outline tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-emerald-700 tw:disabled:opacity-60" :disabled="submitting">{{ submitting ? 'Enviando…' : 'Reenviar solicitação' }}</button>
          </form>
        </template>
      </div>
    </section>
  </main>
</template>
