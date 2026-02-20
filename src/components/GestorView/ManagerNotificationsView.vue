<template>
  <v-container class="py-10 px-8">
    <!-- Cabeçalho -->
    <v-row align="center" class="mb-2">
      <v-col cols="12">
        <div class="breadcrumb d-flex align-center">
          <span class="text-caption text-grey-darken-1">Meu Painel</span>
          <v-icon small class="mx-1 text-grey-darken-1">mdi-chevron-right</v-icon>
          <span class="text-caption font-weight-bold page-title">#Notificações</span>
        </div>
      </v-col>
    </v-row>

    <v-row class="mb-6">
      <div class="d-flex align-center mb-2">
        <!-- Back button (square) -->
        <v-btn icon class="back-btn mr-3" @click="goBack">
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
        <div>
          <h2 class="title mb-1">Notificações</h2>
          <p class="subtitle">Gerencie as notificações do sistema</p>
        </div>
      </div>
    </v-row>

    <!-- Abas -->
    <v-tabs v-model="tab" density="comfortable" class="mb-4 tabs-container" grow>
      <v-tab value="todas">Todas</v-tab>
      <v-tab value="urgentes">Urgentes</v-tab>
      <v-tab value="agendamentos">Agendamentos</v-tab>
      <v-tab value="concluidas">Concluídas</v-tab>
      <v-tab value="relatorios">Relatórios</v-tab>
      <v-tab value="sistema">Sistema</v-tab>
    </v-tabs>

    <!-- Lista de Notificações -->
    <v-window v-model="tab">
      <v-window-item value="todas">
        <v-row class="mt-3">
          <v-col v-for="(notificacao, i) in notificacoes" :key="i" cols="12">
            <v-card flat class="notification-card pa-6 mb-4">
              <div class="d-flex justify-space-between align-start mb-2">
                <!-- Informações -->
                <div class="d-flex align-center">
                  <v-icon :color="notificacao.iconColor" size="28" class="mr-3">
                    {{ notificacao.icon }}
                  </v-icon>
                  <div>
                    <p class="text-subtitle-1 font-weight-medium mb-0">{{ notificacao.titulo }}</p>
                    <p class="text-body-2 text-grey-darken-1 mb-1">{{ notificacao.descricao }}</p>
                    <p class="text-caption text-grey-darken-2">{{ notificacao.tempo }}</p>
                  </div>
                </div>

                <!-- Ações -->
                <div class="d-flex flex-column align-end">
                  <v-chip :color="notificacao.prioridadeCor" text-color="white" label size="small" class="mb-2">
                    {{ notificacao.prioridade }}
                  </v-chip>
                  <v-btn variant="text" size="small" class="text-caption">Marcar como lida</v-btn>
                </div>
              </div>

              <v-divider class="mb-4" />

              <v-btn
                v-if="notificacao.acao"
                :color="notificacao.botaoCor"
                variant="flat"
                class="action-btn"
              >
                {{ notificacao.acao }}
              </v-btn>

              <v-btn v-else variant="outlined" color="grey-darken-2" class="action-btn">
                {{ notificacao.acaoSecundaria }}
              </v-btn>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>
    </v-window>
  </v-container>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

interface Notificacao {
  titulo: string
  descricao: string
  tempo: string
  prioridade: string
  prioridadeCor: string
  icon: string
  iconColor: string
  acao?: string
  botaoCor?: string
  acaoSecundaria?: string
}

export default defineComponent({
  name: 'ManagerNotificacoesView',

  data: () => ({
    tab: 'todas',

    notificacoes: [
      {
        titulo: 'Poda Urgente Necessária',
        descricao: 'Uma árvore na Avenida Central apresenta sinais de doença grave.',
        tempo: 'Há 10 minutos',
        prioridade: 'Alta',
        prioridadeCor: '#FF3C3C',
        icon: 'mdi-alert-circle',
        iconColor: '#FF3C3C',
        acao: 'Ver Detalhes',
        botaoCor: '#FF3C3C',
      },
      {
        titulo: 'Agendamento de Poda Confirmado',
        descricao: 'A poda para a Rua das Flores foi agendada para 15/09/2024.',
        tempo: 'Há 1 hora',
        prioridade: 'Média',
        prioridadeCor: '#FBC02D',
        icon: 'mdi-calendar-check',
        iconColor: '#FBC02D',
        acao: 'Ver Agendamento',
        botaoCor: '#FBC02D',
      },
      {
        titulo: 'Relatório de Poda Disponível',
        descricao: 'O relatório da poda realizada no Parque Central está disponível.',
        tempo: 'Ontem',
        prioridade: 'Baixa',
        prioridadeCor: '#388E3C',
        icon: 'mdi-file-document',
        iconColor: '#388E3C',
        acaoSecundaria: 'Ver Relatório',
      },
    ] as Notificacao[],
  }),

  methods: {
    goBack() {
      this.$router.push('/manager')
    },
  },
})
</script>

<style scoped>
.tabs-container {
  box-shadow: none;
  background-color: #f6f6f6;
}

.notification-card {
  border: 1px solid #e0e0e0;
  background-color: #fafafa;
  border-radius: 12px;
}

.action-btn {
  color: white;
  border-radius: 8px;
}

.back-btn {
  border: 1px solid #e6e6e6;
  background: #f6f6f6;
  min-width: 36px;
  min-height: 36px;
  border-radius: 8px;
}

.page-title {
  color: #2f3367;
}

.v-tab {
  text-transform: none !important;
  font-weight: 500;
  color: #555 !important;
}

.v-tab--selected {
  color: #429205 !important;
  font-weight: 600 !important;
  box-shadow: none;
}
</style>
