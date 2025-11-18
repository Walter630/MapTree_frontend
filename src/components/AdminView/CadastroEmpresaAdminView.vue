<template>
  <v-container class="py-8" style="max-width: 1100px">

    <!-- Breadcrumb -->
    <p class="text-caption" style="color: #667085; margin-bottom: 20px">
      Meu Painel > Empresas > #CadastrarEmpresas
    </p>

    <!-- Header -->
    <v-row class="align-center mb-6">
      <v-col cols="auto">
        <v-btn
          style="border: 1px solid #D0D5DD; height: 48px; width: 48px; background-color: #F9FAFB"
          class="rounded-lg"
          @click="goBack"
        >
          <v-icon color="#344054">mdi-chevron-left</v-icon>
        </v-btn>
      </v-col>

      <v-col>
        <h1 style="color: #101828; font-size: 24px; font-weight: 600; margin-bottom: 4px">
          Cadastro de Empresas
        </h1>
        <p style="color: #667085; font-size: 16px">
          Cadastre as empresas e seus dados principais.
        </p>
      </v-col>
    </v-row>

    <!-- CARD DO FORMULÁRIO -->
    <v-card
      elevation="1"
      class="pa-8 rounded-xl"
      style="border: 1px solid #EAECF0; background: white;"
    >
      <v-form ref="form" v-model="valid" lazy-validation>

        <v-row>
          <!-- COLUNA 1 -->
          <v-col cols="12" md="6" class="d-flex flex-column gap-4">

            <div>
              <label class="field-label">Nome da Empresa</label>
              <v-text-field
                v-model="formData.nome"
                :rules="[rules.required]"
                placeholder="Digite o nome"
                class="custom-field"
                density="comfortable"
              ></v-text-field>
            </div>

            <div>
              <label class="field-label">Email</label>
              <v-text-field
                v-model="formData.email"
                :rules="[rules.required, rules.email]"
                placeholder="Digite o email"
                class="custom-field"
                density="comfortable"
              ></v-text-field>
            </div>

            <div>
              <label class="field-label">CNPJ</label>
              <v-text-field
                v-model="formData.cnpj"
                :rules="[rules.required]"
                placeholder="Digite o CNPJ"
                class="custom-field"
                density="comfortable"
              ></v-text-field>
            </div>

          </v-col>

          <!-- COLUNA 2 -->
          <v-col cols="12" md="6" class="d-flex flex-column gap-4">

            <div>
              <label class="field-label">Número do Contato</label>
              <v-text-field
                v-model="formData.contato"
                :rules="[rules.required, rules.contactFormat]"
                placeholder="(88) 00000-0000"
                class="custom-field"
                density="comfortable"
                mask="(##) #####-####"
              >
                <template #prepend-inner>
                  <div class="d-flex align-center mr-2">
                    <span class="mr-2" style="color: #667085">+55</span>
                    <v-divider vertical></v-divider>
                  </div>
                </template>
              </v-text-field>
            </div>

            <div>
              <label class="field-label">Plano</label>
              <v-select
                v-model="formData.plano"
                :items="planos"
                :rules="[rules.required]"
                placeholder="Selecione um plano"
                class="custom-field"
                density="comfortable"
              ></v-select>
            </div>

            <div>
              <label class="field-label">Status</label>
              <v-select
                v-model="formData.status"
                :items="status"
                :rules="[rules.required]"
                placeholder="Selecione o status"
                class="custom-field"
                density="comfortable"
              ></v-select>
            </div>
          </v-col>
        </v-row>

        <!-- BOTÕES -->
        <v-row class="mt-6">
          <v-col cols="12" class="d-flex justify-center">
            <v-btn
              :disabled="!valid"
              color="#4CAF50"
              style="color: white; font-weight: 600; width: 180px; height: 48px"
              class="rounded-lg"
              @click="submitForm"
            >
              SALVAR
            </v-btn>

            <v-btn
              color="#344054"
              class="ml-4 rounded-lg"
              style="color: white; width: 180px; height: 48px"
              @click="cancelForm"
            >
              CANCELAR
            </v-btn>
          </v-col>
        </v-row>

      </v-form>
    </v-card>
  </v-container>
</template>

<script lang="ts">
export default {
  name: 'CadastroEmpresas',

  data() {
    return {
      valid: false,

      formData: {
        nome: '',
        email: '',
        cnpj: '',
        contato: '',
        status: '',
        plano: ''
      },

      status: ['Ativo', 'Inativo'],
      planos: ['Plano 1', 'Plano 2', 'Plano 3', 'Plano 4'],

      rules: {
        required: v => !!v || "Campo obrigatório.",
        email: v => /.+@.+\..+/.test(v) || "Email inválido.",
        contactFormat: v =>
          (v && v.replace(/[^0-9]/g, "").length >= 10) ||
          "Contato deve ter pelo menos 10 dígitos."
      }
    };
  },

  methods: {
    goBack() {
      this.$router.go(-1);
    },

    async submitForm() {
      const { valid } = await this.$refs.form.validate();

      if (!valid) return;

      console.log("Enviando dados:", this.formData);
      alert("Empresa cadastrada com sucesso!");
      this.resetForm();
    },

    resetForm() {
      this.formData = {
        nome: '',
        email: '',
        cnpj: '',
        contato: '',
        status: '',
        plano: ''
      };
    },

    cancelForm() {
      this.resetForm();
    }
  }
};
</script>

<style scoped>
.field-label {
  font-size: 14px;
  font-weight: 500;
  color: #344054;
  margin-bottom: 6px;
  display: block;
}

.custom-field :deep(.v-field__field) {
  background: #F9FAFB;
  border: 1px solid #D0D5DD;
  border-radius: 8px;
}
</style>
