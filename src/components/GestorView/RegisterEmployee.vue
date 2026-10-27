<template>
  <v-container fluid class="page-shell py-8">
    <PageHeader
      title="Cadastro de Funcionário"
      subtitle="Cadastre os funcionários e suas funções."
      :breadcrumbs="[
        { text: 'Meu Painel', to: '/manager' },
        { text: 'Funcionários', to: '/manager/employees' },
        { text: '#CadastrarFuncionário' },
      ]"
    />

    <v-card class="mx-auto registration-card" elevation="0">
      <v-card-item class="pb-2">
        <template #prepend>
          <v-avatar color="green-lighten-5" size="48">
            <v-icon color="green-darken-2">mdi-account-plus</v-icon>
          </v-avatar>
        </template>
        <v-card-title>Cadastro de funcionário</v-card-title>
        <v-card-subtitle>Cadastre os funcionários e suas funções.</v-card-subtitle>
      </v-card-item>

      <v-divider />

      <v-form ref="form" v-model="valid" lazy-validation class="pa-6" @submit.prevent="registrar">
        <p class="text-subtitle-1 font-weight-bold mb-4">Dados do funcionário</p>
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="formData.name"
              :rules="[rules.required]"
              label="Nome do funcionário"
              placeholder="Digite o nome"
              prepend-inner-icon="mdi-account"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="formData.cpf"
              :rules="[rules.required]"
              label="CPF"
              placeholder="000.000.000-00"
              prepend-inner-icon="mdi-card-account-details"
              variant="outlined"
            />
          </v-col>
        </v-row>

        <p class="text-subtitle-1 font-weight-bold mb-4 mt-4">Contato e acesso</p>
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="formData.email"
              :rules="[rules.required, rules.email]"
              label="E-mail"
              placeholder="Digite o e-mail"
              prepend-inner-icon="mdi-email-outline"
              variant="outlined"
            >
              <template #label>
                E-mail <span class="text-grey">— Endereço de e-mail</span>
              </template>
            </v-text-field>
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="formData.phone"
              :rules="[rules.required, rules.contactFormat]"
              label="Número de contato"
              placeholder="(88) 00000-0000"
              prepend-inner-icon="mdi-phone-outline"
              variant="outlined"
            >
              <template #prepend-inner>
                <div class="d-flex align-center mr-2">
                  <span class="mr-2">+55</span>
                  <v-divider vertical />
                </div>
              </template>
            </v-text-field>
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="formData.password"
              :rules="[rules.required, rules.minPassword]"
              label="Senha"
              placeholder="Digite a senha"
              type="password"
              prepend-inner-icon="mdi-lock-outline"
              variant="outlined"
              hint="A senha deve ter pelo menos 6 caracteres."
              persistent-hint
            />
          </v-col>
        </v-row>

        <div class="d-flex flex-wrap justify-end ga-3 mt-2">
          <v-btn variant="outlined" type="button" @click="cancelForm">Cancelar</v-btn>
          <v-btn
            color="green-darken-2"
            type="submit"
            :disabled="!valid"
            prepend-icon="mdi-content-save"
          >
            Salvar funcionário
          </v-btn>
        </div>
      </v-form>
    </v-card>
  </v-container>
</template>

<script lang="ts">
import type { User } from '@/plugins/apiConnect'
import PageHeader from '@/components/shared/PageHeader.vue'

export default {
  name: 'CadastroFuncionario',
  components: { PageHeader },

  data() {
    return {
      valid: false,

      formData: {
        name: '',
        email: '',
        phone: '',
        password: '',
        cpf: '',
      },

      rules: {
        required: (value: string) => !!value || 'Campo obrigatório.',
        email: (value: string) => {
          const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          return pattern.test(value) || 'Email inválido.'
        },
        minPassword: (v: string) => v.length >= 6 || 'A senha deve ter pelo menos 6 caracteres.',
        contactFormat: (v: string) =>
          (v && v.replace(/[^0-9]/g, '').length >= 10) ||
          'Contato deve ter pelo menos 10 dígitos (DDD + Número).',
      },
    }
  },

  methods: {
    goBack() {
      this.$router.push('/manager/employees')
    },

    async registrar() {
      try {
        // Garantir que estamos registrando um 'USER' associado à organização do gestor
        const payload = {
          ...this.formData,
          cpf: this.formData.cpf.replace(/\D/g, ''),
          phone: this.formData.phone.replace(/\D/g, ''),
          role: 'USER',
          isActive: true,
        }

        const response = await this.$api.post<User>('/users', payload)
        if (response.status === 201) {
          this.$router.push('/manager/employees')
        }
      } catch (error) {
        console.error('Erro no registro: ', error)
        alert('Falha ao cadastrar funcionário. Verifique os dados.')
      }
    },

    resetForm() {
      ;(this.$refs.form as HTMLFormElement)?.reset()
      this.formData = { name: '', email: '', password: '', cpf: '', phone: '' }
    },

    cancelForm() {
      this.resetForm()
      this.$router.push('/manager/employees')
    },
  },
}
</script>

<style scoped>
.registration-card {
  max-width: 980px;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
}

.v-text-field:deep(.v-input__prepend-inner) .v-divider {
  height: 70%;
  margin-right: 8px;
  margin-left: -4px;
}

.v-text-field:deep(.v-label) span {
  font-size: 0.75rem;
  font-weight: 400;
}
</style>
