<template>
  <v-container fluid class="bg-grey-lighten-4 pa-6">
    <PageHeader
      title="Notificações"
      subtitle="Central de alertas e atualizações do sistema"
      :breadcrumbs="[
        { text: 'Meu Painel', to: '/user' },
        { text: '#Notificações' },
      ]"
    />

    <!-- Abas -->
    <v-tabs
      v-model="tab"
      density="comfortable"
      class="mb-4 mt-8"
      style="box-shadow: none; background-color: #f6f6f6"
      grow
    >
      <v-tab value="todas">Todas {{ notificacoes.length }}</v-tab>
      <v-tab value="urgentes">Urgentes {{ notificacoes.filter((n) => n.prioridade === 'Alta').length }}</v-tab>
      <v-tab value="agendamentos">Agendamentos {{ notificacoes.filter((n) => n.prioridade === 'Media').length }}</v-tab>
      <v-tab value="concluidas">Concluídas {{ notificacoes.filter((n) => n.prioridade === 'Baixa').length }}</v-tab>
      <v-tab value="relatorios">Relatórios {{ notificacoes.filter((n) => n.prioridade === 'Baixa').length }}</v-tab>
      <v-tab value="sistema">Sistema {{ notificacoes.filter((n) => n.prioridade === 'Baixa').length }}</v-tab>
    </v-tabs>

    <!-- Lista de notificações -->
    <v-window v-model="tab">
      <v-window-item value="todas">
        <v-row style="margin-top: 10px">
          <v-col cols="12" v-for="(notificacao, i) in notificacoes" :key="i">
            <v-card
              flat
              class="pa-6 mb-4"
              style="border: 1px solid #e0e0e0; background-color: #fafafa; border-radius: 12px"
            >
              <div class="d-flex justify-space-between align-start mb-2">
                <div class="d-flex align-center">
                  <v-icon :color="notificacao.iconColor" size="28" class="mr-3">
                    {{ notificacao.icon }}
                  </v-icon>
                  <div>
                    <p class="text-subtitle-1 font-weight-medium mb-0">
                      {{ notificacao.titulo }}
                    </p>
                    <p class="text-body-2 text-grey-darken-1 mb-1">
                      {{ notificacao.descricao }}
                    </p>
                    <p class="text-caption text-grey-darken-2">
                      {{ notificacao.tempo }}
                    </p>
                  </div>
                </div>

                <div class="d-flex flex-column align-end">
                  <v-chip
                    :color="notificacao.prioridadeCor"
                    text-color="white"
                    label
                    size="small"
                    class="mb-2"
                  >
                    {{ notificacao.prioridade }}
                  </v-chip>
                  <v-btn variant="text" size="small" class="text-caption" @click="markAsRead(notificacao)"> Marcar como lida </v-btn>
                </div>
              </div>

              <v-divider class="mb-4"></v-divider>

              <v-btn
                v-if="notificacao.acao"
                :color="notificacao.botaoCor"
                variant="flat"
                style="color: white; border-radius: 8px"
              >
                {{ notificacao.acao }}
              </v-btn>

              <v-btn v-else variant="outlined" color="grey-darken-2" style="border-radius: 8px">
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
import PageHeader from '@/components/shared/PageHeader.vue'

export default defineComponent({
  name: 'NotificacoesView',
  components: { PageHeader },
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
    ],
  }),

  methods: {
    goBack() {
      this.$router.push('/user')
    },
    markAsRead(notificacao: any) {
      notificacao.lida = true
      this.notificacoes = this.notificacoes.map((n) => (n.id === notificacao.id ? { ...n, lida: true } : n))
    },
  },
})
</script>

<style scoped></style>
