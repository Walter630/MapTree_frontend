<script setup lang="ts">
</script>
<template>
  <div class="admin-workspace">
    <router-view />
  </div>
</template>
<style scoped>
.admin-workspace {
  background: var(--mt-canvas);
  min-height: calc(100dvh - 68px);
  color: var(--mt-ink);
}
.admin-workspace :deep(.page-shell),
.admin-workspace :deep(.v-container.dash) {
  background: var(--mt-canvas) !important;
}
.admin-workspace :deep(.v-container.dash .panel),
.admin-workspace :deep(.v-container.dash .kpi) {
  background: var(--mt-surface);
  border-color: var(--mt-border);
  box-shadow: 0 2px 6px #0f172a04;
}
.admin-workspace :deep(.v-container.dash .kpi) {
  border-top: 3px solid var(--mt-teal);
}
.admin-workspace :deep(.v-container.dash .panel-head) {
  background: var(--mt-surface-soft);
  border-color: var(--mt-border);
}
.admin-workspace :deep(.kpi-icon),
.admin-workspace :deep(.shortcut-icon),
.admin-workspace :deep(.tool-icon) {
  background: var(--mt-surface-soft);
  color: var(--mt-teal);
}
.admin-workspace :deep(.company-table th) {
  background: var(--mt-surface-soft);
  color: var(--mt-text-muted);
}
.admin-workspace :deep(.company-table tbody tr:hover),
.admin-workspace :deep(.shortcuts a:hover) {
  background: var(--mt-surface-soft);
}
.admin-workspace :deep(.admin-header h1),
.admin-workspace :deep(.panel h2) {
  color: var(--mt-ink);
}
.admin-workspace :deep(.v-btn) {
  text-transform: none;
  letter-spacing: 0;
  border-radius: 9px;
}
.admin-workspace :deep(.page-header h2) {
  color: var(--mt-ink) !important;
}
</style>
