<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiConnect, type User } from '@/plugins/apiConnect'
import { useAppStore } from '@/stores/app'
import { getHomeRouteByRole } from '@/router/helpers/getHomeRoute'

const router = useRouter()
const store = useAppStore()

const loading = ref(false)
const saving = ref(false)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref<'success' | 'error' | 'info'>('info')

const form = reactive({
  name: '',
  email: '',
  phone: '',
  cpf: '',
  password: '',
})

const currentUser = computed(() => store.user)

const initials = computed(() => {
  const name = form.name || currentUser.value?.name || 'Usuário'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
})

const roleLabel = computed(() => {
  const role = currentUser.value?.role
  if (role === 'ADMIN') return 'Administrador'
  if (role === 'MANAGER') return 'Gestor'
  if (role === 'USER') return 'Funcionário'
  return 'Usuário'
})

function fillForm(user: User) {
  form.name = user.name || ''
  form.email = user.email || ''
  form.phone = user.phone || ''
  form.cpf = user.cpf || ''
  form.password = ''
}

function notify(text: string, color: 'success' | 'error' | 'info' = 'info') {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

async function loadProfile() {
  loading.value = true

  try {
    const { data } = await apiConnect.get<User>('/users/me/profile')
    if (data) {
      store.getUser(data)
      fillForm(data)
    }
  } catch (error) {
    console.error('Erro ao carregar perfil:', error)
    if (currentUser.value) {
      fillForm(currentUser.value)
      notify('Usando os dados salvos localmente. Não foi possível atualizar o perfil agora.', 'info')
      return
    }

    if (apiConnect.isAuthenticated()) {
      notify('Não foi possível carregar seus dados de perfil.', 'error')
    }
  } finally {
    loading.value = false
  }
}

async function saveProfile() {
  if (!currentUser.value?.id) {
    notify('Não foi possível identificar o usuário logado.', 'error')
    return
  }

  saving.value = true

  const payload: Partial<Pick<User, 'name' | 'email' | 'phone' | 'cpf'>> & { password?: string } = {
    name: form.name.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    cpf: form.cpf.trim(),
  }

  if (form.password.trim()) payload.password = form.password.trim()

  try {
    const { data } = await apiConnect.put<User>(`/users/${currentUser.value.id}`, payload)
    const updatedUser = data || { ...currentUser.value, ...payload, password: undefined }

    store.getUser(updatedUser as User)
    fillForm(updatedUser as User)
    notify('Perfil atualizado com sucesso.', 'success')
  } catch (error) {
    console.error('Erro ao salvar perfil:', error)
    notify('Não foi possível salvar as alterações agora.', 'error')
  } finally {
    saving.value = false
  }
}

function cancel() {
  const home = getHomeRouteByRole(router, currentUser.value?.role)
  router.push(home)
}

onMounted(loadProfile)
</script>

<template>
  <main class="profile-page full-bleed-page">
    <section class="profile-hero">
      <div class="profile-identity">
        <v-avatar size="88" class="profile-avatar">
          <span>{{ initials }}</span>
        </v-avatar>

        <div>
          <p class="profile-eyebrow">Minha conta</p>
          <h1>Editar perfil</h1>
          <p class="profile-subtitle">
            Mantenha seus dados atualizados para identificação e contato dentro do MapTree.
          </p>
        </div>
      </div>

      <v-chip color="green-lighten-4" text-color="green-darken-4" variant="flat" class="profile-role">
        <v-icon start size="18">mdi-account-badge</v-icon>
        {{ roleLabel }}
      </v-chip>
    </section>

    <section class="profile-content">
      <v-card class="profile-card account-card" flat>
        <div class="section-title">
          <v-icon color="green-darken-2">mdi-account-circle</v-icon>
          <span>Resumo</span>
        </div>

        <div class="account-summary">
          <div class="summary-item">
            <span>Nome</span>
            <strong>{{ form.name || 'Não informado' }}</strong>
          </div>
          <div class="summary-item">
            <span>Email</span>
            <strong>{{ form.email || 'Não informado' }}</strong>
          </div>
          <div class="summary-item">
            <span>Organização</span>
            <strong>{{ currentUser?.organization?.name || 'Não vinculada' }}</strong>
          </div>
          <div class="summary-item">
            <span>Status</span>
            <strong>{{ currentUser?.isActive === false ? 'Inativo' : 'Ativo' }}</strong>
          </div>
        </div>
      </v-card>

      <v-card class="profile-card form-card" flat>
        <div class="section-title">
          <v-icon color="green-darken-2">mdi-pencil</v-icon>
          <span>Dados pessoais</span>
        </div>

        <v-progress-linear v-if="loading" indeterminate color="green-darken-2" class="mb-5" />

        <v-form @submit.prevent="saveProfile">
          <div class="form-grid">
            <v-text-field
              v-model="form.name"
              label="Nome completo"
              prepend-inner-icon="mdi-account"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
              :disabled="loading || saving"
            />

            <v-text-field
              v-model="form.email"
              label="Email"
              prepend-inner-icon="mdi-email"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
              :disabled="loading || saving"
            />

            <v-text-field
              v-model="form.phone"
              label="Telefone"
              prepend-inner-icon="mdi-phone"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
              :disabled="loading || saving"
            />

            <v-text-field
              v-model="form.cpf"
              label="CPF"
              prepend-inner-icon="mdi-card-account-details"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
              :disabled="loading || saving"
            />
          </div>

          <v-divider class="my-6" />

          <v-text-field
            v-model="form.password"
            label="Nova senha"
            placeholder="Preencha apenas se quiser alterar"
            prepend-inner-icon="mdi-lock"
            variant="outlined"
            density="comfortable"
            type="password"
            hide-details="auto"
            :disabled="loading || saving"
          />

          <div class="profile-actions">
            <v-btn variant="text" color="grey-darken-2" :disabled="saving" @click="cancel">
              Cancelar
            </v-btn>
            <v-btn color="#C1E328" variant="flat" :loading="saving" type="submit">
              Salvar alterações
            </v-btn>
          </div>
        </v-form>
      </v-card>
    </section>

    <v-snackbar v-model="snackbar" :color="snackbarColor" location="bottom right" timeout="3500">
      {{ snackbarText }}
    </v-snackbar>
  </main>
</template>

<style scoped>
.profile-page {
  min-height: calc(100dvh - 64px);
  background: #f5f7f2;
  color: #1e2d25;
}

.profile-hero {
  width: 100%;
  min-height: 240px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding: clamp(24px, 5vw, 56px);
  background:
    linear-gradient(135deg, rgba(20, 67, 53, 0.96), rgba(38, 126, 83, 0.92)),
    url('@/assets/Logomaptreeverde.png') right 8% center / min(320px, 55vw) no-repeat;
  color: #ffffff;
}

.profile-identity {
  display: flex;
  align-items: center;
  gap: 24px;
  max-width: 820px;
}

.profile-avatar {
  flex: 0 0 auto;
  background: #c1e328;
  color: #163829;
  font-size: 2rem;
  font-weight: 900;
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.2);
}

