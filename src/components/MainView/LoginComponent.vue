<template>
  <v-container class="login-container" fluid>
    <v-row class="fill-height" style="margin: 0; padding: 0; height: 100vh">
      <!-- Coluna do formulário -->
      <v-col class="form-section" cols="12" md="6">
        <!-- Logo fixo no canto superior esquerdo -->
        <div class="logo-fixed">
          <img src="/icons/LogoMapTree.png" alt="Logo" class="logo-img" />
          <span class="logo-text">MapTree</span>
        </div>

        <div class="content-wrapper px-8">
          <!-- Formulário -->
          <div class="form-area">
            <h2 class="title mb-8">Bem-vindo(a)!</h2>

            <v-alert
              v-if="$route.query.reason === 'session-unavailable'"
              type="info"
              variant="tonal"
              class="mb-5"
            >
              Não foi possível validar sua sessão agora. Ela foi preservada; tente novamente quando
              a conexão voltar.
              <v-btn variant="text" class="mt-2" @click="$router.push('/')"
                >Tentar acessar meu painel</v-btn
              >
            </v-alert>
            <!-- Alerta inline integrado ao formulário -->
            <v-expand-transition>
              <div
                v-if="feedback.show"
                class="form-alert"
                :class="feedback.type === 'success' ? 'form-alert--success' : 'form-alert--error'"
              >
                <v-icon size="18" class="form-alert__icon">
                  {{ feedback.type === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle' }}
                </v-icon>
                <span class="form-alert__text">{{ feedback.message }}</span>
              </div>
            </v-expand-transition>

            <v-form ref="form" v-model="valid" lazy-validation class="login-form">
              <div v-if="!pendingGoogleCredential" class="field-group mb-6">
                <label class="field-label">Email</label>
                <v-text-field
                  v-model="username"
                  color="green"
                  hide-details
                  variant="outlined"
                  placeholder="Digite seu email"
                  required
                  density="comfortable"
                />
              </div>

              <div class="field-group mb-6">
                <label class="field-label">{{
                  pendingGoogleCredential ? 'Senha do MapTree' : 'Senha'
                }}</label>
                <v-text-field
                  v-model="password"
                  color="green"
                  hide-details
                  variant="outlined"
                  placeholder="Digite sua senha"
                  required
                  density="comfortable"
                  :type="showPassword ? 'text' : 'password'"
                  @keyup.enter="login"
                >
                  <template #append-inner>
                    <v-icon @click="showPassword = !showPassword">{{
                      showPassword ? 'mdi-eye-off' : 'mdi-eye'
                    }}</v-icon>
                  </template>
                </v-text-field>
              </div>

              <v-btn
                block
                class="mb-4 login-btn"
                color="#C6F513"
                size="large"
                append-icon="mdi-arrow-right"
                :loading="loading"
                @click="login"
              >
                {{ pendingGoogleCredential ? 'Vincular Google' : 'entrar' }}
              </v-btn>
              <v-btn
                v-if="pendingGoogleCredential"
                variant="text"
                class="mb-4"
                :disabled="loading"
                @click="cancelGoogleLink"
                >Cancelar vínculo</v-btn
              >

              <div class="text-center mb-6">
                <a class="forgot-password" @click="$router.push('/recovery')"
                  >Esqueceu sua senha?</a
                >
              </div>

              <div v-show="!pendingGoogleCredential" class="divider mb-6">
                <span>ou</span>
              </div>

              <div
                v-if="googleEnabled"
                v-show="!pendingGoogleCredential"
                ref="googleButton"
                class="google-button-frame mb-3"
                :class="{ 'google-button-frame--loading': loading }"
                :aria-busy="loading"
                aria-label="Entrar com Google"
              />
              <p v-if="!googleEnabled" class="social-hint mb-3">
                Login com Google indisponível: configure o Client ID da aplicação.
              </p>

              <div class="text-center mt-6">
                Não possui uma conta?
                <a class="register-link" @click="$router.push('/register')">Cadastre-se</a>
              </div>
            </v-form>
          </div>
        </div>

        <!-- Termos no rodapé -->
        <div class="terms-footer">
          <a href="#" @click.prevent="showTerms">Termos e Condições</a>
          <span class="separator">•</span>
          <a href="#" @click.prevent="showPrivacy">Política de Privacidade</a>
        </div>
      </v-col>

      <!-- Coluna direita -->
      <v-col
        class="info-section"
        cols="12"
        md="6"
        :style="isMobile ? 'display: none;' : 'padding: 20px; text-align: center;'"
      >
        <div class="info-text">
          <h1>Gestão<br />inteligente de<br />vegetação</h1>
        </div>
        <div class="bottom-logo">MapTree</div>
      </v-col>
    </v-row>
  </v-container>
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
      valid: false,
      isMobile: false,
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
    this.checkIsMobile()
    window.addEventListener('resize', this.checkIsMobile)
    void this.mountGoogleButton()
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.checkIsMobile)
    this.isUnmounted = true
    this.googleButtonCleanup?.()
  },
  methods: {
    getLoginErrorMessage,
    checkIsMobile() {
      this.isMobile = window.innerWidth < 960 // Ajuste o valor conforme necessário
    },
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
          // Save user info in the store
          this.$store.setUser(response.data.user)
          // Redirect based on user role
          this.$router.push(`/${response.data.user.role.toLowerCase()}`)
        }
      } catch (error) {
        console.error('Login failed:', error)
        this.notify(this.getLoginErrorMessage(error))
      } finally {
        this.loading = false
      }
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
          this.$store.setUser(response.data.user)
          this.$router.push(`/${response.data.user.role.toLowerCase()}`)
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
    showTerms() {
      console.log('Mostrar Termos e Condições')
      // Aqui você pode abrir um dialog ou redirecionar
    },
    showPrivacy() {
      console.log('Mostrar Política de Privacidade')
      // Aqui você pode abrir um dialog ou redirecionar
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
/* Mantendo tudo o que você já tinha */
.login-container {
  height: 100vh;
  width: 100%;
  display: flex;
  padding: 0;
  margin: 0;
}

/* ✅ LOGO FIXO NO CANTO SUPERIOR ESQUERDO */
.logo-fixed {
  position: absolute;
  top: 24px;
  left: 32px;
  display: flex;
  align-items: center;
  z-index: 10;
}

.logo-img {
  width: 48px;
  height: 42px;
  margin-right: 8px;
}

.logo-text {
  font-weight: bold;
  font-size: 18px;
  color: #000;
}

.content-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 460px;
  justify-content: center;
  padding: 80px 0 40px;
}

