<template>
  <v-container class="login-container" fluid>
    <!-- ✅ Logo canto superior esquerdo -->
    <div class="logo-container">
      <img src="/icons/LogoMapTree.png" alt="Logo" class="logo-img" />
      <span class="logo-text">MapTree</span>
    </div>

    <v-row class="fill-height" style="margin: 0; padding: 0; height: 100vh;">
      <!-- Coluna do formulário -->
      <v-col class="form-section" >
        <div style="width: 347px; margin: 0 auto;">
          <h2 class="title">Bem-vindo(a)!</h2>

          <v-form ref="form" v-model="valid" lazy-validation>
            <p>Nome</p>
            <v-text-field
              v-model="nome"
              color="green"
              class="mb-4"
              dense
              hide-details
              label="Nome"
              variant="outlined"
              placeholder="Digite seu nome"
              required
            ></v-text-field>

            <p>Email</p>
            <v-text-field
              v-model="username"
              class="mb-4"
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
              class="mb-4"
              color="green"
              dense
              hide-details
              label="Senha"
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
              class="mb-4"
              color="#C6F513"
              style="display: flex; align-items: center; flex-direction: row;"
              append-icon="mdi-arrow-right"
              @click="registrar"
            >
              Registrar
            </v-btn>

            <div class="text-center mt-4">
              Já possui uma conta?
              <a
                class="register-link"
                style="color: blue; text-decoration: none;"
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
        md="8"
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

<script>
import { useAppStore } from '@/stores/app.ts'

export default {
  name: 'CadastroComponent',

  data() {
    return {
      nome: '',
      username: '',
      password: '',
      showPassword: false,
      valid: true,
      isMobile: window.innerWidth < 768,
    }
  },

  mounted() {
    const store = useAppStore()
    window.addEventListener('resize', this.checkMobile)
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.checkMobile)
  },

  methods: {
    registrar() {},
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
  width: 608px;
}

/* Títulos */
.title {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 24px;
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

/* Termos */
.terms-privacy {
  font-size: 12px;
  margin-top: 40px;
  color: gray;
  text-align: center;
}
</style>
