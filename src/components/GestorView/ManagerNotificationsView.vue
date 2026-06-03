<template>
  <v-container class="pt-3 pb-6 px-6" style="max-width: 1400px; margin: 0 auto;">
    <!-- Cabeçalho -->
    <PageHeader
      title="Notificações"
      subtitle="Gerencie as notificações do sistema"
      :breadcrumbs="[
        { text: 'Meu Painel', to: '/manager', icon: 'mdi-view-dashboard' },
        { text: '#Notificações', icon: 'mdi-bell' },
      ]"
    />

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
    <div>
        <div v-if="loading" class="text-center py-12">
          <v-progress-circular indeterminate color="primary" />
          <p class="text-caption text-grey mt-2">Sincronizando alertas...</p>
        </div>
        
        <v-row v-else class="mt-3">
          <v-col v-for="notificacao in filteredNotifications" :key="notificacao.id" cols="12">
            <v-card
              flat
              class="notification-card pa-5 mb-4 rounded-xl elevation-2"
              :class="{ 'notification-card-clickable': notificacao.link }"
              border
              @click="goToNotificationLink(notificacao.link)"
            >
              <div class="d-flex justify-space-between align-start mb-2">
                <div class="d-flex align-center">
                  <v-avatar :color="notificacao.iconColor + '22'" size="48" class="mr-4">
                    <v-icon :color="notificacao.iconColor" size="24">
                      {{ notificacao.icon }}
                    </v-icon>
                  </v-avatar>
                  <div>
                    <div class="d-flex align-center gap-2 mb-1">
                      <p class="text-subtitle-1 font-weight-bold mb-0">{{ notificacao.titulo }}</p>
                      <v-chip v-if="notificacao.isNew" color="primary" size="x-small" variant="flat">NOVO</v-chip>
                    </div>
                    <p class="text-body-2 text-grey-darken-1 mb-1">{{ notificacao.descricao }}</p>
                    <div class="d-flex align-center text-caption text-grey">
                      <v-icon size="12" class="mr-1">mdi-clock-outline</v-icon>
                      {{ notificacao.tempo }}
                    </div>
                  </div>
                </div>

                <div class="d-flex flex-column align-end">
                  <v-chip :color="notificacao.prioridadeCor" size="x-small" class="mb-2 font-weight-bold">
                    {{ notificacao.prioridade }}
                  </v-chip>
                </div>
              </div>

              <v-divider class="my-4" opacity="0.1" />

              <div class="d-flex justify-end gap-2">
                <v-btn
                  variant="tonal"
                  size="small"
                  rounded="lg"
                  color="grey"
                  @click.stop="markAsRead(notificacao.id)"
                >
                  Ocultar
                </v-btn>
                <v-btn
                  v-if="notificacao.link"
                  :color="notificacao.botaoCor || 'primary'"
                  variant="flat"
                  size="small"
                  rounded="lg"
                  @click.stop="goToNotificationLink(notificacao.link)"
                >
                  <v-icon start size="16">{{ getRouteIcon(notificacao.link) }}</v-icon>
                  Ver Mais
                </v-btn>
              </div>
            </v-card>
          </v-col>

          <v-col v-if="filteredNotifications.length === 0" cols="12" class="text-center py-12">
             <v-icon size="64" color="grey-lighten-2">mdi-bell-off-outline</v-icon>
             <p class="text-grey mt-2">Nenhuma notificação nesta categoria.</p>
          </v-col>
        </v-row>
    </div>
  </v-container>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import PageHeader from '@/components/shared/PageHeader.vue'

interface Notificacao {
  id: string
  type: string
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
  link?: string
  isNew?: boolean
}

