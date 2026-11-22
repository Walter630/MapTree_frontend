<template>
  <div class="page-header mb-6">
    <!-- Breadcrumbs -->
    <div v-if="breadcrumbs.length" class="d-flex flex-wrap align-center mb-4">
      <template v-for="(crumb, i) in breadcrumbs" :key="i">
        <RouterLink
          v-if="crumb.to"
          :to="crumb.to"
          class="breadcrumb-item breadcrumb-link text-caption d-inline-flex align-center"
        >
          <v-icon v-if="getBreadcrumbIcon(crumb)" size="14" class="breadcrumb-icon mr-1">
            {{ getBreadcrumbIcon(crumb) }}
          </v-icon>
          {{ crumb.text }}
        </RouterLink>
        <span
          v-else
          class="breadcrumb-item breadcrumb-current text-caption d-inline-flex align-center font-weight-bold"
          aria-current="page"
        >
          <v-icon v-if="getBreadcrumbIcon(crumb)" size="14" class="breadcrumb-icon mr-1">
            {{ getBreadcrumbIcon(crumb) }}
          </v-icon>
          {{ crumb.text }}
        </span>
        <v-icon v-if="i < breadcrumbs.length - 1" size="small" class="mx-1 breadcrumb-separator">
          mdi-chevron-right
        </v-icon>
      </template>
    </div>

    <!-- Título + Botão voltar -->
    <div class="page-header-heading">
      <v-btn
        v-if="showBackButton"
        icon="mdi-chevron-left"
        variant="outlined"
        density="comfortable"
        class="mr-4 back-btn"
        aria-label="Voltar à página anterior"
        @click="router.back()"
      />
      <div class="page-header-copy">
        <h2
          class="text-h5 font-weight-bold page-header-title"
          :class="{ 'page-header-title--route': title.startsWith('Rota de ') }"
        >
          {{ title }}
        </h2>
        <p v-if="subtitle" class="text-caption page-header-subtitle mt-1">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="page-header-actions">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink, useRouter, type RouteLocationRaw } from 'vue-router'

interface Breadcrumb {
  text: string
  to?: RouteLocationRaw
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
  '/admin/trees/new': 'mdi-tree',
  '/manager': 'mdi-view-dashboard',
  '/manager/employees': 'mdi-account-group',
  '/manager/register-employee': 'mdi-account-plus',
  '/manager/reports': 'mdi-file-chart',
  '/manager/notifications': 'mdi-bell',
  '/manager/map': 'mdi-map',
  '/manager/trees/new': 'mdi-tree',
  '/manager/routes/daily': 'mdi-map-marker-path',
  '/user': 'mdi-view-dashboard',
  '/user/reports': 'mdi-file-chart',
  '/user/mapUser': 'mdi-map-marker-path',
  '/user/routes/daily': 'mdi-map-marker-path',
  '/user/podas': 'mdi-tree',
  '/user/podas/nova': 'mdi-tree-outline',
  '/user/notifications': 'mdi-bell',
}

const router = useRouter()

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
  'Cadastrar árvore': 'mdi-tree',
  'Rotas diárias': 'mdi-map-marker-path',
  Rotas: 'mdi-map-marker-path',
  'Rota do dia': 'mdi-map-marker-path',
}

function getBreadcrumbIcon(crumb: Breadcrumb) {
  const path = crumb.to
    ? typeof crumb.to === 'string'
      ? crumb.to
      : router.resolve(crumb.to).path
    : undefined
  return crumb.icon || (path ? routeIconMap[path] : undefined) || textIconMap[crumb.text]
}
</script>

<style scoped>
.breadcrumb-item {
  color: var(--mt-text-muted);
  transition: color 0.2s ease;
  text-decoration: none;
}

.breadcrumb-current {
  color: var(--mt-forest);
}
.breadcrumb-separator,
.page-header-subtitle {
  color: var(--mt-text-muted);
}
.page-header-title {
  color: var(--mt-forest);
}

.breadcrumb-icon {
  transition:
    color 0.2s ease,
    transform 0.2s ease;
}

.breadcrumb-item:hover {
  color: var(--mt-green) !important;
}

.breadcrumb-item:hover .breadcrumb-icon {
  color: var(--mt-green);
  transform: translateY(-1px);
}

.breadcrumb-link {
  cursor: pointer;
}

.breadcrumb-link:hover {
  color: var(--mt-green) !important;
}

.back-btn {
  min-width: 42px;
  min-height: 42px;
  border-radius: 8px;
  border: 1px solid var(--mt-border);
}

.page-header-heading {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 0;
}

.page-header-copy {
  min-width: 0;
}

.page-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}


.page-header-title--route {
  white-space: nowrap;
}

@media (max-width: 600px) {
  .page-header-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }

  .page-header-actions {
    margin-left: 0;
    flex-wrap: wrap;
  }


  .back-btn {
    margin: 0 !important;
  }

  .page-header-title:not(.page-header-title--route),
  .page-header-subtitle {
    max-width: 100%;
    overflow-wrap: anywhere;
  }
}
</style>
