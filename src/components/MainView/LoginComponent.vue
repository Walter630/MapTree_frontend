<template>
  <v-container class="login-container" fluid>
    <v-row class="fill-height" style="margin: 0; padding: 0; height: 100vh">
      <!-- Coluna do formulário -->
      <v-col class="form-section" cols="12" md="4">
        <div class="content-wrapper">
          <!-- ✅ LOGO NO TOPO ESQUERDO -->
          <div class="logo-container">
            <img src="/icons/LogoMapTree.png" alt="Logo" class="logo-img" />
            <span class="logo-text">MapTree</span>
          </div>

          <!-- Formulário -->
          <div class="form-area">
            <h2 class="title">Bem-vindo(a)!</h2>

            <v-form ref="form" v-model="valid" lazy-validation>
              <p>Email</p>
              <v-text-field
                v-model="username"
                class="mb-2"
                color="green"
                dense
                hide-details
                label="Email"
                variant="outlined"
                placeholder="Digite seu email"
                required
              />
              <p>Senha</p>
              <v-text-field
                v-model="password"
                class="mb-2"
                color="green"
                dense
                hide-details
                label="Senha"
                variant="outlined"
                placeholder="Digite sua senha"
                required
                :type="showPassword ? 'text' : 'password'"
                @keyup.enter="login"
              >
                <template #append-inner>
                  <v-icon @click="showPassword = !showPassword">{{
                    showPassword ? 'mdi-eye-off' : 'mdi-eye'
                  }}</v-icon>
                </template>
              </v-text-field>

              <v-btn
                block
                class="mb-2"
                color="#C6F513"
                style="display: flex; align-items: center; flex-direction: row"
                append-icon="mdi-arrow-right"
                @click="login"
              >
                entrar
              </v-btn>

              <div class="text-left mb-2">
                <a class="forgot-password" @click="$router.push('/recovery')"
                  >Esqueceu sua senha?</a
                >
              </div>
              <div>
                <hr class="hr" />
              </div>

              <v-btn block class="mb-2 google-btn" @click="loginWithGoogle">
                <img
                  alt="Google Icon"
                  class="mr-2"
                  height="24"
                  src="https://www.svgrepo.com/show/475656/google-color.svg"
                  width="24"
                />
                Continuar com Google
              </v-btn>

              <v-btn block class="mb-2 facebook-btn" @click="loginFacebook">
                <img
                  class="mr-2"
                  height="22"
                  :src="getFacebookLogo"
                  width="22"
                  alt="facebook-action-login"
                />
                Continuar com Facebook
              </v-btn>

              <div class="text-center mt-4">
                Não possui uma conta?
                <a
                  class="register-link"
                  style="color: blue; text-decoration: none"
                  @click="$router.push('/register')"
                  >Cadastre-se</a
                >
                <v-icon color="blue">mdi-chevron-right</v-icon>
              </div>
            </v-form>

            <div class="terms-privacy">
              Termos e Condições
              <v-icon small>mdi-circle-small</v-icon>
              Política de Privacidade
            </div>
          </div>
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

/* ✅ LOGO SUPERIOR */
.logo-container {
  display: flex;
  align-items: center;
  margin-bottom: 40px;
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

.content-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  justify-content: space-between;
}

.form-area {
  flex-grow: 1;
  width: 347px;
  margin: 0 auto;
}

/* Mantendo o resto dos seus estilos originais */
.form-section {
  background-color: white;

  width: 608px;
}

.hr {
  border: none;
  height: 1px;
  background: linear-gradient(to right, #ccc, #999, #ccc);
  margin: 20px 0;
}

.title {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 24px;
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
.terms-privacy {
  font-size: 12px;
  margin-top: 20px;
  color: gray;
  text-align: center;
}
</style>
