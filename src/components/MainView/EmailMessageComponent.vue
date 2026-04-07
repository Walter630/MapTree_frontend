<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function contactSupport() {
  router.push('/login')
}

function goBack() {
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
          <v-card-title>Email de Recuperação Enviado</v-card-title>
          <v-card-text class="text-center">
            <p class="text-center" style="margin: 20px;">Por favor, verifique seu e-mail para os próximos passos para redefinir sua senha.</p>
            <v-spacer />
            <v-btn block color="#C6F513" @click="contactSupport">Falar com Suporte</v-btn>
            <v-btn block color="black" style="margin-top: 10px;" @click="goBack">Voltar</v-btn>
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