.form-area {
  width: 100%;
  max-width: 440px;
  margin: 0 auto;
}

/* Mantendo o resto dos seus estilos originais */
.form-section {
  background-color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  position: relative;
  padding-top: 60px;
}

.title {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 32px;
  text-align: center;
}

/* Divider estilizado */
.divider {
  display: flex;
  align-items: center;
  text-align: center;
  color: #888;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid #ddd;
}

.divider span {
  padding: 0 16px;
  font-size: 14px;
}

.info-section {
  background-color: #c6f513;
  display: flex;
  position: relative;
  align-items: center;
  padding: 20px;
  /* largura controlada pelo grid (md="6" = 50%) */
}

.info-text h1 {
  font-size: clamp(2.5rem, 6vw, 5rem);
  font-weight: bold;
  color: #000;
  font-family: 'K2D', sans-serif;
  line-height: 1.2;
  margin-left: 20px;
  text-align: left;
}

.bottom-logo {
  position: absolute;
  bottom: 20px;
  right: 20px;
  font-weight: bold;
  color: #000;
}

/* Termos no rodapé */
.terms-footer {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  color: #888;
  text-align: center;
  display: flex;
  align-items: center;
  gap: 12px;
}

.terms-footer a {
  color: #666;
  text-decoration: none;
  transition: color 0.2s;
}

.terms-footer a:hover {
  color: #333;
  text-decoration: underline;
}

.terms-footer .separator {
  color: #ccc;
}

/* Labels dos campos */
.field-label {
  display: block;
  font-size: 0.9rem;
  font-weight: 500;
  color: #555;
  margin-bottom: 6px;
}

/* Botões um pouco maiores (aumento sutil) */
.login-form .v-btn {
  min-height: 52px;
  font-size: 1rem;
  letter-spacing: 0.3px;
}

/* Dica abaixo dos botões sociais indisponíveis */
.social-hint {
  font-size: 0.8rem;
  color: #888;
  text-align: center;
  margin-top: -4px;
}

.google-button-frame {
  display: flex;
  min-height: 44px;
  justify-content: center;
  overflow: hidden;
  border-radius: 4px;
  transition: opacity 0.2s ease;
}

.google-button-frame--loading {
  opacity: 0.55;
  pointer-events: none;
}

/* Input fields */
:deep(.v-field__input) {
  font-size: 1rem;
}

/* Alerta inline integrado ao formulário */
.form-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 20px;
  border: 1px solid transparent;
  line-height: 1.3;
}

.form-alert__icon {
  flex-shrink: 0;
}

.form-alert__text {
  flex: 1;
}

.form-alert--error {
  background-color: #fdecec;
  border-color: #f6c6c6;
  color: #b3261e;
}

.form-alert--success {
  background-color: #eef9e7;
  border-color: #cfe9bb;
  color: #3d7a1f;
}

/* Link "Cadastre-se" */
.register-link {
  color: #1976d2;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  margin-left: 4px;
}

.register-link:hover {
  text-decoration: underline;
}

/* Link "Esqueceu sua senha?" */
.forgot-password {
  color: #000;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  font-size: 0.9rem;
}

.forgot-password:hover {
  text-decoration: underline;
}
</style>
