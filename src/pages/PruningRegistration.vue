<template>
  <v-container fluid class="pa-6" style="min-height: 100vh">
    <PageHeader
      title="Agendamento de Podas"
      subtitle="Confirme As Informações Para Agendar Uma Nova Poda"
      :breadcrumbs="[
        { text: 'Meu Painel', to: '/user' },
        { text: 'Podas', to: '/user/podas' },
        { text: '#Agendamento' },
      ]"
    />

    <v-row>
      <v-col cols="12" md="6">
        <label class="text-caption font-weight-bold mb-1 d-block">Árvore/Local</label>
        <v-select
          v-model="form.location"
          :items="['#3r443t Rua da Felicidade', '#5t221r Av. Brasil']"
          variant="outlined"
          density="compact"
        ></v-select>
      </v-col>
      <v-col cols="12" md="6">
        <label class="text-caption font-weight-bold mb-1 d-block">Horário</label>
        <v-text-field
          v-model="form.time"
          placeholder="Digite o horário"
          variant="outlined"
          density="compact"
        ></v-text-field>
      </v-col>

      <v-col cols="12" md="6">
        <label class="text-caption font-weight-bold mb-1 d-block">Data</label>
        <v-text-field
          v-model="form.date"
          placeholder="Digite a data"
          variant="outlined"
          density="compact"
        ></v-text-field>
      </v-col>
      <v-col cols="12" md="6">
        <label class="text-caption font-weight-bold mb-1 d-block">Equipe Responsável</label>
        <v-select
          v-model="form.team"
          :items="['Equipe Verde', 'Equipe Azul']"
          variant="outlined"
          density="compact"
        ></v-select>
      </v-col>

      <v-col cols="12" md="6">
        <label class="text-caption font-weight-bold mb-1 d-block">Prioridade</label>
        <v-text-field
          v-model="form.priority"
          placeholder="Alta/Média/Baixa"
          variant="outlined"
          density="compact"
        ></v-text-field>
      </v-col>

      <v-col cols="12">
        <label class="text-caption font-weight-bold mb-1 d-block">Observações</label>
        <v-textarea v-model="form.notes" variant="outlined" rows="4"></v-textarea>
      </v-col>
    </v-row>

    <div class="d-flex justify-center mt-6">
      <v-btn color="#C5E11F" width="200" height="45" class="mr-4 font-weight-bold elevation-0" @click="schedule">
        AGENDAR
      </v-btn>
      <v-btn color="black" width="200" height="45" class="font-weight-bold elevation-0" @click="cancel">
        CANCELAR
      </v-btn>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'

const router = useRouter()

const form = reactive({
  location: '#3r443t Rua da Felicidade',
  time: '',
  date: '',
  team: 'Equipe Verde',
  priority: '',
  notes: '',
})

const schedule = () => {
  console.log('Schedule pruning:', form)
}

const cancel = () => {
  router.back()
}
</script>
