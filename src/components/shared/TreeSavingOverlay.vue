<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    visible: boolean
    step?: 'tree' | 'measurement'
    progress?: number
  }>(),
  { step: 'tree', progress: 0 },
)

const label = computed(() =>
  props.step === 'measurement' ? 'Salvando medição' : 'Salvando árvore',
)
</script>

<template>
  <div
    v-if="visible"
    class="tree-save-progress"
    data-testid="tree-saving-progress"
    role="status"
    aria-live="polite"
  >
    <div class="tree-save-progress__label">
      <span>{{ label }}</span>
      <span>{{ progress }}%</span>
    </div>
    <v-progress-linear
      :model-value="progress"
      :aria-label="`${label}: ${progress}%`"
      color="primary"
      height="6"
      rounded
    />
  </div>
</template>

<style scoped>
.tree-save-progress {
  flex: 1 1 100%;
  min-width: min(100%, 220px);
  color: var(--mt-text-muted);
  font-size: 0.82rem;
}

.tree-save-progress__label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.35rem;
  color: var(--mt-ink);
  font-weight: 600;
}
</style>
