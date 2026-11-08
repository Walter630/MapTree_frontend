<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { apiConnect, type Company, type Manager } from '@/plugins/apiConnect'
import PageHeader from '@/components/shared/PageHeader.vue'
import { getApiErrorMessage } from '@/utils/apiError'
const props = defineProps<{ kind: 'companies' | 'managers' }>()
type ManagerRow = Manager & { organization?: { id: string; name: string } | null }
type Row = (Company | ManagerRow) & { relatedName: string }
const isCompany = computed(() => props.kind === 'companies')
const title = computed(() => (isCompany.value ? 'Empresas' : 'Gestores'))
const singular = computed(() => (isCompany.value ? 'empresa' : 'gestor'))
const endpoint = computed(() => (isCompany.value ? '/organizations' : '/users'))
const createPath = computed(() =>
  isCompany.value ? '/admin/register-company' : '/admin/register-managers',
)
const records = ref<Row[]>([])
const search = ref('')
const status = ref('all')
const page = ref(1)
const loading = ref(false)
const error = ref('')
const saving = ref(false)
const editOpen = ref(false)
const deleteOpen = ref(false)
const selected = ref<Row | null>(null)
const actionError = ref('')
const snackbar = ref(false)
const message = ref('')
const editForm = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
const fields = reactive({ name: '', email: '', taxId: '', phone: '', isActive: true })
const active = computed(() => records.value.filter((record) => record.isActive).length)
const unlinked = computed(() => records.value.filter((record) => !record.relatedName).length)
const filtered = computed(() =>
  records.value.filter((record) => {
    const term = (search.value || '').trim().toLocaleLowerCase('pt-BR')
    const identifier = 'taxId' in record ? record.taxId : record.email
    return (
      `${record.name} ${identifier} ${record.relatedName}`
        .toLocaleLowerCase('pt-BR')
        .includes(term) &&
      (status.value === 'all' || record.isActive === (status.value === 'active'))
    )
  }),
)
const headers = computed(() => [
  { title: isCompany.value ? 'Empresa' : 'Gestor', key: 'name' },
  { title: isCompany.value ? 'CNPJ' : 'E-mail', key: 'identifier' },
  { title: isCompany.value ? 'Responsável' : 'Empresa vinculada', key: 'relatedName' },
  { title: 'Status', key: 'isActive' },
  { title: 'Ações', key: 'actions', sortable: false, align: 'end' as const },
])
watch([search, status], () => {
  page.value = 1
})
watch(() => props.kind, load)
async function load() {
  loading.value = true
  error.value = ''
  try {
    const all: (Company | ManagerRow)[] = []
    if (isCompany.value) {
      for (let current = 1; ; current++) {
        const { data } = await apiConnect.get<Company[]>('/organizations', {
          params: { page: current, limit: 100 },
        })
        all.push(...data)
        if (data.length < 100) break
      }
    } else {
      const { data } = await apiConnect.get<ManagerRow[]>('/users', { params: { role: 'MANAGER' } })
      all.push(...data)
    }
    records.value = all.map((record) => ({
      ...record,
      relatedName: 'taxId' in record ? record.manager?.name || '' : record.organization?.name || '',
    }))
  } catch (cause) {
    error.value = getApiErrorMessage(
      cause,
      `Não foi possível carregar ${title.value.toLowerCase()}.`,
    )
  } finally {
    loading.value = false
  }
}
function openEdit(record: Row) {
  selected.value = record
  Object.assign(fields, {
    name: record.name,
    taxId: 'taxId' in record ? record.taxId : '',
    email: 'email' in record ? record.email : '',
    phone: 'phone' in record ? record.phone : '',
    isActive: record.isActive,
  })
  actionError.value = ''
  editOpen.value = true
}
function openDelete(record: Row) {
  selected.value = record
  actionError.value = ''
  deleteOpen.value = true
}
async function saveEdit() {
  if (saving.value || !selected.value) return
  saving.value = true
  actionError.value = ''
  try {
    if (!(await editForm.value?.validate())?.valid) return
    const payload = isCompany.value
      ? {
          name: fields.name.trim(),
          taxId: fields.taxId.replace(/\D/g, ''),
          isActive: fields.isActive,
        }
      : {
          name: fields.name.trim(),
          email: fields.email.trim(),
          phone: fields.phone,
          isActive: fields.isActive,
        }
    await apiConnect.patch(`${endpoint.value}/${selected.value.id}`, payload)
    editOpen.value = false
    message.value = 'Cadastro atualizado com sucesso.'
    snackbar.value = true
    await load()
  } catch (cause) {
    actionError.value = getApiErrorMessage(
      cause,
      'Não foi possível salvar. Os dados foram preservados.',
    )
  } finally {
    saving.value = false
  }
}
async function remove() {
  if (saving.value || !selected.value) return
  saving.value = true
  actionError.value = ''
  try {
    await apiConnect.delete(`${endpoint.value}/${selected.value.id}`)
    deleteOpen.value = false
    message.value = 'Cadastro excluído.'
    snackbar.value = true
    await load()
  } catch (cause) {
    actionError.value = getApiErrorMessage(
      cause,
      'Não foi possível excluir. Verifique os vínculos deste cadastro.',
    )
  } finally {
    saving.value = false
  }
}
onMounted(load)
</script>
<template>
  <v-container fluid class="page-shell admin-list">
    <div class="resource-header">
      <PageHeader
        :title="title"
        :subtitle="
          isCompany
            ? 'Organize os vínculos e acompanhe as organizações do sistema.'
            : 'Gerencie os responsáveis e o acesso às equipes.'
        "
        :breadcrumbs="[{ text: 'Administração', to: '/admin' }, { text: title }]"
        :show-back-button="false"
      /><v-btn :to="createPath" color="blue-darken-2" prepend-icon="mdi-plus" size="large">{{
        isCompany ? 'Nova empresa' : 'Novo gestor'
      }}</v-btn>
    </div>
    <v-alert v-if="error" role="alert" type="error" variant="tonal" class="mb-5"
      >{{ error
      }}<template #append
        ><v-btn variant="text" @click="load">Tentar novamente</v-btn></template
      ></v-alert
    >
    <section class="resource-metrics" :aria-label="`Resumo de ${title.toLowerCase()}`">
      <article>
        <span>Total de {{ title.toLowerCase() }}</span
        ><strong>{{ loading || error ? '—' : records.length }}</strong
        ><small>Cadastros no sistema</small>
      </article>
      <article>
        <span>{{ isCompany ? 'Empresas ativas' : 'Gestores ativos' }}</span
        ><strong>{{ loading || error ? '—' : active }}</strong
        ><small>Disponíveis para a operação</small>
      </article>
      <article>
        <span>{{ isCompany ? 'Sem responsável' : 'Sem empresa vinculada' }}</span
        ><strong>{{ loading || error ? '—' : unlinked }}</strong
        ><small>Vínculos que podem ser revisados</small>
      </article>
    </section>
    <section class="resource-table">
      <div class="table-heading">
        <div>
          <h2>{{ isCompany ? 'Empresas cadastradas' : 'Gestores cadastrados' }}</h2>
          <p>Busque, revise e mantenha os cadastros atualizados.</p>
        </div>
        <v-btn
          icon="mdi-refresh"
          aria-label="Atualizar cadastros"
          variant="text"
          :loading="loading"
          @click="load"
        />
      </div>
      <div class="resource-filters">
        <v-text-field
          v-model="search"
          :label="
            isCompany ? 'Buscar empresa, CNPJ ou responsável' : 'Buscar nome, e-mail ou empresa'
          "
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          hide-details
          clearable
        /><v-select
          v-model="status"
          :items="[
            { title: 'Todos os status', value: 'all' },
            { title: 'Ativos', value: 'active' },
            { title: 'Inativos', value: 'inactive' },
          ]"
          label="Status"
          variant="outlined"
          density="compact"
          hide-details
        />
      </div>
      <v-data-table
        v-model:page="page"
        :headers="headers"
        :items="filtered"
        :items-per-page="10"
        :loading="loading"
        :hide-default-body="!!error"
        items-per-page-text="Registros por página"
        :items-per-page-options="[10, 20, 50]"
        no-data-text="Nenhum cadastro encontrado"
        loading-text="Carregando cadastros..."
        class="resource-data"
      >
        <template #[`item.name`]="{ item }"
          ><div class="entity-name">
            <v-avatar
              :color="isCompany ? 'blue-lighten-5' : 'indigo-lighten-5'"
              rounded="lg"
              size="36"
              ><v-icon :color="isCompany ? 'blue-darken-2' : 'indigo-darken-2'" size="20">{{
                isCompany ? 'mdi-domain' : 'mdi-account-tie-outline'
              }}</v-icon></v-avatar
            ><strong>{{ item.name }}</strong>
          </div></template
        >
        <template #[`item.identifier`]="{ item }">{{
          'taxId' in item ? item.taxId : item.email
        }}</template>
        <template #[`item.relatedName`]="{ item }"
          ><span :class="{ 'text-grey': !item.relatedName }">{{
            item.relatedName || 'Sem vínculo'
          }}</span></template
        >
        <template #[`item.isActive`]="{ item }"
          ><v-chip
            size="small"
            variant="tonal"
            :color="item.isActive ? 'teal-darken-2' : 'grey-darken-1'"
            >{{ item.isActive ? 'Ativo' : 'Inativo' }}</v-chip
          ></template
        >
        <template #[`item.actions`]="{ item }"
          ><v-btn
            icon="mdi-pencil-outline"
            variant="text"
            size="small"
            color="blue-darken-2"
            :aria-label="`Editar ${item.name}`"
            @click="openEdit(item)" /><v-btn
            icon="mdi-delete-outline"
            variant="text"
            size="small"
            color="grey-darken-1"
            :aria-label="`Excluir ${item.name}`"
            @click="openDelete(item)"
        /></template>
      </v-data-table>
    </section>
    <v-dialog v-model="editOpen" max-width="540" :persistent="saving"
      ><v-card rounded="xl" :title="`Editar ${singular}`"
        ><v-card-text
          ><v-alert v-if="actionError" role="alert" type="error" variant="tonal" class="mb-4">{{
            actionError
          }}</v-alert
          ><v-form ref="editForm" :disabled="saving"
            ><v-text-field
              v-model="fields.name"
              label="Nome"
              variant="outlined"
              :rules="[(v) => !!v?.trim() || 'Informe o nome.']"
            /><v-text-field
              v-if="isCompany"
              v-model="fields.taxId"
              label="CNPJ"
              variant="outlined"
              :rules="[
                (v) => v?.replace(/\D/g, '').length === 14 || 'Informe os 14 dígitos do CNPJ.',
              ]"
            /><template v-else
              ><v-text-field
                v-model="fields.email"
                label="E-mail"
                type="email"
                variant="outlined"
                :rules="[
                  (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Informe um e-mail válido.',
                ]" /><v-text-field
                v-model="fields.phone"
                label="Telefone"
                variant="outlined" /></template
            ><v-select
              v-model="fields.isActive"
              :items="[
                { title: 'Ativo', value: true },
                { title: 'Inativo', value: false },
              ]"
              label="Status do cadastro"
              variant="outlined"
            />
            <p class="text-body-2 text-grey-darken-1">
              {{
                isCompany
                  ? 'O responsável vinculado permanece o mesmo.'
                  : 'A empresa vinculada permanece a mesma.'
              }}
            </p></v-form
          ></v-card-text
        ><v-card-actions
          ><v-btn :disabled="saving" @click="editOpen = false">Cancelar</v-btn><v-spacer /><v-btn
            color="blue-darken-2"
            variant="flat"
            :loading="saving"
            @click="saveEdit"
            >Salvar alterações</v-btn
          ></v-card-actions
        ></v-card
      ></v-dialog
    >
    <v-dialog v-model="deleteOpen" max-width="460" :persistent="saving"
      ><v-card rounded="xl" :title="`Excluir ${singular}?`"
        ><v-card-text
          ><v-alert v-if="actionError" role="alert" type="error" variant="tonal" class="mb-4">{{
            actionError
          }}</v-alert
          ><strong>{{ selected?.name }}</strong>
          <p class="mt-3">
            A exclusão é permanente. Cadastros vinculados a outros registros podem não permitir
            remoção.
          </p></v-card-text
        ><v-card-actions
          ><v-btn :disabled="saving" @click="deleteOpen = false">Cancelar</v-btn><v-spacer /><v-btn
            color="error"
            variant="flat"
            :loading="saving"
            @click="remove"
            >Excluir cadastro</v-btn
          ></v-card-actions
        ></v-card
      ></v-dialog
    >
    <v-snackbar v-model="snackbar" color="blue-darken-3">{{ message }}</v-snackbar>
  </v-container>
