<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const password = ref('')
const confirmPassword = ref('')

function resetPassword() {
  if (password.value !== confirmPassword.value) {
    alert('As senhas não coincidem')
    return
  }
  router.push('/login')
}

function cancel() {
  router.push('/login')
}
</script>

<template>
  <v-container class="login-container" fluid>
    <v-img
      alt="Logo"
      class="mb-4 mx-auto"
      contain
      max-width="10"
      style="margin: 20px;"
    />

    <v-row>
      <v-col cols="12">
        <v-card class="form-card" flat style="max-width: 400px; margin: 0 auto; ">
          <v-card-title>Redefinir Senha</v-card-title>
          <v-card-text class="text-center">
            <p class="text-center" style="margin: 20px;">Nova Senha</p>
            <v-text-field v-model="password" type="password" placeholder="Digite a nova senha"></v-text-field>
            <p style="margin: 20px;">Confirmar Senha</p>
            <v-text-field v-model="confirmPassword" type="password" placeholder="Confirme a nova senha"></v-text-field>
            <v-btn block color="#C6F513" @click="resetPassword">Redefinir</v-btn>
            <v-btn block color="black" style="margin-top: 10px;" @click="cancel">Cancelar</v-btn>
          </v-card-text>
        </v-card>
        <div class="terms-privacy" style="margin-top: 20px; margin-bottom: 20px;">
          Termos e Condições
          <v-icon small>mdi-circle-small</v-icon>
          Política de Privacidade
        </div>
      </v-col>

    </v-row>

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
