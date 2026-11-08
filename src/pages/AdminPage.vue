<script setup lang="ts">
const sections = [
  { to: '/admin', label: 'Visão geral', icon: 'mdi-view-dashboard-outline' },
  { to: '/admin/companies', label: 'Empresas', icon: 'mdi-domain' },
  { to: '/admin/managers', label: 'Gestores', icon: 'mdi-account-tie-outline' },
  { to: '/admin/routes/daily', label: 'Rota e podas', icon: 'mdi-map-marker-path' },
  { to: '/admin/map', label: 'Mapa', icon: 'mdi-map-outline' },
]
</script>
<template>
  <div class="admin-workspace">
    <nav class="admin-section-nav" aria-label="Seções da administração">
      <router-link
        v-for="section in sections"
        :key="section.to"
        :to="section.to"
        :exact-active-class="section.to === '/admin' ? 'section-active' : ''"
        :active-class="section.to === '/admin' ? '' : 'section-active'"
        ><v-icon size="18">{{ section.icon }}</v-icon
        >{{ section.label }}</router-link
      >
    </nav>
    <router-view />
  </div>
</template>
<style scoped>
.admin-workspace {
  background: #f5f7fa;
  min-height: calc(100dvh - 68px);
  color: #1e293b;
}
.admin-section-nav {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 14px 28px;
  background: #fff;
  border-top: 1px solid #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
}
.admin-section-nav a {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 9px 15px;
  border-radius: 8px;
  color: #64748b;
  font-size: 0.82rem;
  font-weight: 600;
  text-decoration: none;
}
.admin-section-nav a:hover {
  background: #f1f5f9;
}
.admin-section-nav a.section-active {
  background: #eff6ff;
  color: #1d4ed8;
}
.admin-section-nav a:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
.admin-workspace :deep(.page-shell),
.admin-workspace :deep(.v-container.dash) {
  background: #f5f7fa !important;
}
.admin-workspace :deep(.v-container.dash .panel),
.admin-workspace :deep(.v-container.dash .kpi) {
  background: #fff;
  border-color: #e2e8f0;
  box-shadow: 0 2px 6px #0f172a04;
}
.admin-workspace :deep(.v-container.dash .kpi) {
  border-top: 3px solid #93b5e5;
}
.admin-workspace :deep(.v-container.dash .panel-head) {
  background: #f8fafc;
  border-color: #e2e8f0;
}
.admin-workspace :deep(.kpi-icon),
.admin-workspace :deep(.shortcut-icon),
.admin-workspace :deep(.tool-icon) {
  background: #eff6ff;
  color: #2563eb;
}
.admin-workspace :deep(.company-table th) {
  background: #f8fafc;
  color: #64748b;
}
.admin-workspace :deep(.company-table tbody tr:hover),
.admin-workspace :deep(.shortcuts a:hover) {
  background: #f8fafc;
}
.admin-workspace :deep(.admin-header h1),
.admin-workspace :deep(.panel h2) {
  color: #1e293b;
}
.admin-workspace :deep(.v-btn) {
  text-transform: none;
  letter-spacing: 0;
  border-radius: 9px;
}
.admin-workspace :deep(.page-header h2) {
  color: #1e293b !important;
}
@media (max-width: 700px) {
  .admin-section-nav {
    padding: 10px 12px;
  }
  .admin-section-nav a {
    font-size: 0.75rem;
    padding: 8px 12px;
  }
}
</style>
