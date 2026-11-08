<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { apiConnect, type Company, type Manager } from '@/plugins/apiConnect'
import { useAppStore } from '@/stores/app'

const store = useAppStore()
const companies = ref<Company[]>([])
const managers = ref<Manager[]>([])
const treeCount = ref<number | null>(null)
const speciesCount = ref<number | null>(null)
const loading = ref(false)
const failed = ref<string[]>([])
const search = ref('')
const status = ref('all')
const page = ref(1)
const importLoading = ref(false)
const cleanupLoading = ref(false)
const cleanupDialog = ref(false)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')
const today = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(new Date())
const number = (value: number) => value.toLocaleString('pt-BR')
const dateValue = (value?: Date) => (value ? new Date(value).getTime() || 0 : 0)
const formatDate = (value?: Date) =>
  dateValue(value) ? new Date(value!).toLocaleDateString('pt-BR') : 'Data não informada'
const activeCompanies = computed(() => companies.value.filter((company) => company.isActive).length)
const withoutManager = computed(
  () => companies.value.filter((company) => !company.manager?.id).length,
)
const companyDataReady = computed(() => !loading.value && !failed.value.includes('empresas'))
const filteredCompanies = computed(() => {
  const term = (search.value || '').trim().toLocaleLowerCase('pt-BR')
  return companies.value
    .filter((company) => {
      const matchesText = [company.name, company.taxId, company.manager?.name || ''].some((value) =>
        value.toLocaleLowerCase('pt-BR').includes(term),
      )
      return (
        matchesText && (status.value === 'all' || company.isActive === (status.value === 'active'))
      )
    })
    .sort(
      (a, b) =>
        dateValue(b.createdAt) - dateValue(a.createdAt) || a.name.localeCompare(b.name, 'pt-BR'),
    )
})
const pageCount = computed(() => Math.max(1, Math.ceil(filteredCompanies.value.length / 6)))
const visibleCompanies = computed(() =>
  filteredCompanies.value.slice((page.value - 1) * 6, page.value * 6),
)
const metrics = computed(() => [
  {
    label: 'Empresas',
    value: failed.value.includes('empresas') ? null : companies.value.length,
    icon: 'mdi-domain',
    note: 'Organizações cadastradas',
    to: '/admin/companies',
  },
  {
    label: 'Gestores',
    value: failed.value.includes('gestores') ? null : managers.value.length,
    icon: 'mdi-account-tie-outline',
    note: 'Responsáveis pela operação',
    to: '/admin/managers',
  },
  {
    label: 'Árvores',
    value: treeCount.value,
    icon: 'mdi-tree-outline',
    note: 'Registros no inventário',
    to: '/admin/map',
  },
  {
    label: 'Espécies',
    value: speciesCount.value,
    icon: 'mdi-sprout',
    note: 'Catálogo disponível',
    to: '/admin/map',
  },
])

async function countRecords(endpoint: string): Promise<number> {
  let total = 0
  const limit = 500
  for (let currentPage = 1; ; currentPage++) {
    const { data } = await apiConnect.get<{ id: string }[]>(endpoint, {
      params: { page: currentPage, limit },
    })
    total += data.length
    if (data.length < limit) return total
  }
}

async function loadDashboard() {
  if (loading.value) return
  loading.value = true
  failed.value = []
  const results = await Promise.allSettled([
    apiConnect.get<Company[]>('/organizations'),
    apiConnect.get<Manager[]>('/users', { params: { role: 'MANAGER' } }),
    countRecords('/trees'),
    countRecords('/species'),
  ])
  const [organizations, users, trees, species] = results
  if (organizations.status === 'fulfilled') companies.value = organizations.value.data
  if (users.status === 'fulfilled') managers.value = users.value.data
  treeCount.value = trees.status === 'fulfilled' ? trees.value : null
  speciesCount.value = species.status === 'fulfilled' ? species.value : null
  results.forEach((result, index) => {
    if (result.status === 'rejected')
      failed.value.push(['empresas', 'gestores', 'árvores', 'espécies'][index]!)
  })
  page.value = 1
  loading.value = false
}

function notify(text: string, color = 'success') {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}
async function importExternalData() {
  importLoading.value = true
  try {
    const { data } = await apiConnect.post<{ imported?: number }>('/trees/import-external')
    notify(`Importação concluída. ${number(data.imported || 0)} árvores adicionadas.`)
    await loadDashboard()
  } catch {
    notify('Não foi possível importar os dados. Tente novamente.', 'error')
  } finally {
    importLoading.value = false
  }
}
async function cleanupDuplicates() {
  cleanupLoading.value = true
  try {
    const { data } = await apiConnect.post<{ duplicatesRemoved?: number }>('/trees/cleanup')
    cleanupDialog.value = false
    notify(`Limpeza concluída. ${number(data.duplicatesRemoved || 0)} duplicatas removidas.`)
    await loadDashboard()
  } catch {
    notify('Não foi possível remover as duplicatas. Tente novamente.', 'error')
  } finally {
    cleanupLoading.value = false
  }
}
onMounted(loadDashboard)
</script>

