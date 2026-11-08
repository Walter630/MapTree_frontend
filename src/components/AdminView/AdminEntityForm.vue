<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiConnect, type Manager } from '@/plugins/apiConnect'
import PageHeader from '@/components/shared/PageHeader.vue'
import { getApiErrorMessage } from '@/utils/apiError'
const props = defineProps<{ kind: 'company' | 'manager' }>()
const router = useRouter()
const isCompany = computed(() => props.kind === 'company')
const backPath = computed(() => (isCompany.value ? '/admin/companies' : '/admin/managers'))
const loadingOptions = ref(false)
const saving = ref(false)
const error = ref('')
const optionsError = ref('')
const form = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
const managers = ref<Manager[]>([])
const fields = reactive({
  name: '',
  taxId: '',
  managerId: '',
  isOutsourced: false,
  email: '',
  cpf: '',
  phone: '',
  password: '',
  organizationId: null as string | null,
  isActive: true,
})
const required = (value: unknown) => !!String(value || '').trim() || 'Preencha este campo.'
async function loadOptions() {
  loadingOptions.value = true
  optionsError.value = ''
  try {
    if (isCompany.value) {
      const { data } = await apiConnect.get<Manager[]>('/users', { params: { role: 'MANAGER' } })
      managers.value = data.filter((manager) => manager.isActive && !manager.organizationId)
    }
  } catch (cause) {
    optionsError.value = getApiErrorMessage(
      cause,
      'Não foi possível carregar os vínculos disponíveis.',
    )
  } finally {
    loadingOptions.value = false
  }
}
async function save() {
  if (saving.value) return
  saving.value = true
  error.value = ''
  try {
    if (!(await form.value?.validate())?.valid) return
    if (isCompany.value) {
      await apiConnect.post('/organizations', {
        name: fields.name.trim(),
        taxId: fields.taxId.replace(/\D/g, ''),
        managerId: fields.managerId,
        isOutsourced: fields.isOutsourced,
        isActive: fields.isActive,
      })
    } else {
      await apiConnect.post('/users', {
        name: fields.name.trim(),
        email: fields.email.trim(),
        cpf: fields.cpf.replace(/\D/g, ''),
        phone: fields.phone.replace(/\D/g, ''),
        password: fields.password,
        role: 'MANAGER',
        isActive: fields.isActive,
        ...(fields.organizationId ? { organizationId: fields.organizationId } : {}),
      })
    }
    await router.push(backPath.value)
  } catch (cause) {
    error.value = getApiErrorMessage(
      cause,
      'Não foi possível concluir o cadastro. Confira os dados e tente novamente.',
    )
  } finally {
    saving.value = false
  }
}
onMounted(loadOptions)
</script>
<template>
  <v-container fluid class="page-shell">
    <PageHeader
      :title="isCompany ? 'Nova empresa' : 'Novo gestor'"
      :subtitle="
        isCompany
          ? 'Cadastre a organização e defina quem vai acompanhar a operação.'
          : 'Adicione um responsável para organizar a equipe e os serviços.'
      "
      :breadcrumbs="[
        { text: 'Administração', to: '/admin' },
        { text: isCompany ? 'Empresas' : 'Gestores', to: backPath },
        { text: 'Novo cadastro' },
      ]"
    />
    <div class="admin-form-layout">
      <section class="entity-form-panel">
        <div class="form-section-heading">
          <v-avatar color="blue-lighten-5" rounded="lg" size="42"
            ><v-icon color="blue-darken-2">{{
              isCompany ? 'mdi-domain-plus' : 'mdi-account-tie-outline'
            }}</v-icon></v-avatar
          >
          <div>
            <h2>{{ isCompany ? 'Dados da empresa' : 'Dados do responsável' }}</h2>
            <p>Os campos marcados com * são obrigatórios.</p>
          </div>
        </div>
        <v-alert v-if="error" type="error" role="alert" variant="tonal" class="mb-5">{{
          error
        }}</v-alert>
        <v-alert v-if="optionsError" type="warning" variant="tonal" class="mb-5"
          >{{ optionsError
          }}<v-btn variant="text" size="small" @click="loadOptions"
            >Tentar novamente</v-btn
          ></v-alert
        >
        <v-form ref="form" :disabled="saving" @submit.prevent="save"
          ><div class="form-fields">
            <v-text-field
              v-model="fields.name"
              :label="isCompany ? 'Nome da empresa *' : 'Nome completo *'"
              variant="outlined"
              :rules="[required]"
              maxlength="150"
              class="full-field"
            />
            <template v-if="isCompany"
              ><v-text-field
                v-model="fields.taxId"
                label="CNPJ *"
                placeholder="00.000.000/0000-00"
                variant="outlined"
                :rules="[
                  required,
                  (v) => v.replace(/\D/g, '').length === 14 || 'Informe os 14 dígitos do CNPJ.',
                ]"
              /><v-select
                v-model="fields.isOutsourced"
                label="Tipo de organização"
                :items="[
                  { title: 'Operação própria', value: false },
                  { title: 'Terceirizada', value: true },
                ]"
                variant="outlined"
              /><v-autocomplete
                v-model="fields.managerId"
                :items="managers"
                item-title="name"
                item-value="id"
                label="Gestor responsável *"
                variant="outlined"
                :rules="[required]"
                :loading="loadingOptions"
                no-data-text="Nenhum gestor ativo sem vínculo"
                class="full-field"
              /><v-alert
                v-if="!loadingOptions && !optionsError && !managers.length"
                type="info"
                variant="tonal"
                class="full-field mb-4"
                >Cadastre um gestor sem empresa antes de concluir este vínculo.<v-btn
                  to="/admin/register-managers"
                  variant="text"
                  size="small"
                  >Cadastrar gestor</v-btn
                ></v-alert
              ></template
            >
            <template v-else
              ><v-text-field
                v-model="fields.email"
                label="E-mail *"
                type="email"
                autocomplete="email"
                variant="outlined"
                :rules="[
                  required,
                  (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Informe um e-mail válido.',
                ]"
              /><v-text-field
                v-model="fields.cpf"
                label="CPF *"
                placeholder="000.000.000-00"
                variant="outlined"
                :rules="[
                  required,
                  (v) => v.replace(/\D/g, '').length === 11 || 'Informe os 11 dígitos do CPF.',
                ]"
              /><v-text-field
                v-model="fields.phone"
                label="Telefone com DDD *"
                type="tel"
                variant="outlined"
                :rules="[
                  required,
                  (v) => v.replace(/\D/g, '').length >= 10 || 'Informe o telefone com DDD.',
                ]"
              /><v-text-field
                v-model="fields.password"
                label="Senha inicial *"
                type="password"
                autocomplete="new-password"
                variant="outlined"
                :rules="[required, (v) => v.length >= 8 || 'Use pelo menos 8 caracteres.']"
              /><v-alert type="info" variant="tonal" class="full-field mb-4"
                >Você pode criar o gestor primeiro e vinculá-lo ao cadastrar a empresa.</v-alert
              ></template
            >
            <v-select
              v-model="fields.isActive"
              :items="[
                { title: 'Ativo', value: true },
                { title: 'Inativo', value: false },
              ]"
              label="Status inicial"
              variant="outlined"
            />
          </div>
          <div class="form-actions">
            <v-btn variant="outlined" :disabled="saving" :to="backPath">Cancelar</v-btn
            ><v-btn
              type="submit"
              color="blue-darken-2"
              variant="flat"
              prepend-icon="mdi-check"
              :loading="saving"
              :disabled="isCompany && (!!optionsError || loadingOptions)"
              >{{ isCompany ? 'Cadastrar empresa' : 'Cadastrar gestor' }}</v-btn
            >
          </div></v-form
        >
      </section>
      <aside class="form-guide">
        <span class="guide-eyebrow">Administração MapTree</span>
        <h3>
          {{ isCompany ? 'Uma operação bem organizada' : 'Acesso para quem organiza a equipe' }}
        </h3>
        <p>
          {{
            isCompany
              ? 'O gestor vinculado acompanha os funcionários e os serviços da organização.'
              : 'O perfil de gestor permite acompanhar a equipe e suas operações, sem as permissões de administrador.'
          }}
        </p>
        <div class="guide-step">
          <span>1</span>
          <div>
            <strong>Confira os dados</strong>
            <p>
              {{
                isCompany
                  ? 'Use o nome e o CNPJ da organização.'
                  : 'Revise nome, CPF e e-mail do responsável.'
              }}
            </p>
          </div>
        </div>
        <div class="guide-step">
          <span>2</span>
          <div>
            <strong>{{ isCompany ? 'Defina o responsável' : 'Prepare o acesso' }}</strong>
            <p>
              {{
                isCompany
                  ? 'Selecione um gestor ativo e disponível.'
                  : 'Defina a senha inicial e o status da conta.'
              }}
            </p>
          </div>
        </div>
        <div class="guide-step">
          <span>3</span>
          <div>
            <strong>Acompanhe o cadastro</strong>
            <p>Depois de salvar, consulte ou edite os dados na listagem.</p>
          </div>
        </div>
      </aside>
    </div>
  </v-container>
