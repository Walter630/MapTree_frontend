<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="elevation-12">
          <v-toolbar color="primary" dark flat>
            <v-toolbar-title>Login</v-toolbar-title>
          </v-toolbar>

          <v-card-text>
            <v-form ref="form" v-model="valid" @submit.prevent="handleLogin">
              <v-text-field
                v-model="email"
                :rules="emailRules"
                label="Email"
                prepend-icon="mdi-email"
                type="email"
                required
              />

              <v-text-field
                v-model="password"
                :rules="passwordRules"
                label="Senha"
                prepend-icon="mdi-lock"
                :type="showPassword ? 'text' : 'password'"
                :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                @click:append="showPassword = !showPassword"
                required
              />

              <v-alert v-if="error" type="error" class="mt-4">
                {{ error }}
              </v-alert>
            </v-form>
          </v-card-text>

          <v-card-actions>
            <v-spacer />
            <v-btn
              color="primary"
              :loading="loading"
              :disabled="!valid || loading"
              block
              @click="handleLogin"
            >
              Entrar
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/hooks/useAuth'

// Composables
const router = useRouter()
const { login: authLogin, loading, error: authError } = useAuth()

// State
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const valid = ref(false)
const error = ref('')

// Validation rules
const emailRules = [
  (v: string) => !!v || 'Email é obrigatório',
  (v: string) => /.+@.+\..+/.test(v) || 'Email deve ser válido',
]

const passwordRules = [
  (v: string) => !!v || 'Senha é obrigatória',
  (v: string) => v.length >= 6 || 'Senha deve ter no mínimo 6 caracteres',
]

// Methods
const handleLogin = async () => {
  if (!valid.value) return

  const success = await authLogin({
    email: email.value,
    password: password.value,
  })

  if (success) {
    // Redirecionar para dashboard
    router.push('/dashboard')
  } else {
    // Mostrar erro do composable
    error.value = authError.value || 'Erro ao fazer login'
  }
}
</script>

<style scoped>
.fill-height {
  min-height: 100vh;
}
</style>

