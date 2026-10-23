<template>
  <!--
    Ícone "vivo" para os cards de KPI.
    Usa apenas SVG + CSS (sem bibliotecas, sem WebGL, sem arquivos externos),
    então é extremamente leve. Cada tipo tem uma animação sutil própria.
  -->
  <div class="animated-icon" :class="`animated-icon--${type}`" :style="{ '--accent': color }">
    <!-- Árvore: balança suave -->
    <svg v-if="type === 'tree'" viewBox="0 0 48 48" class="ai-svg ai-tree" aria-hidden="true">
      <rect x="22" y="30" width="4" height="12" rx="2" class="ai-trunk" />
      <g class="ai-crown">
        <circle cx="24" cy="18" r="11" />
        <circle cx="16" cy="24" r="7" />
        <circle cx="32" cy="24" r="7" />
      </g>
    </svg>

    <!-- Tesoura de poda: abre e fecha -->
    <svg v-else-if="type === 'prune'" viewBox="0 0 48 48" class="ai-svg ai-prune" aria-hidden="true">
      <line x1="10" y1="36" x2="30" y2="16" class="ai-blade ai-blade-top" />
      <line x1="10" y1="12" x2="30" y2="32" class="ai-blade ai-blade-bottom" />
      <circle cx="34" cy="14" r="4" class="ai-ring" />
      <circle cx="34" cy="34" r="4" class="ai-ring" />
    </svg>

    <!-- Alerta: pulsa -->
    <svg v-else-if="type === 'alert'" viewBox="0 0 48 48" class="ai-svg ai-alert" aria-hidden="true">
      <path d="M24 8 L42 38 L6 38 Z" class="ai-triangle" />
      <rect x="22" y="18" width="4" height="10" rx="2" class="ai-mark" />
      <circle cx="24" cy="32" r="2.2" class="ai-mark" />
    </svg>

    <!-- Semente/broto: cresce sutilmente -->
    <svg v-else viewBox="0 0 48 48" class="ai-svg ai-sprout" aria-hidden="true">
      <path d="M24 42 V22" class="ai-stem" />
      <path d="M24 26 C16 26 12 20 12 14 C20 14 24 20 24 26 Z" class="ai-leaf ai-leaf-left" />
      <path d="M24 22 C32 22 36 16 36 10 C28 10 24 16 24 22 Z" class="ai-leaf ai-leaf-right" />
    </svg>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    type: 'tree' | 'prune' | 'alert' | 'sprout'
    color?: string
  }>(),
  {
    color: '#2e7d32',
  },
)
</script>

<style scoped>
.animated-icon {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.ai-svg {
  width: 100%;
  height: 100%;
}

/* ===== Árvore ===== */
.ai-tree .ai-crown {
  fill: var(--accent);
  transform-origin: 24px 30px;
  animation: tree-sway 4s ease-in-out infinite;
}
.ai-tree .ai-trunk {
  fill: #8d6e63;
}
@keyframes tree-sway {
  0%, 100% { transform: rotate(-3deg); }
  50% { transform: rotate(3deg); }
}

/* ===== Tesoura ===== */
.ai-prune .ai-blade {
  stroke: var(--accent);
  stroke-width: 3.5;
  stroke-linecap: round;
  transform-origin: 30px 24px;
}
.ai-prune .ai-ring {
  fill: none;
  stroke: var(--accent);
  stroke-width: 3;
}
.ai-prune .ai-blade-top {
  animation: blade-top 2.6s ease-in-out infinite;
}
.ai-prune .ai-blade-bottom {
  animation: blade-bottom 2.6s ease-in-out infinite;
}
@keyframes blade-top {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(-12deg); }
}
@keyframes blade-bottom {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(12deg); }
}

/* ===== Alerta ===== */
.ai-alert {
  transform-origin: 24px 24px;
  animation: alert-pulse 1.8s ease-in-out infinite;
}
.ai-alert .ai-triangle {
  fill: none;
  stroke: var(--accent);
  stroke-width: 3.5;
  stroke-linejoin: round;
}
.ai-alert .ai-mark {
  fill: var(--accent);
}
@keyframes alert-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.12); opacity: 0.8; }
}

/* ===== Broto ===== */
.ai-sprout .ai-stem {
  stroke: #8d6e63;
  stroke-width: 3;
  stroke-linecap: round;
  fill: none;
}
.ai-sprout .ai-leaf {
  fill: var(--accent);
  transform-origin: 24px 22px;
}
.ai-sprout .ai-leaf-left {
  animation: leaf-left 3.5s ease-in-out infinite;
}
.ai-sprout .ai-leaf-right {
  animation: leaf-right 3.5s ease-in-out infinite;
}
@keyframes leaf-left {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(-6deg); }
}
@keyframes leaf-right {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(6deg); }
}

/* Respeita quem prefere menos animação (acessibilidade) */
@media (prefers-reduced-motion: reduce) {
  .ai-crown,
  .ai-blade-top,
  .ai-blade-bottom,
  .ai-alert,
  .ai-leaf-left,
  .ai-leaf-right {
    animation: none !important;
  }
}
</style>
