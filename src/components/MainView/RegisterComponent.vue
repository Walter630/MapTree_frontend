<template>
  <main class="tw:min-h-screen tw:bg-white tw:text-slate-900 tw:lg:grid tw:lg:grid-cols-[43%_57%]">
    <section class="tw:flex tw:min-h-screen tw:flex-col tw:px-6 tw:py-6 tw:sm:px-10 tw:lg:px-16">
      <a href="/" class="tw:inline-flex tw:w-fit tw:items-center tw:gap-3" aria-label="MapTree, início">
        <img src="/icons/LogoMapTree.png" alt="" class="tw:h-11 tw:w-12 tw:object-contain" />
        <span class="tw:text-lg tw:font-bold tw:tracking-tight">MapTree</span>
      </a>

      <div class="tw:mx-auto tw:flex tw:w-full tw:max-w-xl tw:flex-1 tw:flex-col tw:justify-center tw:py-10">
        <p class="tw:mb-2 tw:text-sm tw:font-semibold tw:uppercase tw:tracking-[0.14em] tw:text-emerald-700">Acesso à plataforma</p>
        <h1 class="tw:text-3xl tw:font-bold tw:tracking-tight tw:sm:text-4xl">Solicite acesso como gestor</h1>
        <p class="tw:mt-3 tw:text-sm tw:leading-6 tw:text-slate-600">
          Enviaremos seus dados para análise da equipe MapTree. Você poderá acompanhar a solicitação depois de entrar.
        </p>

        <div v-if="submitted" class="tw:mt-8 tw:rounded-2xl tw:border tw:border-emerald-200 tw:bg-emerald-50 tw:p-5" role="status" aria-live="polite">
          <h2 class="tw:font-semibold tw:text-emerald-950">Cadastro recebido</h2>
          <p class="tw:mt-2 tw:text-sm tw:leading-6 tw:text-emerald-900">
            Sua solicitação será analisada pela equipe MapTree. Entre com seu e-mail e senha para acompanhar o andamento.
          </p>
          <button type="button" class="tw:mt-5 tw:rounded-lg tw:bg-emerald-800 tw:px-5 tw:py-3 tw:text-sm tw:font-semibold tw:text-white tw:hover:bg-emerald-900 tw:focus-visible:outline tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-emerald-700" @click="router.push('/login')">
            Ir para o login
          </button>
        </div>

        <form v-else class="tw:mt-7 tw:space-y-4" @submit.prevent="registrar">
          <div v-if="feedback" class="tw:rounded-lg tw:border tw:border-red-200 tw:bg-red-50 tw:px-4 tw:py-3 tw:text-sm tw:text-red-800" role="alert" aria-live="assertive">
            {{ feedback }}
          </div>

          <div class="tw:grid tw:gap-4 tw:sm:grid-cols-2">
            <label class="tw:block tw:text-sm tw:font-medium tw:sm:col-span-2" for="manager-name">
              Nome completo
              <input id="manager-name" v-model.trim="formData.name" autocomplete="name" required maxlength="120" class="tw:mt-1.5 tw:min-h-12 tw:w-full tw:rounded-lg tw:border tw:border-slate-300 tw:px-3.5 tw:text-base tw:outline-none tw:transition tw:focus:border-emerald-700 tw:focus:ring-2 tw:focus:ring-emerald-700/20" />
            </label>
            <label class="tw:block tw:text-sm tw:font-medium" for="cpf-input">
              CPF
              <input id="cpf-input" v-model="cpfInput" autocomplete="off" inputmode="numeric" maxlength="14" required aria-describedby="cpf-hint" class="tw:mt-1.5 tw:min-h-12 tw:w-full tw:rounded-lg tw:border tw:border-slate-300 tw:px-3.5 tw:text-base tw:outline-none tw:transition tw:focus:border-emerald-700 tw:focus:ring-2 tw:focus:ring-emerald-700/20" />
              <span id="cpf-hint" class="tw:sr-only">Digite os onze números do CPF.</span>
            </label>
            <label class="tw:block tw:text-sm tw:font-medium" for="phone-input">
              Telefone com DDD
              <input id="phone-input" v-model="phoneInput" autocomplete="tel" inputmode="tel" maxlength="15" required class="tw:mt-1.5 tw:min-h-12 tw:w-full tw:rounded-lg tw:border tw:border-slate-300 tw:px-3.5 tw:text-base tw:outline-none tw:transition tw:focus:border-emerald-700 tw:focus:ring-2 tw:focus:ring-emerald-700/20" />
            </label>
            <label class="tw:block tw:text-sm tw:font-medium tw:sm:col-span-2" for="manager-email">
              E-mail
              <input id="manager-email" v-model.trim="formData.email" autocomplete="email" type="email" required maxlength="254" class="tw:mt-1.5 tw:min-h-12 tw:w-full tw:rounded-lg tw:border tw:border-slate-300 tw:px-3.5 tw:text-base tw:outline-none tw:transition tw:focus:border-emerald-700 tw:focus:ring-2 tw:focus:ring-emerald-700/20" />
            </label>
            <label class="tw:block tw:text-sm tw:font-medium tw:sm:col-span-2" for="organization-name">
              Empresa
              <input id="organization-name" v-model.trim="formData.requestedOrganizationName" autocomplete="organization" required maxlength="120" class="tw:mt-1.5 tw:min-h-12 tw:w-full tw:rounded-lg tw:border tw:border-slate-300 tw:px-3.5 tw:text-base tw:outline-none tw:transition tw:focus:border-emerald-700 tw:focus:ring-2 tw:focus:ring-emerald-700/20" />
            </label>
            <label class="tw:block tw:text-sm tw:font-medium" for="municipality-name">
              Município
              <input id="municipality-name" v-model.trim="formData.municipalityName" autocomplete="address-level2" required maxlength="100" class="tw:mt-1.5 tw:min-h-12 tw:w-full tw:rounded-lg tw:border tw:border-slate-300 tw:px-3.5 tw:text-base tw:outline-none tw:transition tw:focus:border-emerald-700 tw:focus:ring-2 tw:focus:ring-emerald-700/20" />
            </label>
            <label class="tw:block tw:text-sm tw:font-medium" for="municipality-uf">
              UF
              <select id="municipality-uf" v-model="formData.municipalityUf" required class="tw:mt-1.5 tw:min-h-12 tw:w-full tw:rounded-lg tw:border tw:border-slate-300 tw:bg-white tw:px-3.5 tw:text-base tw:outline-none tw:transition tw:focus:border-emerald-700 tw:focus:ring-2 tw:focus:ring-emerald-700/20">
                <option disabled value="">Selecione</option>
                <option v-for="uf in ufs" :key="uf" :value="uf">{{ uf }}</option>
              </select>
            </label>
            <label class="tw:block tw:text-sm tw:font-medium tw:sm:col-span-2" for="manager-password">
              Senha
              <input id="manager-password" v-model="formData.password" autocomplete="new-password" type="password" minlength="8" maxlength="72" required class="tw:mt-1.5 tw:min-h-12 tw:w-full tw:rounded-lg tw:border tw:border-slate-300 tw:px-3.5 tw:text-base tw:outline-none tw:transition tw:focus:border-emerald-700 tw:focus:ring-2 tw:focus:ring-emerald-700/20" />
              <span class="tw:mt-1 tw:block tw:text-xs tw:font-normal tw:text-slate-500">Use pelo menos 8 caracteres.</span>
            </label>
          </div>

          <button type="submit" class="tw:flex tw:min-h-12 tw:w-full tw:items-center tw:justify-center tw:gap-2 tw:rounded-lg tw:bg-lime-300 tw:px-5 tw:font-semibold tw:text-slate-950 tw:transition tw:hover:bg-lime-400 tw:focus-visible:outline tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-emerald-700 tw:disabled:cursor-wait tw:disabled:opacity-60" :disabled="loading">
            <span v-if="loading" class="tw:h-4 tw:w-4 tw:animate-spin tw:rounded-full tw:border-2 tw:border-slate-800 tw:border-t-transparent" aria-hidden="true"></span>
            {{ loading ? 'Enviando solicitação…' : 'Solicitar acesso' }}
          </button>
          <p class="tw:text-center tw:text-sm tw:text-slate-600">
            Já possui uma conta?
            <a href="/login" class="tw:font-semibold tw:text-emerald-800 tw:underline tw:underline-offset-2" @click.prevent="router.push('/login')">Fazer login</a>
          </p>
        </form>
      </div>
      <p class="tw:mx-auto tw:w-full tw:max-w-xl tw:pb-2 tw:text-xs tw:text-slate-500">MapTree · Gestão de árvores e planejamento de podas preventivas</p>
    </section>

    <aside class="tw:hidden tw:min-h-screen tw:flex-col tw:justify-between tw:overflow-hidden tw:bg-gradient-to-br tw:from-emerald-500 tw:via-lime-400 tw:to-emerald-950 tw:p-12 tw:text-white tw:lg:flex tw:xl:p-16">
      <div class="tw:flex tw:gap-3 tw:text-sm tw:font-medium">
        <span class="tw:rounded-full tw:border tw:border-white/40 tw:bg-white/10 tw:px-4 tw:py-2">Monitoramento</span>
        <span class="tw:rounded-full tw:border tw:border-white/40 tw:bg-white/10 tw:px-4 tw:py-2">Mapas</span>
        <span class="tw:rounded-full tw:border tw:border-white/40 tw:bg-white/10 tw:px-4 tw:py-2">Equipes</span>
      </div>
      <div class="tw:max-w-xl">
        <div class="tw:mb-8 tw:grid tw:grid-cols-2 tw:gap-4 tw:opacity-90" aria-hidden="true">
          <div class="tw:rounded-2xl tw:border tw:border-white/30 tw:bg-white/15 tw:p-5 tw:backdrop-blur">
            <div class="tw:mb-4 tw:h-2 tw:w-2/3 tw:rounded tw:bg-white/70"></div><div class="tw:space-y-2"><div class="tw:h-2 tw:rounded tw:bg-white/30"></div><div class="tw:h-2 tw:w-4/5 tw:rounded tw:bg-white/30"></div><div class="tw:h-2 tw:w-3/5 tw:rounded tw:bg-white/30"></div></div>
          </div>
          <div class="tw:flex tw:items-end tw:gap-2 tw:rounded-2xl tw:border tw:border-white/30 tw:bg-white/15 tw:p-5 tw:backdrop-blur"><span class="tw:h-8 tw:flex-1 tw:rounded-t tw:bg-white/35"></span><span class="tw:h-14 tw:flex-1 tw:rounded-t tw:bg-white/60"></span><span class="tw:h-11 tw:flex-1 tw:rounded-t tw:bg-white/45"></span><span class="tw:h-20 tw:flex-1 tw:rounded-t tw:bg-white/80"></span></div>
        </div>
        <h2 class="tw:text-4xl tw:font-bold tw:leading-tight tw:xl:text-5xl">Gestão inteligente de vegetação</h2>
        <p class="tw:mt-5 tw:max-w-lg tw:text-lg tw:leading-8 tw:text-white/90">Organize a localização, as condições e o histórico de manutenção para planejar o trabalho das equipes.</p>
      </div>
      <span class="tw:self-end tw:text-xl tw:font-bold tw:tracking-tight">MapTree</span>
    </aside>
  </main>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useRouter } from 'vue-router'
