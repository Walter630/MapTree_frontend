<template>
  <v-container fluid class="bg-grey-lighten-4 pa-6">
    <PageHeader
      title="Notificações"
      subtitle="Central de alertas e atualizações do sistema"
      :breadcrumbs="[
        { text: 'Meu Painel', to: '/user', icon: 'mdi-view-dashboard' },
        { text: '#Notificações', icon: 'mdi-bell' },
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
      <v-tab value="todas">Todas {{ countByTab('todas') }}</v-tab>
      <v-tab value="urgentes">Urgentes {{ countByTab('urgentes') }}</v-tab>
      <v-tab value="agendamentos">Agendamentos {{ countByTab('agendamentos') }}</v-tab>
      <v-tab value="concluidas">Concluídas {{ countByTab('concluidas') }}</v-tab>
      <v-tab value="relatorios">Relatórios {{ countByTab('relatorios') }}</v-tab>
      <v-tab value="sistema">Sistema {{ countByTab('sistema') }}</v-tab>
    </v-tabs>

    <!-- Lista de notificações -->
    <div>
        <div v-if="loading" class="text-center py-10">
           <v-progress-circular indeterminate color="green" />
           <p class="text-caption mt-2">Buscando alertas de campo...</p>
        </div>

        <v-row v-else style="margin-top: 10px">
          <v-col cols="12" v-for="(notificacao, i) in filteredNotifications" :key="i">
            <v-card
              flat
              class="pa-5 mb-4 rounded-xl elevation-1"
              :class="{ 'notification-card-clickable': notificacao.link }"
              border
              @click="goToNotificationLink(notificacao.link)"
            >
              <div class="d-flex justify-space-between align-start mb-2">
                <div class="d-flex align-center">
                  <v-avatar :color="notificacao.iconColor + '22'" size="40" class="mr-3">
                    <v-icon :color="notificacao.iconColor" size="20">
                      {{ notificacao.icon }}
                    </v-icon>
                  </v-avatar>
                  <div>
                    <p class="text-subtitle-2 font-weight-bold mb-0">
                      {{ notificacao.titulo }}
                    </p>
                    <p class="text-caption text-grey-darken-1 mb-1">
                      {{ notificacao.descricao }}
                    </p>
                    <div class="text-caption text-grey-darken-2 d-flex align-center">
                      <v-icon size="10" class="mr-1">mdi-clock</v-icon>
                      {{ notificacao.tempo }}
                    </div>
                  </div>
                </div>

                <div class="d-flex flex-column align-end">
                  <v-chip
                    :color="notificacao.prioridadeCor"
                    size="x-small"
                    class="mb-2 font-weight-bold"
                  >
                    {{ notificacao.prioridade }}
                  </v-chip>
                </div>
              </div>

              <v-divider class="my-3" opacity="0.1"></v-divider>

              <div class="d-flex justify-end">
                <v-btn
                   v-if="notificacao.link"
                  :color="notificacao.iconColor"
                  variant="flat"
                  size="small"
                  rounded="lg"
                  class="font-weight-bold"
                  @click.stop="goToNotificationLink(notificacao.link)"
                >
                  <v-icon start size="16">{{ getRouteIcon(notificacao.link) }}</v-icon>
                  ACESSAR
                </v-btn>
              </div>
            </v-card>
          </v-col>

          <v-col v-if="filteredNotifications.length === 0" cols="12" class="text-center py-10">
             <p class="text-grey">Nenhum alerta pendente.</p>
          </v-col>
        </v-row>
    </div>
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
    loading: false,
    notificacoes: [] as any[],
  }),

  computed: {
    filteredNotifications() {
      return this.getNotificationsByTab(this.tab)
    }
  },

  mounted() {
    this.fetchUserAlerts()
  },

  methods: {
    countByTab(tab: string) {
      return this.getNotificationsByTab(tab).length
    },

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
        '/user': 'mdi-view-dashboard',
        '/user/mapUser': 'mdi-map-marker-path',
        '/user/podas': 'mdi-tree',
        '/user/podas/nova': 'mdi-tree-outline',
        '/user/reports': 'mdi-file-chart',
        '/user/notifications': 'mdi-bell',
      }

      return icons[link] || 'mdi-arrow-right'
    },

    goToNotificationLink(link?: string) {
      if (link) this.$router.push(link)
    },

    async fetchUserAlerts() {
      this.loading = true
      try {
        const [treesRes, schedulesRes] = await Promise.all([
          this.$api.get<any[]>('/trees'),
          this.$api.get<any[]>('/scheduling')
        ])

        const alerts = [] as any

        // 1. Árvores em risco (Alerta para o funcionário agir)
        treesRes.data?.filter(t => (t.aiPrediction?.estimated_height_m / t.aiPrediction?.wire_height_m) >= 0.9).forEach(t => {
          alerts.push({
            type: 'RISK',
            titulo: 'Poda de Emergência',
            descricao: `Risco iminente em ${t.species?.commonName || 'Árvore'}. Localize no mapa.`,
            tempo: 'Agora',
            prioridade: 'ALTA',
            prioridadeCor: 'red',
            icon: 'mdi-lightning-bolt',
            iconColor: 'red',
            link: '/user/mapUser'
          })
        })

        // 2. Agendamentos Pendentes para o Funcionário
        schedulesRes.data?.filter(s => s.status === 'PENDING').forEach(s => {
          alerts.push({
            type: 'SCHEDULE',
            titulo: 'Poda Programada',
            descricao: `Executar poda na árvore ID: ${s.idTree?.slice(-6)}.`,
            tempo: 'Agendado',
            prioridade: 'MEDIA',
            prioridadeCor: 'orange',
            icon: 'mdi-clipboard-list',
            iconColor: 'orange',
            link: '/user/podas'
          })
        })

        this.notificacoes = alerts
      } catch (e) {
        console.error(e)
      } finally {
        this.loading = false
      }
    },

    goBack() {
      this.$router.push('/user')
    },
  },
})
</script>

<style scoped>
.notification-card-clickable {
  cursor: pointer;
}
</style>
