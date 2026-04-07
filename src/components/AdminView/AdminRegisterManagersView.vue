<template>
  <v-container class="pa-6">
    <PageHeader
      title="Cadastro de Gestores"
      subtitle="Cadastre Os Gestores E Suas Funções."
      :breadcrumbs="[
        { text: 'Meu Painel', to: '/admin' },
        { text: 'Gestores', to: '/admin/managers' },
        { text: '#CadastrarGestores' },
      ]"
    />

    <v-form ref="form" v-model="valid" lazy-validation style="margin-top: 50px;">
      <v-row justify="center">
        <v-col cols="12" md="4" class="d-flex flex-column">
          <div class="input-group">
            <p class="input-label">Nome do Gestor</p>
            <v-text-field
              v-model="formData.name"
              :rules="[rules.required]"
              placeholder="Digite o nome"
              variant="outlined"

              hide-details
            ></v-text-field>
          </div>
          <div class="input-group">
            <p class="input-label">Email</p>
            <v-text-field
              v-model="formData.email"
              :rules="[rules.required, rules.email]"
              placeholder="Digite o email"
              variant="outlined"
              hide-details
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
              variant="outlined"

              hide-details
            ></v-text-field>
          </div>
        </v-col>

        <v-col cols="12" md="4" class="d-flex flex-column">
          <div class="input-group">
            <p class="input-label">Número de Contato</p>
            <v-text-field
              v-model="formData.phone"
              :rules="[rules.required, rules.contactFormat]"
              placeholder="(XX) X XXXX-XXXX"
              mask="(##) # ####-####"
              variant="outlined"
              hide-details
            >
              <template v-slot:prepend-inner>
                <div class="d-flex align-center mr-2">
                  <span class="mr-2" style="color: #344054;">+55</span>
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
              item-title="name"
              item-value="id"
              placeholder="Nome da Empresa"
              :rules="[rules.required]"
              variant="outlined"

              hide-details
            ></v-select>
          </div>
          <div class="input-group">
            <p class="input-label">Senha</p>
            <v-text-field
              v-model="formData.password"
              :rules="[rules.required, rules.minPassword]"
              placeholder="Digite a senha"
              type="password"
              variant="outlined"

              hide-details
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
import type { User, Company } from '@/plugins/apiConnect.ts'
import PageHeader from '@/components/shared/PageHeader.vue'

interface Empresa {
  id: string;
  name: string;
  taxId: string;
  isOutsourced: boolean     //se é terceirizada
  managerId: string;
  isActive?: boolean;
}

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
        empresa: '',
        role: 'MANAGER',
        isActive: true,
      },
      empresas: [] as Empresa[],
      allCompanies: [] as Empresa[],
      // ... dentro do data()
      rules: {
        required: (value: any) => !!value || 'Campo obrigatório.',
        email: (value: any) => {
          const pattern = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
          return pattern.test(String(value)) || 'Email inválido.'
        },
        minPassword: (v: any) => String(v).length >= 6 || 'A senha deve ter pelo menos 6 caracteres.',
        contactFormat: (v: any) => (v && String(v).replace(/[^0-9]/g, '').length >= 10) || 'Contato deve ter pelo menos 10 dígitos (DDD + Número).',
        cpfFormat: (v: any) => (v && String(v).replace(/[^0-9]/g, '').length === 11) || 'CPF inválido. Deve conter 11 dígitos.',
      },
// ...
    };
  },
  mounted() {
    this.getCompanies()
  },
  methods: {
    goBack() {
      this.$router.push('/admin/managers')
      // this.$router.go(-1);
    },
    async getCompanies() {
      try {
        const response = await this.$api.get<Company[]>('/organizations');
        this.allCompanies = response.data.map(comp => ({
          id: comp.id,
          name: comp.name,
          taxId: comp.taxId,
          isOutsourced: comp.isOutsourced,
          managerId: comp.managerId ?? '',
          isActive: comp.isActive ?? true
        }));
        this.empresas = this.allCompanies.filter(comp => comp.isActive);
      } catch (error) {
        console.error('Erro ao buscar empresas: ', error);
      }
    },
    async registrar() {
      try {
        const response = await this.$api.post<User>('/auth/register', this.formData);
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
        role: 'MANAGER',
        isActive: true,
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


.input-label {
  font-size: 0.875rem; /* Tamanho da fonte das labels */
  color: #344054; /* Cor mais escura para as labels */
  margin-bottom: 8px; /* Espaçamento entre a label e o input */
  font-weight: 500; /* Peso da fonte para as labels */
}

.custom-text-field.v-text-field--solo :deep(.v-input__control),
.custom-text-field.v-select--solo :deep(.v-input__control) {
  min-height: 44px;
}

.custom-text-field.v-text-field--solo :deep(.v-field),
.custom-text-field.v-select--solo :deep(.v-field) {
  border: 1px solid #D0D5DD;
  border-radius: 8px;
  background-color: #FFFFFF !important;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05);
  padding: 0 14px;
}

.custom-text-field.v-text-field--solo :deep(.v-field__input),
.custom-text-field.v-select--solo :deep(.v-field__input) {
  color: #101828;
  font-size: 1rem;
}

.custom-text-field.v-text-field--solo :deep(.v-label),
.custom-text-field.v-select--solo :deep(.v-label) {
  transform: translateY(-10px) scale(0.75);
  color: #667085 !important;
}

/* Estilo para a label "Email — Endereço de Email" */
.custom-text-field :deep(.v-label) span {
  font-size: 0.875rem !important;
  font-weight: 400 !important;
  color: #667085 !important;
}

/* Prepend-inner do campo de contato */
.contact-field :deep(.v-input__prepend-inner) {
  margin-top: 0;
  align-items: center;
  height: 100%;
}

.contact-field :deep(.v-divider) {
  height: 24px;
  border-right: 1px solid #D0D5DD;
  margin-right: 8px;
  margin-left: -4px;
}

.contact-field :deep(.v-input__prepend-inner) span {
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

.input-group {
  /* Mantido para agrupamento lógico, mas sem margin-bottom fixo */
  width: 100%;
  padding-bottom: 30px;
}

.v-col {
  padding-bottom: 10px;
}
</style>
