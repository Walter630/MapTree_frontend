<template>
  <div class="page-header mb-6">
    <!-- Breadcrumbs -->
    <div v-if="breadcrumbs.length" class="d-flex align-center mb-4">
      <template v-for="(crumb, i) in breadcrumbs" :key="i">
        <span
          class="breadcrumb-item text-caption d-inline-flex align-center"
          :class="{
            'breadcrumb-link text-grey-darken-1': i < breadcrumbs.length - 1,
            'breadcrumb-current font-weight-bold text-indigo-darken-4': i === breadcrumbs.length - 1,
          }"
          @click="crumb.to ? $router.push(crumb.to) : null"
        >
          <v-icon
            v-if="getBreadcrumbIcon(crumb)"
            size="14"
            class="breadcrumb-icon mr-1"
          >
            {{ getBreadcrumbIcon(crumb) }}
          </v-icon>
          {{ crumb.text }}
        </span>
        <v-icon v-if="i < breadcrumbs.length - 1" size="small" class="mx-1 text-grey-darken-1">
          mdi-chevron-right
        </v-icon>
      </template>
    </div>

    <!-- Título + Botão voltar -->
    <div class="d-flex align-center">
      <v-btn
        v-if="showBackButton"
        icon="mdi-chevron-left"
        variant="outlined"
        density="comfortable"
        class="mr-4 back-btn"
        @click="$router.back()"
      />
      <div>
        <h2 class="text-h5 font-weight-bold text-indigo-darken-4">{{ title }}</h2>
        <p v-if="subtitle" class="text-caption text-grey mt-1">{{ subtitle }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Breadcrumb {
  text: string
  to?: string
  icon?: string
}

withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    breadcrumbs?: Breadcrumb[]
    showBackButton?: boolean
  }>(),
  {
    subtitle: '',
    breadcrumbs: () => [],
    showBackButton: true,
  },
)

const routeIconMap: Record<string, string> = {
  '/admin': 'mdi-view-dashboard',
  '/admin/managers': 'mdi-account-tie',
  '/admin/companies': 'mdi-domain',
  '/admin/register-company': 'mdi-domain-plus',
  '/admin/register-managers': 'mdi-account-plus',
  '/admin/map': 'mdi-map',
  '/manager': 'mdi-view-dashboard',
  '/manager/employees': 'mdi-account-group',
  '/manager/register-employee': 'mdi-account-plus',
  '/manager/reports': 'mdi-file-chart',
  '/manager/notifications': 'mdi-bell',
  '/manager/map': 'mdi-map',
  '/user': 'mdi-view-dashboard',
  '/user/reports': 'mdi-file-chart',
  '/user/mapUser': 'mdi-map-marker-path',
  '/user/podas': 'mdi-tree',
  '/user/podas/nova': 'mdi-tree-outline',
  '/user/notifications': 'mdi-bell',
}

const textIconMap: Record<string, string> = {
  'Meu Painel': 'mdi-view-dashboard',
  '#Notificações': 'mdi-bell',
  '#Funcionários': 'mdi-account-group',
  '#Relatórios': 'mdi-file-chart',
  '#Empresas': 'mdi-domain',
  '#Gestores': 'mdi-account-tie',
  '#Podas': 'mdi-tree',
  '#Nova Poda': 'mdi-tree-plus',
  '#CadastrarEmpresas': 'mdi-domain-plus',
  '#CadastrarGestores': 'mdi-account-plus',
  '#CadastrarFuncionário': 'mdi-account-plus',
}

function getBreadcrumbIcon(crumb: Breadcrumb) {
  return crumb.icon || (crumb.to ? routeIconMap[crumb.to] : undefined) || textIconMap[crumb.text]
}
</script>

<style scoped>
.breadcrumb-item {
  transition: color 0.2s ease;
}

.breadcrumb-icon {
  transition: color 0.2s ease, transform 0.2s ease;
}

.breadcrumb-item:hover {
  color: #429205 !important;
}

.breadcrumb-item:hover .breadcrumb-icon {
  color: #429205;
  transform: translateY(-1px);
}

.breadcrumb-link {
  cursor: pointer;
}

.breadcrumb-link:hover {
  color: #429205 !important;
}

.back-btn {
  min-width: 42px;
  min-height: 42px;
  border-radius: 8px;
  border: 1px solid #d9d9d9;
}

</style>