</template>
<style scoped>
.admin-form-layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr);
  gap: 24px;
  align-items: start;
}
.entity-form-panel {
  padding: 28px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
}
.form-section-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 24px;
  margin-bottom: 26px;
  border-bottom: 1px solid #f1f5f9;
}
.form-section-heading h2 {
  font-size: 1rem;
  color: #1e293b;
}
.form-section-heading p {
  color: #64748b;
  font-size: 0.77rem;
  margin-top: 5px;
}
.form-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 18px;
}
.full-field {
  grid-column: 1/-1;
}
.form-actions {
  border-top: 1px solid #f1f5f9;
  padding-top: 22px;
  margin-top: 8px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
.form-guide {
  padding: 26px;
  background: #edf2f9;
  border: 1px solid #dde5f0;
  border-radius: 16px;
}
.guide-eyebrow {
  font-size: 0.65rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 700;
}
.form-guide h3 {
  color: #334155;
  font-size: 1.2rem;
  line-height: 1.4;
  margin: 12px 0;
}
.form-guide > p,
.guide-step p {
  color: #64748b;
  font-size: 0.8rem;
  line-height: 1.7;
}
.guide-step {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}
.guide-step > span {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border: 1px solid #cbd5e1;
  border-radius: 50%;
  font-size: 0.75rem;
  color: #475569;
}
.guide-step strong {
  font-size: 0.8rem;
  color: #334155;
}
.guide-step p {
  margin-top: 4px;
}
@media (max-width: 900px) {
  .admin-form-layout {
    grid-template-columns: 1fr;
  }
  .form-guide {
    order: 2;
  }
}
@media (max-width: 600px) {
  .entity-form-panel {
    padding: 20px 16px;
  }
  .form-fields {
    grid-template-columns: 1fr;
  }
  .form-actions {
    flex-direction: column-reverse;
  }
  .form-actions .v-btn {
    width: 100%;
  }
}
</style>