.profile-avatar span {
  font-weight: 900;
}

.profile-eyebrow {
  margin: 0 0 8px;
  color: #d6f36d;
  font-size: 0.82rem;
  font-weight: 800;
  text-transform: uppercase;
}

.profile-hero h1 {
  margin: 0;
  font-size: clamp(2rem, 4vw, 4rem);
  line-height: 1;
  font-weight: 900;
}

.profile-subtitle {
  max-width: 620px;
  margin: 14px 0 0;
  color: rgba(255, 255, 255, 0.82);
  font-size: 1rem;
}

.profile-role {
  flex: 0 0 auto;
  font-weight: 800;
}

.profile-content {
  display: grid;
  grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
  gap: 24px;
  width: 100%;
  padding: clamp(16px, 4vw, 40px);
}

.profile-card {
  border: 1px solid #e1e8dc;
  border-radius: 8px;
  background: #ffffff;
  padding: clamp(18px, 3vw, 28px);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  color: #24382e;
  font-size: 1rem;
  font-weight: 900;
}

.section-title span {
  font-weight: 900;
}

.account-summary {
  display: grid;
  gap: 12px;
}

.summary-item {
  display: grid;
  gap: 4px;
  padding: 14px;
  border-radius: 8px;
  background: #f6f8f3;
}

.summary-item span {
  color: #6b776f;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
}

.summary-item strong {
  color: #1f2f27;
  font-weight: 800;
  overflow-wrap: anywhere;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.profile-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

@media (max-width: 900px) {
  .profile-hero {
    align-items: flex-start;
    flex-direction: column;
    min-height: auto;
  }

  .profile-content {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .profile-identity {
    align-items: flex-start;
    flex-direction: column;
    gap: 16px;
  }

  .profile-avatar {
    width: 72px !important;
    height: 72px !important;
    font-size: 1.5rem;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .profile-actions {
    flex-direction: column-reverse;
  }

  .profile-actions .v-btn {
    width: 100%;
  }
}
</style>
