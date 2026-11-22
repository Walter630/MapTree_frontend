<template>
  <main class="tw:min-h-screen tw:bg-white tw:text-slate-900 tw:lg:grid tw:lg:grid-cols-[43%_57%]">
    <section class="tw:flex tw:min-h-screen tw:flex-col tw:px-6 tw:py-6 tw:sm:px-10 tw:lg:px-16">
      <a
        href="/"
        class="tw:inline-flex tw:w-fit tw:items-center tw:gap-3 tw:text-slate-900 tw:no-underline"
        aria-label="MapTree, início"
        @click.prevent="$router.push('/')"
      >
        <img src="/icons/LogoMapTree.png" alt="" class="tw:h-11 tw:w-12 tw:object-contain" />
        <span class="tw:text-lg tw:font-bold tw:tracking-tight">MapTree</span>
      </a>

      <div class="tw:mx-auto tw:flex tw:w-full tw:max-w-md tw:flex-1 tw:flex-col tw:justify-center tw:py-10">
        <p class="tw:mb-2 tw:text-sm tw:font-semibold tw:uppercase tw:tracking-[0.14em] tw:text-emerald-700">
          Acesso à plataforma
        </p>
        <h1 class="tw:text-3xl tw:font-bold tw:tracking-tight tw:sm:text-4xl">
          {{ pendingGoogleCredential ? 'Confirme o vínculo com Google' : 'Acesse sua conta' }}
        </h1>
        <p class="tw:mt-3 tw:text-sm tw:leading-6 tw:text-slate-600">
          {{ pendingGoogleCredential
            ? 'Digite a senha da sua conta MapTree para concluir o vínculo com segurança.'
            : 'Entre para consultar as árvores, acompanhar sua equipe e planejar atividades.' }}
        </p>

        <div
          v-if="$route.query.reason === 'session-unavailable'"
          class="tw:mt-6 tw:rounded-xl tw:border tw:border-sky-200 tw:bg-sky-50 tw:px-4 tw:py-3 tw:text-sm tw:text-sky-900"
          role="status"
          aria-live="polite"
        >
          <p>Não foi possível validar sua sessão agora. Ela foi preservada; tente novamente quando a conexão voltar.</p>
          <button
            type="button"
            class="tw:mt-2 tw:font-semibold tw:underline tw:underline-offset-2 tw:focus-visible:rounded tw:focus-visible:outline tw:focus-visible:outline-2 tw:focus-visible:outline-sky-700"
            @click="$router.push('/')"
          >
            Tentar acessar meu painel
          </button>
        </div>

        <div
          v-if="feedback.show"
          class="tw:mt-5 tw:rounded-xl tw:border tw:border-red-200 tw:bg-red-50 tw:px-4 tw:py-3 tw:text-sm tw:text-red-800"
          role="alert"
          aria-live="assertive"
        >
          {{ feedback.message }}
        </div>

        <form class="tw:mt-7 tw:space-y-5" novalidate @submit.prevent="login">
          <label
            v-if="!pendingGoogleCredential"
            for="login-email"
            class="tw:block tw:text-sm tw:font-medium tw:text-slate-800"
          >
            E-mail
            <input
              id="login-email"
              v-model.trim="username"
              type="email"
              name="email"
              autocomplete="username"
              required
              class="tw:mt-1.5 tw:min-h-12 tw:w-full tw:rounded-lg tw:border tw:border-slate-300 tw:bg-white tw:px-3.5 tw:text-base tw:text-slate-900 tw:outline-none tw:transition tw:placeholder:text-slate-400 tw:focus:border-emerald-700 tw:focus:ring-2 tw:focus:ring-emerald-700/20"
              placeholder="voce@empresa.com.br"
            />
          </label>

          <div class="tw:text-sm tw:font-medium tw:text-slate-800">
            <label for="login-password">
              {{ pendingGoogleCredential ? 'Senha da conta MapTree' : 'Senha' }}
            </label>
            <span class="tw:relative tw:mt-1.5 tw:block">
              <input
                id="login-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                name="password"
                autocomplete="current-password"
                required
                class="tw:min-h-12 tw:w-full tw:rounded-lg tw:border tw:border-slate-300 tw:bg-white tw:px-3.5 tw:pr-24 tw:text-base tw:text-slate-900 tw:outline-none tw:transition tw:placeholder:text-slate-400 tw:focus:border-emerald-700 tw:focus:ring-2 tw:focus:ring-emerald-700/20"
                placeholder="Digite sua senha"
              />
              <button
                type="button"
                class="tw:absolute tw:inset-y-0 tw:right-1 tw:my-auto tw:flex tw:min-h-10 tw:min-w-10 tw:items-center tw:justify-center tw:rounded tw:px-1 tw:text-xs tw:font-semibold tw:text-emerald-800 tw:underline tw:underline-offset-2 tw:focus-visible:outline tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-emerald-700"
                :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'"
                :aria-pressed="showPassword"
                aria-controls="login-password"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? 'Ocultar' : 'Mostrar' }}
              </button>
            </span>
          </div>

          <button
            type="submit"
            class="tw:flex tw:min-h-12 tw:w-full tw:items-center tw:justify-center tw:gap-2 tw:rounded-lg tw:bg-lime-300 tw:px-5 tw:font-semibold tw:text-slate-950 tw:transition tw:hover:bg-lime-400 tw:focus-visible:outline tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-emerald-700 tw:disabled:cursor-wait tw:disabled:opacity-60"
            :disabled="loading"
            :aria-busy="loading"
          >
            <span
              v-if="loading"
              class="tw:h-4 tw:w-4 tw:animate-spin tw:rounded-full tw:border-2 tw:border-slate-800 tw:border-t-transparent"
              aria-hidden="true"
            ></span>
            {{ loading ? 'Entrando…' : pendingGoogleCredential ? 'Vincular Google' : 'Entrar' }}
          </button>

          <button
            v-if="pendingGoogleCredential"
            type="button"
            class="tw:mx-auto tw:block tw:rounded tw:px-3 tw:py-2 tw:text-sm tw:font-semibold tw:text-slate-600 tw:underline tw:underline-offset-2 tw:hover:text-slate-900 tw:focus-visible:outline tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-emerald-700"
            :disabled="loading"
            @click="cancelGoogleLink"
          >
            Cancelar vínculo
          </button>
        </form>

        <div v-if="!pendingGoogleCredential" class="tw:mt-6">
          <div class="tw:flex tw:items-center tw:gap-4 tw:text-sm tw:text-slate-500">
            <span class="tw:h-px tw:flex-1 tw:bg-slate-200"></span>
            <span>ou</span>
            <span class="tw:h-px tw:flex-1 tw:bg-slate-200"></span>
          </div>

          <div
            v-if="googleEnabled"
            ref="googleButton"
            class="google-button-frame tw:mt-5 tw:flex tw:min-h-11 tw:w-full tw:min-w-0 tw:max-w-full tw:justify-center tw:overflow-hidden"
            :class="{ 'google-button-frame--loading': loading }"
            :aria-busy="loading"
            aria-label="Entrar com Google"
          ></div>
          <p v-else class="tw:mt-4 tw:text-center tw:text-xs tw:leading-5 tw:text-slate-500">
            Login com Google indisponível: configure o Client ID da aplicação.
          </p>
        </div>

        <p v-if="!pendingGoogleCredential" class="tw:mt-7 tw:text-center tw:text-sm tw:text-slate-600">
          <a
            href="/recovery"
            class="tw:font-semibold tw:text-emerald-800 tw:underline tw:underline-offset-2 tw:hover:text-emerald-950 tw:focus-visible:rounded tw:focus-visible:outline tw:focus-visible:outline-2 tw:focus-visible:outline-emerald-700"
            @click.prevent="$router.push('/recovery')"
          >
            Esqueceu sua senha?
          </a>
        </p>

        <p v-if="!pendingGoogleCredential" class="tw:mt-7 tw:text-center tw:text-sm tw:text-slate-600">
          Ainda não tem acesso?
          <a
            href="/register"
            class="tw:font-semibold tw:text-emerald-800 tw:underline tw:underline-offset-2 tw:hover:text-emerald-950 tw:focus-visible:rounded tw:focus-visible:outline tw:focus-visible:outline-2 tw:focus-visible:outline-emerald-700"
            @click.prevent="$router.push('/register')"
          >
            Solicite acesso
          </a>
        </p>
      </div>

      <p class="tw:mx-auto tw:w-full tw:max-w-xl tw:pb-2 tw:text-xs tw:text-slate-500">
        MapTree · Gestão de árvores para planejar podas preventivas
      </p>
    </section>

    <aside class="tw:hidden tw:min-h-screen tw:flex-col tw:justify-between tw:overflow-hidden tw:bg-gradient-to-br tw:from-emerald-500 tw:via-lime-400 tw:to-emerald-950 tw:p-12 tw:text-white tw:lg:flex tw:xl:p-16">
      <div class="tw:flex tw:flex-wrap tw:gap-3 tw:text-sm tw:font-medium">
        <span class="tw:rounded-full tw:border tw:border-white/40 tw:bg-white/10 tw:px-4 tw:py-2">Monitoramento</span>
        <span class="tw:rounded-full tw:border tw:border-white/40 tw:bg-white/10 tw:px-4 tw:py-2">Mapas</span>
        <span class="tw:rounded-full tw:border tw:border-white/40 tw:bg-white/10 tw:px-4 tw:py-2">Equipes</span>
      </div>
      <div class="tw:max-w-xl">
        <div class="tw:mb-8 tw:grid tw:grid-cols-2 tw:gap-4 tw:opacity-90" aria-hidden="true">
          <div class="tw:rounded-2xl tw:border tw:border-white/30 tw:bg-white/15 tw:p-5 tw:backdrop-blur">
            <div class="tw:mb-4 tw:h-2 tw:w-2/3 tw:rounded tw:bg-white/70"></div>
            <div class="tw:space-y-2">
              <div class="tw:h-2 tw:rounded tw:bg-white/30"></div>
              <div class="tw:h-2 tw:w-4/5 tw:rounded tw:bg-white/30"></div>
              <div class="tw:h-2 tw:w-3/5 tw:rounded tw:bg-white/30"></div>
            </div>
          </div>
          <div class="tw:flex tw:items-end tw:gap-2 tw:rounded-2xl tw:border tw:border-white/30 tw:bg-white/15 tw:p-5 tw:backdrop-blur">
            <span class="tw:h-8 tw:flex-1 tw:rounded-t tw:bg-white/35"></span>
            <span class="tw:h-14 tw:flex-1 tw:rounded-t tw:bg-white/60"></span>
            <span class="tw:h-11 tw:flex-1 tw:rounded-t tw:bg-white/45"></span>
            <span class="tw:h-20 tw:flex-1 tw:rounded-t tw:bg-white/80"></span>
          </div>
        </div>
        <h2 class="tw:text-4xl tw:font-bold tw:leading-tight tw:xl:text-5xl">
          Gestão de árvores para planejar podas preventivas.
        </h2>
        <p class="tw:mt-5 tw:max-w-lg tw:text-lg tw:leading-8 tw:text-white/90">
          Organize a localização, as condições e o histórico de manutenção das árvores da sua região.
        </p>
      </div>
      <span class="tw:self-end tw:text-xl tw:font-bold tw:tracking-tight">MapTree</span>
    </aside>
  </main>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { isAxiosError } from 'axios'
