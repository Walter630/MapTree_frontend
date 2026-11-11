<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

/**
 * Tela de carregamento do cadastro de árvore.
 * Somente SVG + CSS (animando apenas transform/opacity): sem biblioteca, sem imagem
 * e sem WebGL. Fica visível por um tempo mínimo para não piscar em respostas rápidas.
 */
const props = withDefaults(
  defineProps<{
    visible: boolean
    /** Etapa atual: gravação da árvore ou da medição de campo. */
    step?: 'tree' | 'measurement'
  }>(),
  { step: 'tree' },
)

const MIN_VISIBLE_MS = 700

const shown = ref(props.visible)
let shownAt = props.visible ? Date.now() : 0
let hideTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      if (hideTimer) {
        clearTimeout(hideTimer)
        hideTimer = null
      }
      if (!shown.value) {
        shownAt = Date.now()
        shown.value = true
      }
      return
    }
    if (!shown.value) return
    const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt))
    hideTimer = setTimeout(() => {
      shown.value = false
      hideTimer = null
    }, remaining)
  },
)

onBeforeUnmount(() => {
  if (hideTimer) clearTimeout(hideTimer)
})

const content = computed(() =>
  props.step === 'measurement'
    ? { title: 'Registrando a medição', message: 'Salvando altura e largura da copa…' }
    : { title: 'Cadastrando sua árvore', message: 'Salvando espécie e localização no mapa…' },
)

// Região viva persistente: leitores de tela anunciam o andamento, e o resultado
// final é anunciado pelos alertas da própria página.
const announcement = computed(() =>
  props.visible ? `${content.value.title}. ${content.value.message}` : '',
)
</script>

<template>
  <div>
    <p class="ts-sr-only" role="status" aria-live="polite">{{ announcement }}</p>

    <Transition name="ts-fade">
      <div v-if="shown" class="ts-overlay" data-testid="tree-saving-overlay" aria-hidden="true">
        <div class="ts-card">
          <svg viewBox="0 0 200 160" class="ts-scene" focusable="false">
            <ellipse cx="100" cy="134" rx="64" ry="9" class="ts-ground" />
            <ellipse cx="100" cy="134" rx="30" ry="6" class="ts-ripple" />
            <ellipse cx="100" cy="134" rx="30" ry="6" class="ts-ripple ts-ripple--late" />

            <g class="ts-pin">
              <path
                d="M100 134 C92 122 84 112 84 98 A16 16 0 0 1 116 98 C116 112 108 122 100 134 Z"
              />
              <circle cx="100" cy="98" r="6" fill="#ffffff" />
            </g>

            <g class="ts-tree">
              <rect class="ts-trunk" x="96" y="96" width="8" height="38" rx="3" />
              <g class="ts-crown">
                <circle class="ts-leaf ts-leaf--a" cx="100" cy="76" r="24" />
                <circle class="ts-leaf ts-leaf--b" cx="80" cy="92" r="16" />
                <circle class="ts-leaf ts-leaf--c" cx="120" cy="92" r="16" />
              </g>
            </g>
          </svg>

          <h2 class="ts-title">{{ content.title }}</h2>
          <p class="ts-message">{{ content.message }}</p>

          <div class="ts-bar"><span /></div>

          <p class="ts-brand">MapTree · Gestão inteligente de vegetação</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.ts-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.ts-overlay {
  position: fixed;
  inset: 0;
  z-index: 2400;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background:
    radial-gradient(circle at 50% 38%, rgba(198, 245, 19, 0.16), transparent 55%),
    rgba(247, 248, 250, 0.95);
}

.ts-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: min(100%, 360px);
  text-align: center;
}

.ts-scene {
  width: 200px;
  height: 160px;
  overflow: visible;
}

.ts-title {
  margin: 4px 0 0;
  font-size: 1.2rem;
  font-weight: 800;
  color: #1e293b;
}

.ts-message {
  margin: 6px 0 0;
  font-size: 0.92rem;
  color: #64748b;
}

.ts-brand {
  margin: 18px 0 0;
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  color: #94a3b8;
}

/* ===== Cena =====
   O estado-base é a árvore já formada. Assim, com movimento reduzido
   (animation: none), a cena fica estática e ainda faz sentido. */
.ts-ground {
  fill: #dfe7dc;
}

.ts-ripple {
  fill: none;
  stroke: #66bb6a;
  stroke-width: 2;
  opacity: 0;
  transform-box: fill-box;
  transform-origin: 50% 50%;
}

.ts-pin {
  fill: #1b5e20;
  opacity: 0;
  transform-box: fill-box;
  transform-origin: 50% 100%;
}

.ts-trunk {
  fill: #8d6e63;
  transform-box: fill-box;
  transform-origin: 50% 100%;
}

.ts-crown {
  transform-box: fill-box;
  transform-origin: 50% 100%;
}

.ts-leaf--a {
  fill: #2e7d32;
}
.ts-leaf--b {
  fill: #43a047;
}
.ts-leaf--c {
  fill: #66bb6a;
}

/* ===== Barra de andamento ===== */
.ts-bar {
  position: relative;
  width: 180px;
  height: 4px;
  margin-top: 18px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}

.ts-bar span {
  position: absolute;
  inset: 0 auto 0 0;
  width: 40%;
  border-radius: 999px;
  background: linear-gradient(90deg, #2e7d32, #c6f513);
}

/* ===== Transição de entrada/saída ===== */
.ts-fade-enter-active,
.ts-fade-leave-active {
  transition: opacity 0.18s ease;
}
.ts-fade-enter-from,
.ts-fade-leave-to {
  opacity: 0;
}

/* ===== Animações (apenas transform e opacity) ===== */
@media (prefers-reduced-motion: no-preference) {
  .ts-pin {
    animation: ts-pin 3.2s ease-in-out infinite;
  }
  .ts-trunk {
    animation: ts-trunk 3.2s ease-in-out infinite;
  }
  .ts-crown {
    animation: ts-crown 3.2s ease-in-out infinite;
  }
  .ts-ripple {
    animation: ts-ripple 3.2s ease-out infinite;
  }
  .ts-ripple--late {
    animation-delay: 1.1s;
  }
  .ts-bar span {
    animation: ts-bar 1.4s ease-in-out infinite;
  }
}

@keyframes ts-pin {
  0% {
    transform: translateY(-46px) scale(1);
    opacity: 0;
  }
  18% {
    opacity: 1;
  }
  30% {
    transform: translateY(0) scale(1);
  }
  36% {
    transform: translateY(-7px) scale(1);
  }
  42% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  58% {
    transform: translateY(0) scale(0);
    opacity: 0;
  }
  100% {
    transform: translateY(0) scale(0);
    opacity: 0;
  }
}

@keyframes ts-trunk {
  0%,
  48% {
    transform: scaleY(0);
    opacity: 1;
  }
  64% {
    transform: scaleY(1);
  }
  92% {
    transform: scaleY(1);
    opacity: 1;
  }
  100% {
    transform: scaleY(1);
    opacity: 0;
  }
}

@keyframes ts-crown {
  0%,
  58% {
    transform: scale(0);
    opacity: 1;
  }
  74% {
    transform: scale(1.08);
  }
  80% {
    transform: scale(1);
  }
  92% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}

@keyframes ts-ripple {
  0%,
  26% {
    transform: scale(0.2);
    opacity: 0;
  }
  32% {
    opacity: 0.55;
  }
  70%,
  100% {
    transform: scale(1.7);
    opacity: 0;
  }
}

@keyframes ts-bar {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(350%);
  }
}
</style>
