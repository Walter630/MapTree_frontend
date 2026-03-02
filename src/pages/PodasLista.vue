<template>
  <v-container fluid class="bg-grey-lighten-4 pa-6">
    <PageHeader
      title="Podas"
      subtitle="Gerencie Todas As Podas De Vegetação Próxima À Rede Elétrica"
      :breadcrumbs="[
        { text: 'Meu Painel', to: '/user' },
        { text: '#Podas' },
      ]"
    />

    <v-btn color="#C5E11F" class="mb-6 text-none font-weight-bold" prepend-icon="mdi-plus" elevation="0" @click="novaPoda">
      Nova Poda
    </v-btn>

    <v-row class="mb-6">
      <v-col cols="12" md="4">
        <v-card variant="flat" class="pa-4 rounded-lg">
          <div class="d-flex justify-space-between border-b pb-2 mb-2">
            <span class="text-subtitle-1 font-weight-bold">Total de Podas</span>
            <v-icon icon="mdi-office-building-outline"></v-icon>
          </div>
          <div class="text-h4 font-weight-bold">2,543</div>
          <div class="text-caption text-grey">↑ 12% vs mês anterior</div>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card variant="flat" class="pa-4 rounded-lg">
          <div class="d-flex justify-space-between border-b pb-2 mb-2">
            <span class="text-subtitle-1 font-weight-bold">Pendentes</span>
            <v-icon icon="mdi-cog-outline"></v-icon>
          </div>
          <div class="text-h4 font-weight-bold">18</div>
          <div class="text-caption text-error">Requerem atenção</div>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card variant="flat" class="pa-4 rounded-lg">
          <div class="d-flex justify-space-between border-b pb-2 mb-2">
            <span class="text-subtitle-1 font-weight-bold">Taxa de Conclusão</span>
            <v-icon icon="mdi-information-outline"></v-icon>
          </div>
          <div class="text-h4 font-weight-bold">94%</div>
          <div class="text-caption text-success">↑ 2% vs última semana</div>
        </v-card>
      </v-col>
    </v-row>

    <v-card variant="flat" class="pa-4 mb-6 rounded-lg">
      <div class="d-flex align-center mb-4">
        <v-icon icon="mdi-filter-variant" class="mr-2"></v-icon>
        <span class="font-weight-bold">Filtros</span>
      </div>
      <v-row align="center">
        <v-col cols="12" md="3">
          <v-text-field label="Local" variant="outlined" density="compact" hide-details></v-text-field>
        </v-col>
        <v-col cols="12" md="3">
          <v-text-field label="Responsável" variant="outlined" density="compact" hide-details></v-text-field>
        </v-col>
        <v-col cols="12" md="3">
          <v-text-field label="Período" type="date" variant="outlined" density="compact" hide-details></v-text-field>
        </v-col>
        <v-col cols="12" md="3">
          <v-btn color="black" block height="40" class="text-none">Buscar</v-btn>
        </v-col>
      </v-row>
    </v-card>

    <v-card variant="flat" class="pa-4 rounded-lg">
      <h3 class="text-subtitle-1 font-weight-bold mb-4">Resumo das Atividades Executadas</h3>
      <v-table>
        <thead>
        <tr>
          <th class="text-left">Localização</th>
          <th class="text-left">Id</th>
          <th class="text-left">Prioridade</th>
          <th class="text-left">Status</th>
          <th class="text-left">Data</th>
          <th class="text-left">Responsável</th>
          <th class="text-left">Operações</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="item in items" :key="item.id">
          <td>{{ item.local }}</td>
          <td>{{ item.id }}</td>
          <td>
            <v-chip :color="getPrioridadeColor(item.prioridade)" size="small" class="font-weight-bold">
              {{ item.prioridade }}
            </v-chip>
          </td>
          <td>
            <v-chip :color="getStatusColor(item.status)" size="small" variant="flat">
              {{ item.status }}
            </v-chip>
          </td>
          <td>{{ item.data }}</td>
          <td>{{ item.responsavel }}</td>
          <td><a href="#" class="text-caption text-blue-darken-2">Ver Detalhes</a></td>
        </tr>
        </tbody>
      </v-table>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'

const router = useRouter()

const novaPoda = () => router.push('/user/podas/nova')

const items = [
  { local: 'Av. Paulista, 1000', id: '343t4g3', prioridade: 'Média', status: 'Concluída', data: '2024-01-15', responsavel: 'João Silva' },
  { local: 'Rua Augusta, 500', id: '343t4g3', prioridade: 'Alta', status: 'Em progresso', data: '2024-01-15', responsavel: 'João Silva' },
  { local: 'Av. Paulista, 1000', id: '343t4g3', prioridade: 'Média', status: 'Concluída', data: '2024-01-15', responsavel: 'João Silva' },
  { local: 'Av. Paulista, 1000', id: '343t4g3', prioridade: 'Média', status: 'Pendente', data: '2024-01-15', responsavel: 'João Silva' },
]

const getStatusColor = (status: string) => {
  if (status === 'Concluída') return 'light-green-lighten-3'
  if (status === 'Em progresso') return 'blue-lighten-4'
  return 'yellow-lighten-3'
}

const getPrioridadeColor = (p: string) => {
  if (p === 'Alta') return 'red'
  return 'orange'
}
</script>