import { getLoginErrorMessage } from '@/utils/loginError'
import { type LoginRequest, type LoginResponse } from '@/plugins/apiConnect.ts'
import { isGoogleAuthEnabled, renderGoogleButton } from '@/plugins/googleAuth'

export default defineComponent({
  name: 'LoginComponent',
  data() {
    return {
      username: '',
      password: '',
      showPassword: false,
      loading: false,
      isUnmounted: false,
      googleButtonCleanup: null as (() => void) | null,
      pendingGoogleCredential: '',
      feedback: {
        show: false,
        message: '',
        type: 'error' as 'error' | 'success',
      },
    }
  },
  mounted() {
    void this.mountGoogleButton()
  },
  beforeUnmount() {
    this.isUnmounted = true
    this.googleButtonCleanup?.()
  },
  methods: {
    getLoginErrorMessage,
    notify(message: string, type: 'error' | 'success' = 'error') {
      this.feedback.message = message
      this.feedback.type = type
      this.feedback.show = true
    },
    async mountGoogleButton() {
      if (!this.googleEnabled) return
      const container = this.$refs.googleButton as HTMLElement | undefined
      if (!container) return
      try {
        const cleanup = await renderGoogleButton(container, (credential) => {
          void this.loginWithGoogle(credential)
        })
        if (this.isUnmounted) cleanup()
        else this.googleButtonCleanup = cleanup
      } catch (error) {
        console.error('Google button initialization failed:', error)
        this.notify(this.getLoginErrorMessage(error))
      }
    },
    async login() {
      // Limpa feedback anterior
      this.feedback.show = false

      if (this.pendingGoogleCredential) {
        if (!this.password) {
          this.notify('Digite a senha da sua conta MapTree para concluir o vínculo.')
          return
        }
        await this.loginWithGoogle(this.pendingGoogleCredential, this.password)
        return
      }

      // Validação básica de campos vazios
      if (!this.username || !this.password) {
        this.notify('Preencha o e-mail e a senha para continuar.')
        return
      }

      this.loading = true
      try {
        const response = await this.$api.post<LoginResponse>('/auth/login', {
          email: this.username,
          password: this.password,
        } as LoginRequest)

        if (response.data) {
          // Save access token (refresh token comes via HTTP-only cookie) and user info in the store
          this.$api.setToken(response.data.accessToken)
          const user = await this.loadRequestAwareUser(response.data.user)
          this.$store.setUser(user)
          this.$router.push(this.getPostLoginRoute(user))
        }
      } catch (error) {
        console.error('Login failed:', error)
        this.notify(this.getLoginErrorMessage(error))
      } finally {
        this.loading = false
      }
    },
    async loadRequestAwareUser(user: LoginResponse['user']): Promise<LoginResponse['user']> {
      if (user.role !== 'USER' || typeof this.$api.get !== 'function') return user
      try {
        const { data } = await this.$api.get<LoginResponse['user']>('/users/me/profile')
        return { ...user, ...data }
      } catch {
        return user
      }
    },
    getPostLoginRoute(user: LoginResponse['user']): string {
      if (user.role === 'USER' && user.managerRequest) return '/cadastro/solicitacao'
      return `/${user.role.toLowerCase()}`
    },
    cancelGoogleLink() {
      this.pendingGoogleCredential = ''
      this.password = ''
      this.feedback.show = false
    },
    async loginWithGoogle(credential: string, password?: string) {
      this.feedback.show = false

      if (!credential || this.loading) {
        return
      }

      this.loading = true
      try {
        // O backend precisa validar a credencial e emitir a sessão MapTree.
        const response = await this.$api.post<LoginResponse>('/auth/google', {
          credential,
          ...(password ? { password } : {}),
        })

        if (response.data) {
          this.cancelGoogleLink()
          this.$api.setToken(response.data.accessToken)
          const user = await this.loadRequestAwareUser(response.data.user)
          this.$store.setUser(user)
          this.$router.push(this.getPostLoginRoute(user))
        }
      } catch (error) {
        if (
          isAxiosError<{ code?: string }>(error) &&
          error.response?.data?.code === 'GOOGLE_LINK_REQUIRED'
        ) {
          this.pendingGoogleCredential = credential
          this.password = ''
          this.notify(
            'Confirme sua senha do MapTree para vincular o Google. Nos próximos acessos, basta entrar com o Google.',
          )
          return
        }
        this.notify(this.getLoginErrorMessage(error, 'google'))
      } finally {
        this.loading = false
      }
    },
  },
  computed: {
    googleEnabled(): boolean {
      return isGoogleAuthEnabled()
    },
  },
})
</script>

<style scoped>
.google-button-frame :deep(iframe) {
  max-width: 100% !important;
}

.google-button-frame--loading {
  opacity: 0.55;
  pointer-events: none;
}
</style>
