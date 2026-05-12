<template>
  <v-container class="login-container" fluid>
    <v-row class="fill-height" style="margin: 0; padding: 0; height: 100vh">
      <!-- Coluna do formulário -->
      <v-col class="form-section" cols="12" md="5" lg="4">
        <!-- Logo fixo no canto superior esquerdo -->
        <div class="logo-fixed">
          <img src="/icons/LogoMapTree.png" alt="Logo" class="logo-img" />
          <span class="logo-text">MapTree</span>
        </div>

        <div class="content-wrapper px-8">
          <!-- Formulário -->
          <div class="form-area">
            <h2 class="title mb-8">Bem-vindo(a)!</h2>

            <v-form ref="form" v-model="valid" lazy-validation class="login-form">
              <div class="field-group mb-6">
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
                <label class="field-label">Senha</label>
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
                @click="login"
              >
                entrar
              </v-btn>

              <div class="text-center mb-6">
                <a class="forgot-password" @click="$router.push('/recovery')"
                  >Esqueceu sua senha?</a
                >
              </div>

              <div class="divider mb-6">
                <span>ou</span>
              </div>

              <v-btn block class="mb-3 google-btn" size="large" @click="loginWithGoogle">
                <img
                  alt="Google Icon"
                  class="mr-2"
                  height="22"
                  src="https://www.svgrepo.com/show/475656/google-color.svg"
                  width="22"
                />
                Continuar com Google
              </v-btn>

              <v-btn block class="mb-4 facebook-btn" size="large" @click="loginFacebook">
                <img
                  class="mr-2"
                  height="20"
                  :src="getFacebookLogo"
                  width="20"
                  alt="facebook-action-login"
                />
                Continuar com Facebook
              </v-btn>

              <div class="text-center mt-6">
                Não possui uma conta?
                <a
                  class="register-link"
                  @click="$router.push('/register')"
                  >Cadastre-se</a>
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
        md="8"
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
import facebookLogo from '@/assets/facebook-logo.png'
import { type LoginRequest, type LoginResponse } from '@/plugins/apiConnect.ts'

export default defineComponent({
  name: 'LoginComponent',
  data() {
    return {
      username: '',
      password: '',
      showPassword: false,
      valid: false,
      isMobile: false,
    }
  },
  mounted() {
    this.checkIsMobile()
    window.addEventListener('resize', this.checkIsMobile)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.checkIsMobile)
  },
  methods: {
    checkIsMobile() {
      this.isMobile = window.innerWidth < 960 // Ajuste o valor conforme necessário
    },
    async login() {
      try {
        const response = await this.$api.post<LoginResponse>('/auth/login', {
          email: this.username,
          password: this.password,
        } as LoginRequest)

        if (response.data) {
          // Save access token (refresh token comes via HTTP-only cookie) and user info in the store
          this.$api.setToken(response.data.accessToken);
          // Save user info in the store
          this.$store.setUser(response.data.user);
          // Redirect based on user role
          this.$router.push(`/${response.data.user.role.toLowerCase()}`)
        }
      } catch (error) {
        console.error('Login failed:', error)
        throw error
      }
    },
    loginWithGoogle() {
      // Lógica de login com Google aqui
      console.log('Login com Google')
    },
    loginFacebook() {
      // Lógica de login com Facebook aqui
      console.log('Login com Facebook')
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
    getFacebookLogo() {
      return facebookLogo
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
  max-width: 420px;
  justify-content: center;
  padding: 80px 0 40px;
}

.form-area {
  width: 100%;
  max-width: 400px;
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
  font-size: 28px;
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
  width: 832px;
}

.info-text h1 {
  font-size: 96px;
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
  font-size: 0.85rem;
  font-weight: 500;
  color: #555;
  margin-bottom: 6px;
}

/* Ajustes nos botões sociais */
.google-btn {
  background-color: #fff !important;
  border: 1px solid #ddd !important;
  color: #333 !important;
  text-transform: none !important;
  font-weight: 500 !important;
}

.facebook-btn {
  background-color: #1877f2 !important;
  color: #fff !important;
  text-transform: none !important;
  font-weight: 500 !important;
}

/* Input fields */
:deep(.v-field__input) {
  font-size: 0.95rem;
}
</style>