export default defineComponent({
  name: 'ManagerNotificacoesView',
  components: { PageHeader },

  data: () => ({
    tab: 'todas',
    loading: false,
    notificacoes: [] as any[],
  }),

  computed: {
    filteredNotifications() {
      return this.getNotificationsByTab(this.tab)
    }
  },

  mounted() {
    this.fetchAllData()
  },

  methods: {
    getNotificationsByTab(tab: string) {
      if (tab === 'todas') return this.notificacoes
      if (tab === 'urgentes') return this.notificacoes.filter(n => n.prioridade === 'ALTA')
      if (tab === 'agendamentos') return this.notificacoes.filter(n => n.type === 'SCHEDULE')
      if (tab === 'concluidas') return this.notificacoes.filter(n => n.status === 'DONE' || n.status === 'COMPLETED')
      if (tab === 'relatorios') return this.notificacoes.filter(n => n.type === 'PRUNING')
      if (tab === 'sistema') return this.notificacoes.filter(n => n.type === 'SYSTEM')
      return this.notificacoes
    },

    getRouteIcon(link: string) {
      const icons: Record<string, string> = {
        '/manager': 'mdi-view-dashboard',
        '/manager/employees': 'mdi-account-group',
        '/manager/register-employee': 'mdi-account-plus',
        '/manager/reports': 'mdi-file-chart',
        '/manager/notifications': 'mdi-bell',
        '/manager/map': 'mdi-map',
      }

      return icons[link] || 'mdi-arrow-right'
    },

    goToNotificationLink(link?: string) {
      if (link) this.$router.push(link)
    },

    async fetchAllData() {
      this.loading = true
      try {
        const [treesRes, schedulesRes, pruningsRes] = await Promise.all([
          this.$api.get<any[]>('/trees'),
          this.$api.get<any[]>('/scheduling'),
          this.$api.get<any[]>('/pruning')
        ])

        const alerts = [] as any

        // 1. Riscos de IA
        treesRes.data?.filter(t => (t.aiPrediction?.estimated_height_m / t.aiPrediction?.wire_height_m) >= 0.8).forEach(t => {
          alerts.push({
            id: `risk-${t.id}`,
            type: 'RISK',
            titulo: 'Alerta de Risco IA',
            descricao: `Árvore ${t.species?.commonName || ''} atingiu nível crítico de altura na rede elétrica.`,
            tempo: 'Detectado agora',
            prioridade: 'ALTA',
            prioridadeCor: 'red-darken-1',
            icon: 'mdi-alert-decagram',
            iconColor: 'red',
            botaoCor: 'red',
            link: '/manager/map',
            isNew: true
          })
        })

        // 2. Agendamentos
        schedulesRes.data?.filter(s => s.status === 'PENDING').forEach(s => {
          alerts.push({
            id: `schedule-${s.id}`,
            type: 'SCHEDULE',
            titulo: 'Tarefa Pendente',
            descricao: `Poda agendada para árvore ${s.tree?.species?.commonName || ''} em ${new Date(s.plannedDate).toLocaleDateString()}.`,
            tempo: 'Agendamento ativo',
            prioridade: 'MEDIA',
            prioridadeCor: 'orange-darken-1',
            icon: 'mdi-calendar-clock',
            iconColor: 'orange',
            botaoCor: 'orange',
            link: '/manager'
          })
        })

        // 3. Relatórios recentes
        pruningsRes.data?.slice(0, 5).forEach(p => {
          alerts.push({
            id: `pruning-${p.id}`,
            type: 'PRUNING',
            titulo: 'Novo Relatório de Poda',
            descricao: `Finalizada intervenção do tipo ${p.type} por ${p.user?.name || 'Técnico'}.`,
            tempo: new Date(p.date).toLocaleDateString(),
            prioridade: 'BAIXA',
            prioridadeCor: 'green-darken-1',
            icon: 'mdi-file-check',
            iconColor: 'green',
            botaoCor: 'green',
            link: '/manager/reports'
          })
        })

        this.notificacoes = alerts
      } catch (e) {
        console.error('Erro ao buscar notificações:', e)
      } finally {
        this.loading = false
      }
    },

    markAsRead(id: string) {
      const index = this.notificacoes.findIndex(n => n.id === id)
      if (index >= 0) this.notificacoes.splice(index, 1)
    },

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

.notification-card-clickable {
  cursor: pointer;
}

.action-btn {
  color: white;
  border-radius: 8px;
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