<template>
  <v-container fluid class="dash admin-dashboard">
    <header class="admin-header">
      <div>
        <span class="eyebrow"
          ><v-icon size="15">mdi-shield-account-outline</v-icon> Administração do sistema</span
        >
        <h1>Olá, {{ store.user?.name?.split(' ')[0] || 'Administrador' }}!</h1>
        <p>Acompanhe as empresas, os responsáveis e o inventário do MapTree.</p>
      </div>
      <div class="header-actions">
        <span class="date-label"
          ><v-icon size="17">mdi-calendar-blank-outline</v-icon>{{ today }}</span
        >
        <v-btn
          variant="outlined"
          color="blue-darken-2"
          prepend-icon="mdi-refresh"
          :loading="loading"
          @click="loadDashboard"
          >Atualizar</v-btn
        >
        <v-btn color="blue-darken-2" prepend-icon="mdi-plus" to="/admin/register-company"
          >Nova empresa</v-btn
        >
      </div>
    </header>

    <v-alert v-if="failed.length" type="warning" variant="tonal" class="mb-5" role="alert">
      Não foi possível carregar: {{ failed.join(', ') }}. Os demais dados continuam disponíveis.
      <template #append
        ><v-btn variant="text" size="small" :loading="loading" @click="loadDashboard"
          >Tentar novamente</v-btn
        ></template
      >
    </v-alert>

    <section class="kpi-grid" aria-label="Resumo do sistema">
      <router-link v-for="metric in metrics" :key="metric.label" :to="metric.to" class="kpi">
        <div class="kpi-top">
          <span class="kpi-icon"
            ><v-icon size="23">{{ metric.icon }}</v-icon></span
          ><span>{{ metric.label }}</span
          ><v-icon class="metric-arrow" size="17">mdi-arrow-top-right</v-icon>
        </div>
        <v-skeleton-loader v-if="loading" type="text" class="metric-skeleton" />
        <strong v-else class="kpi-value">{{
          metric.value === null ? '—' : number(metric.value)
        }}</strong>
        <span class="kpi-note">{{
          !loading && metric.value === null ? 'Dados indisponíveis' : metric.note
        }}</span>
      </router-link>
    </section>

    <div class="dashboard-body">
      <section class="panel company-panel" aria-labelledby="companies-title">
        <div class="panel-head">
          <div>
            <h2 id="companies-title"><v-icon size="20">mdi-domain</v-icon>Empresas cadastradas</h2>
            <p>Organizações mais recentes e seus responsáveis.</p>
          </div>
          <v-btn
            to="/admin/companies"
            size="small"
            variant="text"
            color="blue-darken-2"
            append-icon="mdi-arrow-right"
            >Ver todas</v-btn
          >
        </div>
        <div class="company-filters">
          <v-text-field
            v-model="search"
            label="Buscar empresa, CNPJ ou gestor"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            hide-details
            clearable
            @update:model-value="page = 1"
          />
          <v-select
            v-model="status"
            :items="[
              { title: 'Todos os status', value: 'all' },
              { title: 'Ativas', value: 'active' },
              { title: 'Inativas', value: 'inactive' },
            ]"
            label="Status"
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="page = 1"
          />
        </div>
        <v-skeleton-loader v-if="loading" type="table-tbody" />
        <div v-else-if="failed.includes('empresas')" class="empty-state">
          <v-icon size="36">mdi-cloud-alert-outline</v-icon>
          <h3>Empresas indisponíveis</h3>
          <p>Não conseguimos consultar as organizações agora.</p>
          <v-btn variant="tonal" color="blue-darken-2" @click="loadDashboard"
            >Tentar novamente</v-btn
          >
        </div>
        <div v-else-if="!filteredCompanies.length" class="empty-state">
          <v-icon size="36">mdi-domain-off</v-icon>
          <h3>
            {{
              companies.length ? 'Nenhuma empresa encontrada' : 'Sua primeira empresa começa aqui'
            }}
          </h3>
          <p>
            {{
              companies.length
                ? 'Tente outro nome ou altere o filtro de status.'
                : 'Cadastre uma organização e vincule um gestor à operação.'
            }}
          </p>
          <v-btn
            v-if="!companies.length"
            color="blue-darken-2"
            to="/admin/register-company"
            prepend-icon="mdi-plus"
            >Cadastrar empresa</v-btn
          >
        </div>
        <template v-else>
          <div class="company-table-wrap">
            <table class="company-table">
              <thead>
                <tr>
                  <th scope="col">Empresa</th>
                  <th scope="col">Gestor responsável</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="company in visibleCompanies" :key="company.id">
                  <td>
                    <strong>{{ company.name }}</strong
                    ><span>{{ formatDate(company.createdAt) }}</span>
                  </td>
                  <td>{{ company.manager?.name || 'Sem gestor vinculado' }}</td>
                  <td>
                    <v-chip
                      size="small"
                      variant="tonal"
                      :color="company.isActive ? 'green-darken-3' : 'grey-darken-2'"
                      :prepend-icon="
                        company.isActive ? 'mdi-check-circle-outline' : 'mdi-pause-circle-outline'
                      "
                      >{{ company.isActive ? 'Ativa' : 'Inativa' }}</v-chip
                    >
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="table-footer">
            <span
              >{{ number(filteredCompanies.length) }}
              {{
                filteredCompanies.length === 1 ? 'empresa encontrada' : 'empresas encontradas'
              }}</span
            ><v-pagination
              v-if="pageCount > 1"
              v-model="page"
              :length="pageCount"
              :total-visible="3"
              density="compact"
              color="blue-darken-2"
            />
          </div>
        </template>
      </section>

      <aside class="side-panels">
        <section class="panel overview-panel" aria-labelledby="overview-title">
          <div class="panel-head">
            <div>
              <h2 id="overview-title">
                <v-icon size="20">mdi-chart-box-outline</v-icon>Visão das organizações
              </h2>
              <p>Situação atual dos cadastros.</p>
            </div>
          </div>
          <div class="overview-body">
            <div class="coverage-heading">
              <span>Empresas ativas</span
              ><strong>{{
                companyDataReady ? `${activeCompanies} de ${companies.length}` : '—'
              }}</strong>
            </div>
            <v-progress-linear
              :model-value="
                companyDataReady && companies.length
                  ? (activeCompanies / companies.length) * 100
                  : 0
              "
              :indeterminate="loading"
              color="green-darken-2"
              bg-color="green-lighten-4"
              rounded
              height="9"
              aria-label="Proporção de empresas ativas"
            />
            <dl>
              <div>
                <dt><i class="status-dot" />Ativas</dt>
                <dd>{{ companyDataReady ? number(activeCompanies) : '—' }}</dd>
              </div>
              <div>
                <dt><i class="status-dot inactive" />Inativas</dt>
                <dd>{{ companyDataReady ? number(companies.length - activeCompanies) : '—' }}</dd>
              </div>
              <div>
                <dt><v-icon size="16">mdi-account-alert-outline</v-icon>Sem gestor vinculado</dt>
                <dd>{{ companyDataReady ? number(withoutManager) : '—' }}</dd>
              </div>
            </dl>
          </div>
        </section>
        <section class="panel shortcuts" aria-labelledby="shortcuts-title">
          <div class="panel-head">
            <h2 id="shortcuts-title">
              <v-icon size="20">mdi-lightning-bolt-outline</v-icon>Acesso rápido
            </h2>
          </div>
          <router-link to="/admin/routes/daily"
            ><span class="shortcut-icon"><v-icon>mdi-map-marker-path</v-icon></span>
            <div>
              <strong>Rota e registro de podas</strong><span>Acompanhe cada árvore atendida</span>
            </div>
            <v-icon size="19">mdi-chevron-right</v-icon></router-link
          >
          <router-link to="/admin/register-managers"
            ><span class="shortcut-icon"><v-icon>mdi-account-plus-outline</v-icon></span>
            <div>
              <strong>Cadastrar gestor</strong><span>Adicione um responsável à equipe</span>
            </div>
            <v-icon size="19">mdi-chevron-right</v-icon></router-link
          ><router-link to="/admin/map"
            ><span class="shortcut-icon"><v-icon>mdi-map-outline</v-icon></span>
            <div>
              <strong>Mapa do inventário</strong><span>Explore as árvores cadastradas</span>
            </div>
            <v-icon size="19">mdi-chevron-right</v-icon></router-link
          >
        </section>
      </aside>
    </div>

    <section class="maintenance" aria-labelledby="maintenance-title">
      <div class="section-heading">
        <div>
          <h2 id="maintenance-title">Gestão da base</h2>
          <p>Ferramentas para manter os registros organizados e atualizados.</p>
        </div>
        <span><v-icon size="15">mdi-shield-check-outline</v-icon> Acesso administrativo</span>
      </div>
      <div class="maintenance-grid">
        <article class="panel tool-card">
          <span class="tool-icon"><v-icon size="25">mdi-database-import-outline</v-icon></span>
          <h3>Importar dados externos</h3>
          <p>Sincronize os dados disponibilizados pela integração de árvores.</p>
          <v-btn
            variant="tonal"
            color="blue-darken-2"
            prepend-icon="mdi-download-outline"
            :loading="importLoading"
            :disabled="cleanupLoading || loading"
            @click="importExternalData"
            >Importar dados</v-btn
          >
        </article>
        <article class="panel tool-card">
          <span class="tool-icon"><v-icon size="25">mdi-map-marker-radius-outline</v-icon></span>
          <h3>Explorar o inventário</h3>
          <p>Consulte a localização das árvores e os detalhes da operação no mapa.</p>
          <v-btn
            variant="tonal"
            color="blue-darken-2"
            prepend-icon="mdi-map-outline"
            to="/admin/map"
            >Abrir mapa</v-btn
          >
        </article>
        <article class="panel tool-card cleanup-card">
          <span class="tool-icon"><v-icon size="25">mdi-database-check-outline</v-icon></span>
          <h3>Revisar duplicatas</h3>
          <p>Remova registros duplicados da base. A remoção é permanente.</p>
          <v-btn
            variant="outlined"
            color="brown-darken-2"
            prepend-icon="mdi-broom"
            :disabled="importLoading || loading"
            :loading="cleanupLoading"
            @click="cleanupDialog = true"
            >Revisar limpeza</v-btn
          >
        </article>
      </div>
    </section>

    <v-dialog v-model="cleanupDialog" max-width="480" :persistent="cleanupLoading"
      ><v-card rounded="lg" title="Remover árvores duplicadas?"
        ><v-card-text
          >Essa ação remove permanentemente os registros identificados como duplicados pelo sistema.
          Confira a base antes de continuar.</v-card-text
        ><v-card-actions
          ><v-spacer /><v-btn :disabled="cleanupLoading" @click="cleanupDialog = false"
            >Cancelar</v-btn
          ><v-btn color="error" variant="flat" :loading="cleanupLoading" @click="cleanupDuplicates"
            >Remover duplicatas</v-btn
          ></v-card-actions
        ></v-card
      ></v-dialog
    >
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="6000" location="bottom right"
      >{{ snackbarText
      }}<template #actions
        ><v-btn variant="text" @click="snackbar = false">Fechar</v-btn></template
      ></v-snackbar
    >
  </v-container>
