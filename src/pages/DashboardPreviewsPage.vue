<script setup lang="ts">
import PageHeader from '@/components/shared/PageHeader.vue'

const previews = [
  {
    title: 'Opção 1 — Operacional',
    description: 'Melhor para gestores: risco, rota do dia e fila de atendimento ficam visíveis na primeira tela.',
    image: '/dashboard-previews/dashboard-operacional.svg',
    recommended: true,
  },
  {
    title: 'Opção 2 — Campo',
    description: 'Melhor para equipes em deslocamento: mapa em primeiro plano, próxima parada e navegação rápida.',
    image: '/dashboard-previews/dashboard-campo.svg',
    recommended: false,
  },
  {
    title: 'Opção 3 — Analítico',
    description: 'Melhor para relatórios e empresas: indicadores, tendência mensal e distribuição de risco.',
    image: '/dashboard-previews/dashboard-analitico.svg',
    recommended: false,
  },
]
</script>

<template>
  <v-container fluid class="page-shell py-8 preview-page">
    <PageHeader
      title="Propostas de dashboard MapTree"
      subtitle="Analise as três opções antes de escolher qual será aplicada aos painéis reais."
      :breadcrumbs="[{ text: 'Início', to: '/' }, { text: 'Propostas de dashboard' }]"
      :show-back-button="false"
    />
    <div class="preview-heading mb-8" />

    <v-row>
      <v-col v-for="preview in previews" :key="preview.title" cols="12" xl="4">
        <v-card class="preview-card h-100" elevation="0">
          <div class="preview-image-wrap">
            <img :src="preview.image" :alt="preview.title" class="preview-image" />
          </div>
          <v-card-item>
            <template #prepend><v-icon :color="preview.recommended ? 'green-darken-2' : 'blue-darken-2'">{{ preview.recommended ? 'mdi-star-circle' : 'mdi-view-dashboard-variant' }}</v-icon></template>
            <v-card-title>{{ preview.title }}</v-card-title>
            <v-card-subtitle v-if="preview.recommended" class="text-green-darken-2 font-weight-bold">Minha recomendação inicial</v-card-subtitle>
          </v-card-item>
          <v-card-text class="pt-0 text-body-2 text-grey-darken-1">{{ preview.description }}</v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.preview-page { min-height: 100%; }
.preview-heading { max-width: 760px; }
.preview-card { border: 1px solid #e5ebdd; border-radius: 18px; overflow: hidden; transition: transform 0.2s ease, box-shadow 0.2s ease; }
.preview-card:hover { transform: translateY(-3px); box-shadow: 0 12px 30px rgba(31, 55, 23, 0.12) !important; }
.preview-image-wrap { padding: 10px; background: #f5f8eb; }
.preview-image { display: block; width: 100%; height: auto; border-radius: 12px; }
</style>
