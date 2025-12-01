<template>
  <v-container class="cadastro-funcionario-container">
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center mb-2">
          <span class="text-caption text-grey-darken-1" @click="$router.push('/admin')">Meu Painel</span>
          <v-icon small class="mx-1 text-grey-darken-1" color="#2F3367">mdi-chevron-right</v-icon>
          <span class="text-caption font-weight-bold"  @click="goBack">Empresas</span>
          <v-icon small class="mx-1 text-grey-darken-1">mdi-chevron-right</v-icon>
          <span class="text-caption font-weight-bold" >#CadastrarEmpresas</span>
        </div>
      </v-col>

    </v-row>
    <v-row class="mb-5 align-center">
      <v-col cols="auto" class="py-0">
        <v-btn icon depressed style="box-shadow: none; border: 1px solid #D0D5DD; height: 56px; width: 56px; border-radius: 8px; background-color: #FFF;" @click="goBack">
          <v-icon>mdi-chevron-left</v-icon>
        </v-btn>
      </v-col>
      <v-col cols="auto" class="py-1">
        <h1 class="text-h5 font-weight-regular mt-1" style="color: #2F3367; margin-top: 20px;">
          Cadastro de Gestores
        </h1>
        <p class="text-subtitle-1 grey--text" style="color: #667085;">
          Cadastre Os Gestores E Suas Funções.
        </p>
      </v-col>
    </v-row>

    <v-form ref="form" v-model="valid" lazy-validation style="margin-top: 50px;">
      <v-row justify="center">
        <v-col cols="12" md="4" class="d-flex flex-column" style="gap: 15px;">
          <div class="input-group">
            <p class="input-label">Nome do Gestor</p>
            <v-text-field
              v-model="formData.name"
              :rules="[rules.required]"
              placeholder="Digite o nome"
            ></v-text-field>
          </div>
          <div class="input-group">
            <p class="input-label">Email</p>
            <v-text-field
              v-model="formData.email"
              :rules="[rules.required, rules.email]"
              placeholder="Digite o email"
            >
              <template v-slot:label>
                <span style="color: #667085; font-size: 0.875rem;">Endereço de Email</span>
              </template>
            </v-text-field>
          </div>
          <div class="input-group">
            <p class="input-label">CPF</p>
            <v-text-field
              v-model="formData.cpf"
              :rules="[rules.required, rules.cpfFormat]"
              placeholder="Digite o CPF"
              mask="###.###.###-##"
            ></v-text-field>
          </div>

        </v-col>

        <v-col cols="12" md="4" class="d-flex flex-column" style="gap: 15px;">
          <div class="input-group">
            <p class="input-label">Número de Contato</p>
            <v-text-field
              v-model="formData.phone"
              :rules="[rules.required, rules.contactFormat]"
              placeholder="555-555-1234"
              mask="###-###-####"

            >
              <template v-slot:prepend-inner>
                <div class="d-flex align-center mr-2">
                  <span class="mr-2" style="color: #344054;">+1</span>
                  <v-divider vertical class="contact-divider"></v-divider>
                </div>
              </template>
            </v-text-field>
          </div>
          <div class="input-group">
            <p class="input-label">Empresa</p>
            <v-select
              v-model="formData.empresa"
              :items="empresas"
              :rules="[rules.required]"
              placeholder="Nome da Empresa"
            ></v-select>
          </div>
          <div class="input-group">
            <p class="input-label">Senha</p>
            <v-text-field
              v-model="formData.password"
              :rules="[rules.required, rules.minPassword]"
              placeholder="Digite a senha"
              type="password"

            ></v-text-field>
          </div>
        </v-col>
      </v-row>

      <v-row class="mt-8">
        <v-col cols="12" class="d-flex justify-center">
          <v-btn
            :disabled="!valid"
            color="#A7D129"
            dark
            large
            class="mr-4 save-button"
            @click="registrar"
          >
            SALVAR
          </v-btn>

          <v-btn
            color="#344054"
            dark
            large
            class="cancel-button"
            @click="cancelForm"
          >
            CANCELAR
          </v-btn>
        </v-col>
      </v-row>
    </v-form>
  </v-container>
</template>

<script lang="ts">
import type { User } from '@/plugins/apiConnect.ts'

