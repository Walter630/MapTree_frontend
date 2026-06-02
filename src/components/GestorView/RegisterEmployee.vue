<template>
  <v-container class="pt-3 pb-6 px-6" style="max-width: 1400px; margin: 0 auto;">
    <PageHeader
      title="Cadastro de Funcionário"
      subtitle="Cadastre Os Funcionários E Suas Funções."
      :breadcrumbs="[
        { text: 'Meu Painel', to: '/manager' },
        { text: 'Funcionários', to: '/manager/employees' },
        { text: '#CadastrarFuncionário' },
      ]"
    />

    <!-- Formulário -->
    <v-form ref="form" v-model="valid" lazy-validation class="mt-12">
      <v-row class="d-flex justify-center" style="gap: 15px">
        <!-- Coluna Esquerda -->
        <v-col cols="12" md="4">
          <p>Nome do Funcionario</p>
          <v-text-field
            v-model="formData.name"
            :rules="[rules.required]"
            label="Nome do Funcionário"
            placeholder="Digite o nome"
            outlined
            dense
          />

          <p>Email</p>
          <v-text-field
            v-model="formData.email"
            :rules="[rules.required, rules.email]"
            label="Email"
            placeholder="Digite o email"
            outlined
            dense
          >
            <template v-slot:label>
              Email <span class="grey--text">— Endereço de Email</span>
            </template>
          </v-text-field>

          <p>Senha</p>
          <v-text-field
            v-model="formData.password"
            :rules="[rules.required, rules.minPassword]"
            label="Senha"
            placeholder="Digite a senha"
            type="password"
            outlined
            dense
          />
        </v-col>

        <!-- Coluna Direita -->
        <v-col cols="12" md="4">
          <p>CPF</p>
          <v-text-field
            v-model="formData.cpf"
            :rules="[rules.required]"
            label="CPF"
            placeholder="000.000.000-00"
            outlined
            dense
          />

          <p>Numero do Contato</p>
          <v-text-field
            v-model="formData.phone"
            :rules="[rules.required, rules.contactFormat]"
            label="Número de Contato"
            placeholder="(88) 00000-0000"
            outlined
            dense
          >
            <template v-slot:prepend-inner>
              <div class="d-flex align-center mr-2">
                <span class="mr-2">+55</span>
                <v-divider vertical />
              </div>
            </template>
          </v-text-field>
        </v-col>
      </v-row>

      <!-- Botões de Ação -->
      <v-row class="mt-4">
        <v-col cols="12" class="d-flex justify-center">
          <v-btn :disabled="!valid" color="#A7D129" dark large class="mr-4" @click="registrar">
            SALVAR
          </v-btn>
          <v-btn color="black" dark large @click="cancelForm">
            CANCELAR
          </v-btn>
        </v-col>
      </v-row>
    </v-form>
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
          isActive: true
        }

        const response = await this.$api.post<User>('/funcionario', payload)
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
