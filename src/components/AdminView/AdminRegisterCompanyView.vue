<template>
  <v-container fluid class="bg-grey-lighten-4 pa-6">

    <PageHeader
      title="Cadastro de Empresas"
      subtitle="Cadastre as empresas e seus dados principais."
      :breadcrumbs="[
        { text: 'Meu Painel', to: '/admin' },
        { text: 'Empresas', to: '/admin/companies' },
        { text: '#CadastrarEmpresas' },
      ]"
    />

    <!-- CARD DO FORMULÁRIO -->
    <v-card
      elevation="0"
      class="pa-8"
      style="background: white; margin: 0 0"
    >
      <v-form ref="form" v-model="valid" lazy-validation>
        <v-row>
          <!-- COLUNA 1 -->
          <v-col cols="12" md="6" class="d-flex flex-column gap-4">
            <div>
              <label class="field-label">Nome da Empresa</label>
              <v-text-field
                v-model="name"
                placeholder="Digite o nome"
                class="custom-field"
              ></v-text-field>
            </div>

            <div>
              <label class="field-label">CNPJ</label>
              <v-text-field
                v-model="taxId"
                placeholder="Digite o CNPJ"
                class="custom-field"
                density="comfortable"
              ></v-text-field>
            </div>
            <div>
              <label class="field-label">Gerente</label>
              <v-select
                v-model="managerId"
                :items="managers"
                item-title="name"
                item-value="id"
                label="Selecione o Gerente"
                class="custom-field"
              ></v-select>
            </div>
          </v-col>

          <!-- COLUNA 2 -->
          <v-col cols="12" md="6" class="d-flex flex-column gap-4">
            <div>
              <label class="field-label">Terceirizada</label>
              <v-select
                v-model="isOutsourced"
                :items="['Sim', 'Não']"
                placeholder="Selecione"
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
              @click="saveCompany"
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
import { defineComponent } from 'vue'
import { type Company } from '@/plugins/apiConnect.ts'
import { type User } from '@/plugins/apiConnect.ts'
import PageHeader from '@/components/shared/PageHeader.vue'

export default defineComponent ({
  components: { PageHeader },
  data() {
    return {
      managers: [] as User[],

      name: '',
      taxId: '',
      isOutsourced: false,
      managerId: '',
      isActive: true,
      valid: true,
      isMobile: false,
    }
  },

    mounted() {
      this.checkIsMobile()
      window.addEventListener('resize', this.checkIsMobile)

      // 👉 Buscar gestores
      this.loadManagers()
    },


  beforeUnmount() {
      window.removeEventListener('resize', this.checkIsMobile)
    },
    methods: {
      checkIsMobile() {
        this.isMobile = window.innerWidth < 960 // Ajuste o valor conforme necessário
      },
      goBack() {
        this.$router.push("/admin/companies");
      },

      async loadManagers() {
        try {
          const response = await this.$api.get('/users')
          this.managers = response.data
        } catch (err) {
          console.error("Erro ao carregar gestores:", err)
        }
      },


      async createCompany(companyData: any) {
        const response = await this.$api.post('/organizations', companyData)
        return response.data
      },


      async saveCompany() {
        try {
          const payload = {
            name: this.name,
            taxId: this.taxId,
            isOutsourced: this.isOutsourced === 'Sim',
            managerId: this.managerId,
            isActive: this.isActive,
          }

          await this.createCompany(payload)

          this.$router.push('/admin/companies')
        } catch (err) {
          console.error(err)
        }
      },


      cancelForm() {
        this.$router.push("/admin/companies");
      },

    }
})
</script>

<style scoped>
/* Estilos opcionais para dar um respiro maior e garantir que o layout se pareça com a imagem */
.field-label {
  font-size: 14px;
  font-weight: 500;
  color: #344054;
  margin-bottom: 6px;
  display: block;
}

.custom-field :deep(.v-field__field) {
  background: #f9fafb;
  border: 1px solid #d0d5dd;
  border-radius: 8px;
}

</style>