export default {
  name: 'CadastroFuncionario',
  data() {
    return {
      valid: false,
      formData: {
        name: '',
        email: '',
        phone: '',
        password: '',
        cpf: '',
        empresa: '',
        role: 'MANAGER',
        isActive: true,
      },
      empresas: ['Empresa 1', 'Empresa 2', 'Empresa 3', 'Empresa 4'],
      rules: {
        required: value => !!value || 'Campo obrigatório.',
        email: value => {
          const pattern = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
          return pattern.test(value) || 'Email inválido.'
        },
        minPassword: v => v.length >= 6 || 'A senha deve ter pelo menos 6 caracteres.',
        contactFormat: v => (v && v.replace(/[^0-9]/g, '').length >= 10) || 'Contato deve ter pelo menos 10 dígitos (DDD + Número).'
      },
    };
  },
  methods: {
    goBack() {
      this.$router.push('/admin/managers')
      // this.$router.go(-1);
    },
    async registrar() {
      try {
        const response = await this.$api.post<User>('/users', this.formData);
        if (response.status === 201) {
          this.$router.push('/admin/managers')
        } else {
          console.log('Erro no registro: ', response);
        }
      } catch (error) {
        console.error('Erro no registro: ', error);
        alert('Erro no registro: ' + error)
      }
    },
    async submitForm() {
      const { valid } = await (this.$refs.form as HTMLFormElement).validate();

      if (valid) {
        console.log('Formulário Válido, enviando dados:', this.formData);
        alert('Gestor Cadastrado com Sucesso!');
        this.resetForm();
      } else {
        console.log('Formulário Inválido');
      }
    },
    resetForm() {
      (this.$refs.form as HTMLFormElement).reset();
      this.formData = {
        name: '',
        email: '',
        cpf: '',
        password: '',
        phone: '',
        empresa: '',
      };
    },
    cancelForm() {
      console.log('Ação de Cancelar');
      this.resetForm();
    },
  },
};
</script>

<style scoped>
.cadastro-funcionario-container {
  margin-top: 20px;
  padding: 24px;
}

.input-group {
  margin-bottom: 20px; /* Espaçamento entre os grupos de input */
}

.input-label {
  font-size: 0.875rem; /* Tamanho da fonte das labels */
  color: #344054; /* Cor mais escura para as labels */
  margin-bottom: 8px; /* Espaçamento entre a label e o input */
  font-weight: 500; /* Peso da fonte para as labels */
}

.custom-text-field.v-text-field--solo >>> ,
.custom-text-field.v-select--solo >>> {
  min-height: 44px; /* Altura padrão para os campos */
}

.custom-text-field.v-text-field--solo >>> ,
.custom-text-field.v-select--solo >>> {
  border: 1px solid #D0D5DD; /* Borda cinza clara */
  border-radius: 8px; /* Borda arredondada */
  background-color: #FFFFFF !important; /* Fundo branco */
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05); /* Sombra sutil */
  padding: 0 14px; /* Padding interno */
}

.custom-text-field.v-text-field--solo >>> .v-input__slot input,
.custom-text-field.v-select--solo >>>  {
  color: #101828; /* Cor do texto do input */
  font-size: 1rem; /* Tamanho da fonte do texto */
}

.custom-text-field.v-text-field--solo >>> ,
.custom-text-field.v-select--solo >>> {
  transform: translateY(-10px) scale(0.75); /* Ajuste para label flutuante */
  color: #667085 !important;
}

/* Estilo para a label "Email — Endereço de Email" */
.custom-text-field >>> .v-label span {
  font-size: 0.875rem !important; /* Menor que a label principal */
  font-weight: 400 !important;
  color: #667085 !important;
}


/* Prepend-inner do campo de contato */
.contact-field >>>  {
  margin-top: 0; /* Alinha o prepend-inner verticalmente */
  align-items: center;
  height: 100%; /* Garante que o container ocupe toda a altura */
}

.contact-field >>>  {
  height: 24px; /* Altura da linha vertical */
  border-right: 1px solid #D0D5DD; /* Cor da linha */
  margin-right: 8px; /* Espaçamento entre a linha e o número */
  margin-left: -4px; /* Ajuste para centralizar visualmente */
}

.contact-field >>> .v-input__prepend-inner span {
  font-weight: 500;
}

/* Botões */
.save-button {
  background-color: #A7D129 !important; /* Cor exata do botão salvar */
  color: white !important;
  text-transform: uppercase;
  font-weight: 600;
  height: 44px !important;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05);
  padding: 0 18px;
}

.cancel-button {
  background-color: #FFFFFF !important; /* Botão cancelar branco */
  color: #344054 !important; /* Texto cinza escuro */
  text-transform: uppercase;
  font-weight: 600;
  height: 44px !important;
  border-radius: 8px;
  border: 1px solid #D0D5DD;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05);
  padding: 0 18px;
}
</style>
