<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('')
const snackbarTimeout = ref(2000)
const email = ref('')
function validateEmail () {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return re.test(String(email.value).toLowerCase())
}

function sendVerificationCode () {
  if (!validateEmail()) {
    snackbar.value = true
    snackbarText.value = 'Email inválido email precisa ter @ e .'
    snackbarColor.value = 'error'
    snackbarTimeout.value = 2000
    return
  }
  snackbarText.value = 'Código de verificação enviado para ' + email.value
  snackbarColor.value = 'success'
  snackbarTimeout.value = 2000
  router.push('/recovery-code')
}
function cancelarCode () {
  router.push('/login')
}
</script>

<template>
  <v-container class="login-container" fluid>
    <v-row>
      <v-col cols="12">
        <v-card class="form-card" flat style="max-width: 400px; margin: 0 auto;">
          <v-card-title>Recuperar Senha</v-card-title>
          <v-card-text class="text-center">
            <p>Insira o seu email cadastrado para receber o código de verificação.</p>
            <v-text-field v-model="email" placeholder="Digite o email de registro" required :rules="[validateEmail]" />

            <v-btn block color="#C6F513" :disabled="!email" @click="sendVerificationCode">Proximo <v-icon right>mdi-arrow-right</v-icon></v-btn>
            <v-btn block color="black" style="margin-top: 10px;" @click="cancelarCode">Cancelar</v-btn>

          </v-card-text>
          <div class="terms-privacy" style="margin-top: 20px; margin-bottom: 20px;">
            Termos e Condições
            <v-icon small>mdi-circle-small</v-icon>
            Política de Privacidade
          </div>
        </v-card>
      </v-col>
    </v-row>
    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="snackbarTimeout">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<style scoped>
.form-card {
  max-width: 400px;
  margin: 0 auto;
}
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  padding: 0;
  margin: 0;
}
.terms-privacy {
  font-size: 12px;
  color: gray;
  text-align: center;
}
</style>
