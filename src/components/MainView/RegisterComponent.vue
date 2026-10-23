<template>
  <v-container class="login-container" fluid>
    <!-- ✅ Logo canto superior esquerdo -->
    <div class="logo-container">
      <img src="/icons/LogoMapTree.png" alt="Logo" class="logo-img" />
      <span class="logo-text">MapTree</span>
    </div>

    <v-row class="fill-height" style="margin: 0; padding: 0; height: 100vh;">
      <!-- Coluna do formulário -->
      <v-col class="form-section" cols="12" md="6">
        <div class="form-area">
          <h2 class="title">Bem-vindo(a)!</h2>

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

          <v-form ref="form" v-model="valid" lazy-validation>
            <p class="field-label">Nome</p>
            <v-text-field
              v-model="formData.name"
              color="green"
              class="mb-3"
              hide-details
              variant="outlined"
              placeholder="Digite seu nome"
              required
              density="comfortable"
            ></v-text-field>

            <p class="field-label">CPF</p>
            <v-text-field
              v-model="formData.cpf"
              color="green"
              class="mb-3"
              hide-details
              density="comfortable"
              variant="outlined"
              placeholder="Digite seu CPF"
              required
            ></v-text-field>

            <p class="field-label">Telefone</p>
            <v-text-field
              v-model="formData.phone"
              color="green"
              class="mb-3"
              hide-details
              density="comfortable"
              variant="outlined"
              placeholder="Digite seu telefone"
              required
            ></v-text-field>

            <p class="field-label">Email</p>
            <v-text-field
              v-model="formData.email"
              class="mb-3"
              color="green"
              hide-details
              density="comfortable"
              variant="outlined"
              placeholder="Digite seu email"
              required
            />

            <p class="field-label">Senha</p>
            <v-text-field
              v-model="formData.password"
              class="mb-3"
              color="green"
              hide-details
              density="comfortable"
              variant="outlined"
              placeholder="Digite sua senha"
              required
              :type="showPassword ? 'text' : 'password'"
            >
              <template #append-inner>
                <v-icon @click="showPassword = !showPassword">{{ showPassword ? 'mdi-eye-off' : 'mdi-eye' }}</v-icon>
              </template>
            </v-text-field>

            <v-btn
              block
              class="mb-4 register-btn"
              color="#C6F513"
              size="large"
              style="display: flex; align-items: center; flex-direction: row;"
              append-icon="mdi-arrow-right"
              :loading="loading"
              @click="registrar"
            >
              Registrar
            </v-btn>

            <div class="text-center mt-4">
              Já possui uma conta?
              <a
                class="register-link"
                style="color: blue; text-decoration: none; cursor: pointer;"
                @click="$router.push('/login')"
              >
                Fazer Login
              </a>
              <v-icon color="blue">mdi-chevron-right</v-icon>
            </div>
          </v-form>

          <div class="terms-privacy">
            Termos e Condições
            <v-icon small>mdi-circle-small</v-icon>
            Política de Privacidade
          </div>
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
          <h1>Gestão<br>inteligente de<br>vegetação</h1>
        </div>
        <div class="bottom-logo">MapTree</div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import type { User } from '@/plugins/apiConnect.ts'

export default {
  name: 'CadastroComponent',
  data() {
    return {
      formData: {
        name: '',
        email: '',
        phone: '',
        password: '',
        cpf: '',
        isActive: true,
      },
      showPassword: false,
      valid: true,
      isMobile: window.innerWidth < 768,
      loading: false,
      feedback: {
        show: false,
        message: '',
        type: 'error' as 'error' | 'success',
      },
    }
  },

  mounted() {
    window.addEventListener('resize', this.checkMobile)
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.checkMobile)
  },

  methods: {
    notify(message: string, type: 'error' | 'success' = 'error') {
      this.feedback.message = message
      this.feedback.type = type
      this.feedback.show = true
    },
    validateForm(): string | null {
      const { name, cpf, phone, email, password } = this.formData
      if (!name || !cpf || !phone || !email || !password) {
        return 'Preencha todos os campos para se cadastrar.'
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return 'Informe um e-mail válido.'
      }
      if (password.length < 6) {
        return 'A senha deve ter pelo menos 6 caracteres.'
      }
      return null
    },
    async registrar() {
      this.feedback.show = false

      const validationError = this.validateForm()
      if (validationError) {
        this.notify(validationError)
        return
      }

      this.loading = true
      try {
        const response = await this.$api.post<User>('/auth/register', this.formData)
        if (response.status === 201 || response.status === 200) {
          this.notify('Cadastro realizado com sucesso! Redirecionando para o login...', 'success')
          setTimeout(() => this.$router.push('/login'), 1200)
        } else {
          this.notify('Não foi possível concluir o cadastro. Tente novamente.')
        }
      } catch (error) {
        console.error('Erro no registro: ', error)
        this.notify(this.getRegisterErrorMessage(error))
      } finally {
        this.loading = false
      }
    },
    getRegisterErrorMessage(error: unknown): string {
      const err = error as {
        response?: { status?: number; data?: { message?: string | string[] } }
      }

      if (!err.response) {
        return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
      }

      const status = err.response.status
      const backendMsg = err.response.data?.message
      const msgText = Array.isArray(backendMsg) ? backendMsg.join(', ') : backendMsg

      // 409 (conflito) ou mensagem do backend mencionando duplicidade
      if (status === 409 || (msgText && /já|exist|cadastrad|duplicat/i.test(msgText))) {
        return msgText || 'E-mail ou CPF já cadastrado.'
      }
      if (status === 400) {
        return msgText || 'Dados inválidos. Verifique os campos e tente novamente.'
      }
      if (status && status >= 500) {
        return 'Erro no servidor. Tente novamente em instantes.'
      }

      return msgText || 'Não foi possível concluir o cadastro. Tente novamente.'
    },
    checkMobile() {
      this.isMobile = window.innerWidth < 768
    },
  },
}
</script>

<style scoped>
/* Layout principal */
.login-container {
  height: 100vh;
  width: 100%;
  display: flex;
  padding: 0;
  margin: 0;
  position: relative;
}

/* ✅ Logo canto superior esquerdo */
.logo-container {
  position: absolute;
  top: 10px;
  left: 12px;
  display: flex;
  align-items: center;
  z-index: 10;
}

.logo-img {
  width: 59px;
  height: 52px;
  margin-right: 8px;
}

.logo-text {
  font-weight: bold;
  font-size: 18px;
  color: #000;
}

/* Seção esquerda (formulário) */
.form-section {
  background-color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

/* Área do formulário (largura controlada, centralizada) */
.form-area {
  width: 100%;
  max-width: 440px;
  margin: 0 auto;
}

/* Títulos */
.title {
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 28px;
}

/* Labels dos campos */
.field-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: #555;
  margin-bottom: 6px;
}

/* Botão um pouco maior (aumento sutil) */
.register-btn {
  min-height: 52px;
  font-size: 1rem;
  letter-spacing: 0.3px;
}

/* Inputs com um pouco mais de presença */
:deep(.v-field__input) {
  font-size: 1rem;
}

/* Links */
.register-link {
  color: #000;
  font-weight: 500;
  text-decoration: underline;
}

.register-link:hover {
  text-decoration: underline;
}

/* Seção direita */
.info-section {
  background-color: #C6F513;
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

/* Termos */
.terms-privacy {
  font-size: 12px;
  margin-top: 40px;
  color: gray;
  text-align: center;
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
</style>
