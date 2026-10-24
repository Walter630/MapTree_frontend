<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiConnect } from '@/plugins/apiConnect'
import PageHeader from '@/components/shared/PageHeader.vue'

interface SpeciesOption {
  id: string
  commonName: string
  scientificName?: string
}

const router = useRouter()
const route = useRoute()
const formRef = ref()
const loading = ref(false)
const loadingSpecies = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const species = ref<SpeciesOption[]>([])

const form = reactive({
  speciesId: '',
  latitude: '',
  longitude: '',
  age: '',
  status: 'NORMAL',
  vigor: 'GOOD',
})

const isManager = computed(() => route.path.startsWith('/manager'))
const backRoute = computed(() => (isManager.value ? '/manager' : '/admin'))
const pageTitle = computed(() => (isManager.value ? 'Cadastrar árvore' : 'Cadastrar árvore na organização'))

const statusOptions = [
  { title: 'Normal', value: 'NORMAL' },
  { title: 'Precisa de poda', value: 'TO_PRUNE' },
  { title: 'Em observação', value: 'UNDER_OBSERVATION' },
]

const vigorOptions = [
  { title: 'Bom', value: 'GOOD' },
  { title: 'Excelente', value: 'EXCELLENT' },
  { title: 'Debilitado', value: 'POOR' },
]

const rules = {
  required: (value: unknown) => Boolean(value) || 'Campo obrigatório',
  coordinate: (value: unknown) => {
    const number = Number(value)
    return Number.isFinite(number) || 'Informe uma coordenada válida'
  },
  latitude: (value: unknown) => {
    const number = Number(value)
    return (number >= -90 && number <= 90) || 'Latitude deve estar entre -90 e 90'
  },
  longitude: (value: unknown) => {
    const number = Number(value)
    return (number >= -180 && number <= 180) || 'Longitude deve estar entre -180 e 180'
  },
}

async function loadSpecies() {
  loadingSpecies.value = true
  try {
    const response = await apiConnect.get<SpeciesOption[]>('/species')
    species.value = response.data || []
  } catch {
    errorMessage.value = 'Não foi possível carregar as espécies. Tente atualizar a página.'
  } finally {
    loadingSpecies.value = false
  }
}

async function submit() {
  errorMessage.value = ''
  successMessage.value = ''
  const result = await formRef.value?.validate()
  if (result && !result.valid) return

  loading.value = true
  try {
    const payload = {
      speciesId: form.speciesId,
      lat: Number(form.latitude),
      lng: Number(form.longitude),
      age: form.age ? `${form.age}-01-01` : undefined,
      status: form.status,
      vigor: form.vigor,
    }

    await apiConnect.post('/trees', payload)
    successMessage.value = 'Árvore cadastrada com sucesso. Ela já pode aparecer no mapa após a atualização.'
    form.speciesId = ''
    form.latitude = ''
    form.longitude = ''
    form.age = ''
    form.status = 'NORMAL'
    form.vigor = 'GOOD'
  } catch (error: unknown) {
    const apiError = error as { response?: { data?: { message?: string } } }
    errorMessage.value = apiError.response?.data?.message || 'Não foi possível cadastrar a árvore. Confira os dados e tente novamente.'
  } finally {
    loading.value = false
  }
}

onMounted(loadSpecies)
</script>

<template>
  <v-container fluid class="page-shell py-8">
    <PageHeader
      :title="pageTitle"
      subtitle="Cadastre a localização e os dados mínimos para a equipe encontrar a árvore."
      :breadcrumbs="[{ text: 'Meu Painel', to: backRoute }, { text: 'Cadastrar árvore' }]"
    />

    <v-card class="mx-auto registration-card" elevation="0">
      <v-card-item class="pb-2">
        <template #prepend>
          <v-avatar color="green-lighten-5" size="48">
            <v-icon color="green-darken-2">mdi-tree-plus</v-icon>
          </v-avatar>
        </template>
        <v-card-title>{{ pageTitle }}</v-card-title>
        <v-card-subtitle>Cadastre a localização e os dados mínimos para a equipe encontrar a árvore.</v-card-subtitle>
      </v-card-item>

      <v-divider />

      <v-alert v-if="successMessage" type="success" variant="tonal" class="ma-4 mb-0" closable @click:close="successMessage = ''">
        {{ successMessage }}
      </v-alert>
      <v-alert v-if="errorMessage" type="error" variant="tonal" class="ma-4 mb-0" closable @click:close="errorMessage = ''">
        {{ errorMessage }}
      </v-alert>

      <v-form ref="formRef" class="pa-6" @submit.prevent="submit">
        <p class="text-subtitle-1 font-weight-bold mb-4">Identificação</p>
        <v-row>
          <v-col cols="12" md="7">
            <v-select
              v-model="form.speciesId"
              :items="species"
              item-title="commonName"
              item-value="id"
              label="Espécie *"
              prepend-inner-icon="mdi-leaf"
              :loading="loadingSpecies"
              :rules="[rules.required]"
              variant="outlined"
              hint="A espécie ajuda a IA a estimar o crescimento."
              persistent-hint
            >
              <template #item="{ props, item }">
                <v-list-item v-bind="props" :subtitle="item.raw.scientificName" />
              </template>
            </v-select>
          </v-col>
          <v-col cols="12" md="5">
            <v-select v-model="form.status" :items="statusOptions" label="Status inicial" variant="outlined" />
          </v-col>
        </v-row>

        <p class="text-subtitle-1 font-weight-bold mb-4 mt-4">Localização</p>
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="form.latitude"
              label="Latitude *"
              type="number"
              step="any"
              variant="outlined"
              prepend-inner-icon="mdi-latitude"
              :rules="[rules.required, rules.coordinate, rules.latitude]"
              hint="Ex.: -3.731900"
              persistent-hint
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="form.longitude"
              label="Longitude *"
              type="number"
              step="any"
              variant="outlined"
              prepend-inner-icon="mdi-longitude"
              :rules="[rules.required, rules.coordinate, rules.longitude]"
              hint="Ex.: -38.526700"
              persistent-hint
            />
          </v-col>
        </v-row>

        <p class="text-subtitle-1 font-weight-bold mb-4 mt-4">Dados operacionais <span class="text-caption text-grey font-weight-regular">(opcionais)</span></p>
        <v-row>
          <v-col cols="12" sm="6">
            <v-text-field v-model="form.age" label="Ano aproximado de plantio" type="number" min="1900" :max="new Date().getFullYear()" variant="outlined" prepend-inner-icon="mdi-calendar" />
          </v-col>
          <v-col cols="12" sm="6">
            <v-select v-model="form.vigor" :items="vigorOptions" label="Saúde da árvore" variant="outlined" />
          </v-col>
        </v-row>

        <v-alert type="info" variant="tonal" density="comfortable" class="mt-2 mb-6">
          Use o status <strong>Precisa de poda</strong> somente quando houver uma necessidade confirmada. Assim o mapa mostra primeiro o que exige ação.
        </v-alert>

        <div class="d-flex flex-wrap justify-end ga-3">
          <v-btn variant="outlined" @click="router.push(backRoute)">Cancelar</v-btn>
          <v-btn color="green-darken-2" type="submit" :loading="loading" prepend-icon="mdi-content-save">Salvar árvore</v-btn>
        </div>
      </v-form>
    </v-card>
  </v-container>
</template>

<style scoped>
.registration-card {
  max-width: 980px;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
}
</style>