import { formatCpf, formatPhone, onlyDigits } from '@/utils/masks'

const BRAZIL_UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

export default defineComponent({
  name: 'CadastroComponent',
  setup() { return { router: useRouter() } },
  data() {
    return {
      ufs: BRAZIL_UFS,
      formData: { name: '', cpf: '', phone: '', email: '', password: '', requestedOrganizationName: '', municipalityName: '', municipalityUf: '' },
      loading: false,
      submitted: false,
      feedback: '',
    }
  },
  computed: {
    cpfInput: {
      get(): string { return this.formData.cpf },
      set(value: string) { this.formData.cpf = formatCpf(value) },
    },
    phoneInput: {
      get(): string { return this.formData.phone },
      set(value: string) { this.formData.phone = formatPhone(value) },
    },
  },
  methods: {
    async registrar() {
      this.feedback = ''
      if (this.formData.password.length < 8) {
        this.feedback = 'A senha deve ter pelo menos 8 caracteres.'
        return
      }
      const digitsCpf = onlyDigits(this.formData.cpf)
      const digitsPhone = onlyDigits(this.formData.phone)
      if (digitsCpf.length !== 11) {
        this.feedback = 'Informe os onze números do CPF.'
        return
      }
      if (![10, 11].includes(digitsPhone.length)) {
        this.feedback = 'Informe um telefone brasileiro com DDD.'
        return
      }
      this.loading = true
      try {
        const response = await this.$api.post('/auth/manager-requests', {
          name: this.formData.name.trim(),
          cpf: digitsCpf,
          phone: digitsPhone,
          email: this.formData.email.trim().toLowerCase(),
          password: this.formData.password,
          requestedOrganizationName: this.formData.requestedOrganizationName.trim(),
          municipalityName: this.formData.municipalityName.trim(),
          municipalityUf: this.formData.municipalityUf,
        })
        if (response.status === 202 || response.status === 201) this.submitted = true
        else this.feedback = 'Não foi possível enviar a solicitação. Tente novamente.'
      } catch (error) {
        this.feedback = this.getRegisterErrorMessage(error)
      } finally {
        this.loading = false
      }
    },
    getRegisterErrorMessage(error: unknown): string {
      const err = error as { response?: { status?: number; data?: { message?: string | string[] } } }
      if (!err.response) return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
      const status = err.response.status
      const backendMsg = err.response.data?.message
      const message = Array.isArray(backendMsg) ? backendMsg.join(', ') : backendMsg
      if (status === 409) return message || 'E-mail ou CPF já cadastrado.'
      if (status === 400) return message || 'Confira os dados informados.'
      if (status && status >= 500) return 'Erro no servidor. Tente novamente em instantes.'
      return message || 'Não foi possível enviar a solicitação.'
    },
  },
})
</script>
