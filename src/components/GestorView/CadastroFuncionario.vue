<template>
  <v-container class="cadastro-funcionario-container" >
    <div class="text-caption grey--text text--darken-1" style="margin-bottom: 20px; color: #667085;">
      Meu Painel > Funcionários > #CadastrarFuncionário
    </div>
    <v-row class="mb-5 align-center">

      <v-col cols="12" sm="auto" class="py-0">
        <v-btn class="mr-4" style="box-shadow: none; border: 1px solid; height: 56px; border-radius: 8px; background-color: #D0D5DD; width: 56px" @click="goBack">
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>

      </v-col>

      <v-col cols="12" sm="auto"  class="py-1">

        <h1 class="text-h5 font-weight-regular mt-1" style="color: #2F3367; margin-top: 20px; ">
          Cadastro de Funcionário
        </h1>
        <p class="text-subtitle-1 grey--text">
          Cadastre Os Funcionários E Suas Funções.
        </p>
      </v-col>
    </v-row>



    <v-form ref="form" v-model="valid" lazy-validation style="margin-top: 50px; " >
      <v-row style="display: flex; justify-content: center; gap: 15px">
        <v-col cols="12" md="4" >
          <p>Nome do Funcionario</p>
          <v-text-field
            v-model="formData.nome"
            :rules="[rules.required]"
            label="Nome do Funcionário"
            placeholder="Digite o nome"
            outlined
            dense
          ></v-text-field>
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
            v-model="formData.senha"
            :rules="[rules.required, rules.minPassword]"
            label="Senha"
            placeholder="Digite a senha"
            type="password"
            outlined
            dense
          ></v-text-field>
          <p>Função</p>
          <v-select
            v-model="formData.funcao"
            :items="funcoes"
            :rules="[rules.required]"
            label="Função"
            placeholder="Poda"
            outlined
            dense
          ></v-select>
        </v-col>

        <v-col cols="12" md="4">
          <p>Numero do Contato</p>
          <v-text-field
            v-model="formData.contato"
            :rules="[rules.required, rules.contactFormat]"
            label="Número de Contato"
            placeholder="(88) 00000-0000"
            outlined
            dense
            mask="(##) #####-####"
          >
            <template v-slot:prepend-inner>
              <div class="d-flex align-center mr-2">
                <span class="mr-2">+1</span>
                <v-divider vertical></v-divider>
              </div>
            </template>

          </v-text-field>
          <p>Cidade</p>
          <v-select
            v-model="formData.cidade"
            :items="cidades"
            :rules="[rules.required]"
            label="Cidade"
            placeholder="Fortaleza, Ce"
            outlined
            dense
          ></v-select>
        </v-col>
      </v-row>

      <v-row class="mt-4">
        <v-col cols="12" class="d-flex justify-center">
          <v-btn
            :disabled="!valid"
            color="#A7D129"
            dark
            large
            class="mr-4"
            @click="submitForm"
          >
            SALVAR
          </v-btn>

          <v-btn
            color="black"
            dark
            large
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
export default {
  name: 'CadastroFuncionario',
  data() {
    return {
      valid: false,
      search: '',
      formData: {
        nome: '',
        email: '',
        senha: '',
        funcao: null,
        contato: '',
        cidade: null,
      },
      funcoes: ['Poda', 'Plantio', 'Irrigação', 'Administrativo'],
      cidades: ['Fortaleza, Ce', 'Limoeiro do Norte, Ce', 'Aquiraz, Ce', 'Eusébio, Ce'],
      rules: {
        required: value => !!value || 'Campo obrigatório.',
        email: value => {
          const pattern = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
          return pattern.test(value) || 'Email inválido.'
        },
        minPassword: v => v.length >= 6 || 'A senha deve ter pelo menos 6 caracteres.',
        // Uma regra de validação básica para o formato de contato (pode ser ajustada)
        contactFormat: v => (v && v.replace(/[^0-9]/g, '').length >= 10) || 'Contato deve ter pelo menos 10 dígitos (DDD + Número).'
      },
    };
  },
  methods: {
    goBack() {
      // Lógica para voltar, como this.$router.go(-1) ou um evento de emit
      this.$router.push("/gestor/funcionarios")
    },
    performSearch() {
      // Lógica de pesquisa
      console.log('Pesquisar por:', this.search);
    },
    clearSearch() {
      this.search = '';
    },
    async submitForm() {
      // A função validate() do v-form retorna um objeto de promessa
      const { valid } = await this.$refs.form.validate();

      if (valid) {
        console.log('Formulário Válido, enviando dados:', this.formData);
        // Lógica de envio de dados para a API/Backend
        alert('Funcionário Cadastrado com Sucesso!');
        this.resetForm();
      } else {
        console.log('Formulário Inválido');
      }
    },
    resetForm() {
      this.$refs.form.reset();
      this.formData = {
        nome: '',
        email: '',
        senha: '',
        funcao: null,
        contato: '',
        cidade: null,
      };
    },
    cancelForm() {
      // Lógica para cancelar, como resetar o formulário ou redirecionar
      console.log('Ação de Cancelar');
      this.resetForm();
    },
  },
};
</script>

<style scoped>
/* Estilos opcionais para dar um respiro maior e garantir que o layout se pareça com a imagem */
.cadastro-funcionario-container {

  margin-top: 20px;
  padding: 24px;

}

/* Ajuste para o campo de contato, simulando o campo de código de país como parte do input */
.v-text-field:deep(.v-input__prepend-inner) .v-divider {
  height: 70%; /* Altura da linha vertical */
  margin-right: 8px;
  margin-left: -4px; /* Move um pouco para a esquerda */
}

/* Estilo para ajustar o alinhamento da label "Email - Endereço de Email" */
.v-text-field:deep(.v-label) span {
  font-size: 0.75rem; /* Menor que a label principal */
  font-weight: 400;
}
</style>