</template>

<style scoped>
.admin-dashboard {
  padding: 28px 32px 48px;
  min-height: calc(100dvh - 56px);
  color: #253c30;
}
.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 26px;
}
.eyebrow {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #52705e;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  margin-bottom: 9px;
}
h1 {
  font-size: clamp(1.55rem, 2.4vw, 2rem);
  letter-spacing: -0.04em;
  line-height: 1.25;
}
.admin-header p,
.section-heading p {
  color: #607368;
  font-size: 0.86rem;
  margin-top: 7px;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.date-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.76rem;
  color: #607368;
  flex-basis: 100%;
  justify-content: flex-end;
}
:deep(.v-btn) {
  text-transform: none;
  letter-spacing: 0;
  border-radius: 9px;
  font-weight: 600;
}
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.kpi {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-radius: 15px;
  padding: 20px;
  text-decoration: none;
  color: inherit;
  transition: transform 0.18s;
}
.kpi:hover {
  transform: translateY(-2px);
}
.kpi:focus-visible,
.shortcuts a:focus-visible {
  outline: 3px solid #32804b;
  outline-offset: 3px;
}
.kpi-top {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.84rem;
  font-weight: 600;
}
.kpi-icon,
.shortcut-icon,
.tool-icon {
  display: grid;
  place-items: center;
  border-radius: 10px;
  width: 40px;
  height: 40px;
  background: #dfeade;
  color: #3b7049;
  flex-shrink: 0;
}
.metric-arrow {
  margin-left: auto;
  color: #6f8777;
}
.kpi-value {
  font-size: 2rem;
  letter-spacing: -0.04em;
  line-height: 1.2;
}
.kpi-note {
  font-size: 0.74rem;
  color: #607368;
}
.metric-skeleton {
  background: transparent;
  max-width: 100px;
}
.dashboard-body {
  display: grid;
  grid-template-columns: minmax(0, 1.85fr) minmax(290px, 1fr);
  gap: 22px;
  align-items: start;
}
.panel {
  border: 1px solid;
  border-radius: 15px;
  overflow: hidden;
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 19px 20px;
  border-bottom: 1px solid;
}
h2 {
  font-size: 0.96rem;
  font-weight: 750;
  display: flex;
  align-items: center;
  gap: 8px;
}
.panel-head p {
  font-size: 0.74rem;
  color: #607368;
  margin-top: 5px;
}
.company-filters {
  padding: 18px 20px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 155px;
  gap: 10px;
}
:deep(.v-field) {
  font-size: 0.81rem;
  border-radius: 9px;
}
.company-table-wrap {
  overflow-x: auto;
}
.company-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}
.company-table th {
  font-size: 0.66rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #687d6e;
  font-weight: 600;
  background: #e9eee6;
  padding: 12px 20px;
  white-space: nowrap;
}
.company-table td {
  padding: 16px 20px;
  border-bottom: 1px solid #dfe5dc;
  font-size: 0.8rem;
}
.company-table td strong {
  display: block;
  font-size: 0.83rem;
  overflow-wrap: anywhere;
}
.company-table td span:not(.v-chip) {
  color: #718276;
  font-size: 0.7rem;
}
.company-table td:last-child {
  white-space: nowrap;
}
.company-table tbody tr:hover {
  background: #e7eee3;
}
.table-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 13px 20px;
  color: #708074;
  font-size: 0.73rem;
}
.side-panels {
  display: grid;
  gap: 20px;
}
.overview-body {
  padding: 20px;
}
.coverage-heading {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  margin-bottom: 13px;
}
.coverage-heading strong {
  color: #376b46;
}
dl {
  margin-top: 20px;
}
dl > div {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 15px;
  font-size: 0.79rem;
}
dt {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #607368;
}
dd {
  font-weight: 700;
}
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #5c8e69;
}
.status-dot.inactive {
  background: #a5afa5;
}
.shortcuts a {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  color: inherit;
  text-decoration: none;
}
.shortcuts a + a {
  border-top: 1px solid #dfe5dc;
}
.shortcuts a:hover {
  background: #e3ecdf;
}
.shortcuts a > div {
  flex: 1;
}
.shortcuts strong,
.shortcuts a div span {
  display: block;
}
.shortcuts strong {
  font-size: 0.81rem;
}
.shortcuts a div span {
  color: #708074;
  font-size: 0.7rem;
  margin-top: 3px;
}
.maintenance {
  margin-top: 28px;
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.section-heading > span {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #687c6c;
  font-size: 0.72rem;
}
.maintenance-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}
.tool-card {
  padding: 22px;
  display: flex;
  align-items: flex-start;
  flex-direction: column;
}
.tool-card h3 {
  font-size: 0.93rem;
  margin-top: 15px;
}
.tool-card p {
  color: #607368;
  font-size: 0.79rem;
  line-height: 1.65;
  margin: 8px 0 20px;
  flex: 1;
}
.tool-card .v-btn {
  width: 100%;
}
.cleanup-card .tool-icon {
  background: #eee5d7;
  color: #8a6b45;
}
.empty-state {
  padding: 46px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  color: #657d6a;
}
.empty-state h3 {
  font-size: 0.95rem;
  color: #354e3d;
}
.empty-state p {
  font-size: 0.8rem;
}
@media (min-width: 1600px) {
  .admin-dashboard {
    padding: 36px 48px 56px;
  }
}
@media (max-width: 1100px) {
  .admin-header {
    align-items: flex-start;
  }
  .date-label {
    display: none;
  }
  .header-actions {
    justify-content: flex-end;
  }
  .dashboard-body {
    grid-template-columns: minmax(0, 1fr);
  }
  .side-panels {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 700px) {
  .admin-dashboard {
    padding: 20px 16px 32px;
  }
  .admin-header {
    flex-direction: column;
    gap: 18px;
  }
  .header-actions {
    justify-content: flex-start;
  }
  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  .kpi {
    padding: 15px;
  }
  .kpi-top {
    font-size: 0.77rem;
    gap: 7px;
  }
  .kpi-icon {
    width: 32px;
    height: 32px;
  }
  .kpi-value {
    font-size: 1.75rem;
  }
  .metric-arrow {
    display: none;
  }
  .side-panels,
  .maintenance-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .company-filters {
    grid-template-columns: minmax(0, 1fr);
    padding: 16px;
  }
  .panel-head {
    padding: 16px;
    align-items: flex-start;
  }
  .company-table th,
  .company-table td {
    padding: 13px 16px;
  }
  .section-heading > span {
    display: none;
  }
}
</style>