</template>
<style scoped>
.resource-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 8px;
}
.resource-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin: 12px 0 24px;
}
.resource-metrics article {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 22px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #fff;
}
.resource-metrics span {
  font-size: 0.8rem;
  color: #64748b;
}
.resource-metrics strong {
  font-size: 1.9rem;
  line-height: 1;
  color: #1e293b;
}
.resource-metrics small {
  font-size: 0.73rem;
  color: #94a3b8;
}
.resource-table {
  border: 1px solid #e2e8f0;
  border-radius: 15px;
  background: #fff;
  overflow: hidden;
}
.table-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
}
.table-heading h2 {
  font-size: 1rem;
}
.table-heading p {
  font-size: 0.78rem;
  color: #64748b;
  margin-top: 5px;
}
.resource-filters {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 190px;
  gap: 14px;
  padding: 20px 24px;
}
.resource-data :deep(th) {
  background: #f8fafc;
  color: #64748b;
  font-size: 0.75rem;
}
.resource-data :deep(td) {
  padding-top: 12px !important;
  padding-bottom: 12px !important;
  font-size: 0.82rem;
}
.entity-name {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 150px;
}
.entity-name strong {
  overflow-wrap: anywhere;
}
@media (max-width: 700px) {
  .resource-header {
    align-items: flex-start;
    flex-direction: column;
    margin-bottom: 20px;
  }
  .resource-metrics {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .resource-metrics article {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 8px;
    padding: 16px;
  }
  .resource-metrics strong {
    grid-row: span 2;
    font-size: 1.6rem;
  }
  .resource-filters {
    grid-template-columns: 1fr;
    padding: 16px;
  }
  .table-heading {
    padding: 16px;
  }
}
</style>
