<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type StopStatus = 'completed' | 'pending'

interface DemoStop {
  id: string
  name: string
  address: string
  status: StopStatus
}

const initialStops = (): DemoStop[] => [
  { id: 'oiticica', name: 'Oiticica', address: 'Rua das Palmeiras', status: 'completed' },
  { id: 'ipe-amarelo', name: 'Ipê-amarelo', address: 'Av. das Acácias', status: 'pending' },
  { id: 'mangueira', name: 'Mangueira', address: 'Praça do Mercado', status: 'pending' },
]

const stops = ref<DemoStop[]>(initialStops())
const mapPoints = [
  { x: 132, y: 264 },
  { x: 355, y: 204 },
  { x: 574, y: 120 },
]
const routeMap = ref<HTMLElement | null>(null)
const routeDrawn = ref(false)
const reducedMotion = ref(false)

const completedCount = computed(
  () => stops.value.filter((stop) => stop.status === 'completed').length,
)
const progressPercent = computed(() => Math.round((completedCount.value / stops.value.length) * 100))
const nextStop = computed(() => stops.value.find((stop) => stop.status !== 'completed') || null)
const isComplete = computed(() => completedCount.value === stops.value.length)
const progressAnnouncement = computed(() =>
  nextStop.value
    ? `${completedCount.value} de ${stops.value.length} concluídas. Próxima parada: ${nextStop.value.name}.`
    : `${completedCount.value} de ${stops.value.length} concluídas. Demonstração finalizada.`,
)

let routeObserver: IntersectionObserver | null = null
let motionPreference: MediaQueryList | null = null

function syncReducedMotion() {
  if (!motionPreference) return
  reducedMotion.value = motionPreference.matches
  if (reducedMotion.value) routeDrawn.value = true
}

function simulatePruning() {
  const stop = nextStop.value
  if (!stop) return
  stop.status = 'completed'
}

function resetDemonstration() {
  stops.value = initialStops()
}

onMounted(() => {
  motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
  syncReducedMotion()
  motionPreference.addEventListener('change', syncReducedMotion)

  if (reducedMotion.value || typeof IntersectionObserver === 'undefined' || !routeMap.value) {
    routeDrawn.value = true
    return
  }

  routeObserver = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      routeDrawn.value = true
      routeObserver?.disconnect()
      routeObserver = null
    },
    { threshold: 0.25 },
  )
  routeObserver.observe(routeMap.value)
})

onBeforeUnmount(() => {
  routeObserver?.disconnect()
  motionPreference?.removeEventListener('change', syncReducedMotion)
})
</script>

<template>
  <div class="product-preview">
    <div class="preview-topbar">
      <div class="preview-brand-line">
        <div class="preview-brand">
          <span class="preview-brand-mark" aria-hidden="true">M</span>
          <span>MapTree</span>
        </div>
        <span class="preview-demo">Prévia demonstrativa</span>
      </div>

      <div class="progress-panel">
        <div
          class="route-progress"
          role="progressbar"
          aria-label="Progresso da rota demonstrativa"
          :aria-valuemin="0"
          :aria-valuemax="stops.length"
          :aria-valuenow="completedCount"
          :aria-valuetext="`${completedCount} de ${stops.length} concluídas`"
        >
          <span :style="{ width: `${progressPercent}%` }"></span>
        </div>
        <p class="progress-readout" role="status" aria-live="polite" aria-atomic="true">
          {{ progressAnnouncement }}
        </p>
      </div>
    </div>

    <div class="preview-body">
      <div ref="routeMap" class="preview-map" aria-hidden="true">
        <svg class="route-map-art" viewBox="0 0 720 360" preserveAspectRatio="none">
          <path class="map-green-space" d="M0 0h210L145 88 0 120zM520 0h200v98l-98-23zM0 280l105-24 78 104H0z" />
          <path class="map-block" d="M24 150h124v56H24zM180 24h113v69H180zM395 28h98v54h-98zM565 207h119v63H565zM226 286h119v49H226z" />
          <path class="map-road" d="M-28 245c99-10 145-25 225-47s120-16 180-4 126-5 205-50 103-74 170-80" />
          <path class="map-road" d="M170-30c43 76 50 123 35 185s8 128 72 235" />
          <path class="map-road" d="M478-26c-31 69-29 126 2 175s65 101 64 238" />
          <path class="map-road-edge" d="M-28 245c99-10 145-25 225-47s120-16 180-4 126-5 205-50 103-74 170-80" />
          <path
            class="map-route"
            :class="{ 'map-route--drawn': routeDrawn || reducedMotion }"
            d="M132 264c60-22 80-48 122-60s69 2 101 0 76-7 111-28 72-38 108-56"
            pathLength="1"
          />
          <g
            v-for="(stop, index) in stops"
            :key="stop.id"
            class="map-stop"
            :class="{
              'map-stop--complete': stop.status === 'completed',
              'map-stop--next': stop.id === nextStop?.id,
              'map-stop--pending': stop.status === 'pending' && stop.id !== nextStop?.id,
            }"
            :transform="`translate(${mapPoints[index]?.x} ${mapPoints[index]?.y})`"
            :data-testid="`route-map-stop-${index + 1}`"
          >
            <circle class="map-stop-shadow" r="20" />
            <circle class="map-stop-circle" r="15" />
            <text text-anchor="middle" dominant-baseline="central">{{ index + 1 }}</text>
          </g>
        </svg>

        <div class="map-legend">
          <span><i class="legend-tree" aria-hidden="true"></i>Árvores</span>
          <span><i class="legend-route" aria-hidden="true"></i>Rota do dia</span>
        </div>
      </div>

      <div class="preview-list-panel">
        <div class="preview-list-heading">
          <div>
            <span class="preview-label">ROTA DE HOJE</span>
            <h3>Paradas da equipe</h3>
          </div>
          <span class="route-date">Hoje</span>
        </div>

        <ol class="preview-list">
          <li
            v-for="(stop, index) in stops"
            :key="stop.id"
            class="preview-stop"
            :class="{
              'preview-stop--complete': stop.status === 'completed',
              'preview-stop--next': stop.id === nextStop?.id,
            }"
            :data-testid="`route-stop-${index + 1}`"
          >
            <span class="stop-number" aria-hidden="true">{{ index + 1 }}</span>
            <div class="stop-copy">
              <b>{{ stop.name }}</b>
              <small>{{ stop.address }}</small>
            </div>
            <span v-if="stop.status === 'completed'" class="stop-state">Concluída</span>
            <span v-else-if="stop.id === nextStop?.id" class="stop-state stop-state--next"
              >Próxima</span
            >
            <span v-else class="stop-state">A fazer</span>
          </li>
        </ol>

        <div class="preview-action">
          <template v-if="!isComplete && nextStop">
            <p>Próxima parada: <strong>{{ nextStop.name }}</strong></p>
            <button type="button" class="simulate-button" @click="simulatePruning">
              <span aria-hidden="true">✓</span> Simular poda
            </button>
          </template>
          <template v-else>
            <p class="demo-finished">Todas as paradas demonstrativas foram concluídas.</p>
            <button type="button" class="reset-button" @click="resetDemonstration">
              Reiniciar demonstração
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.product-preview {
  --preview-accent: #087344;
  --preview-next-text: #22613b;
  overflow: hidden;
  border: 1px solid var(--landing-border, var(--mt-border));
  border-radius: 24px;
  background: var(--mt-surface);
  box-shadow: 0 26px 70px rgb(12 55 36 / 12%);
}

:global(:root[data-theme='dark']) .product-preview {
  --preview-accent: #75d397;
  --preview-next-text: #d2e986;
}

.preview-topbar {
  min-height: 78px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 14px 24px;
  border-bottom: 1px solid var(--landing-border, var(--mt-border));
}

.preview-brand-line {
  display: flex;
  align-items: center;
  gap: 16px;
}

.preview-brand {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--mt-forest);
  font-family: 'K2D', 'Poppins', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
}

.preview-brand-mark {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  color: #fff;
  background: #087344;
  font-size: 0.77rem;
  font-weight: 700;
}

.preview-demo {
  padding: 6px 12px;
  border-radius: 999px;
  color: var(--mt-text-muted);
  background: var(--mt-surface-soft);
  font-size: 0.7rem;
  font-weight: 700;
}

.progress-panel {
  width: min(360px, 44%);
}

.route-progress {
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--mt-surface-soft);
}

.route-progress span {
  height: 100%;
  display: block;
  border-radius: inherit;
  background: #087344;
  transition: width 240ms ease;
}

.progress-readout {
  margin-top: 6px;
  color: var(--mt-text-muted);
  font-size: 0.72rem;
  text-align: right;
}

.preview-body {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(320px, 2fr);
}

.preview-map {
  min-height: 420px;
  position: relative;
  overflow: hidden;
  background: #e8efe4;
}

.route-map-art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.map-green-space {
  fill: #dce9d6;
}

.map-block {
  fill: #d5e3d1;
  stroke: #c2d5c1;
  stroke-width: 2;
}

.map-road {
  fill: none;
  stroke: #fff;
  stroke-width: 35;
  stroke-linecap: round;
}

.map-road-edge {
  fill: none;
  stroke: #d8dfd2;
  stroke-width: 2;
}

.map-route {
  fill: none;
  stroke: #078149;
  stroke-width: 8;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  filter: drop-shadow(0 2px 1px rgb(255 255 255 / 80%));
}

.map-route--drawn {
  stroke-dashoffset: 0;
  transition: stroke-dashoffset 1.15s cubic-bezier(0.2, 0.7, 0.2, 1);
}

.map-stop-shadow {
  fill: rgb(0 30 17 / 18%);
  transform: translateY(3px);
}

.map-stop-circle {
  stroke: #fff;
  stroke-width: 4;
  fill: #65746a;
}

.map-stop text {
  fill: #fff;
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  font-weight: 700;
}

.map-stop--complete .map-stop-circle {
  fill: #087344;
}

.map-stop--next .map-stop-circle {
  fill: #b5e440;
}

.map-stop--next text {
  fill: #173d27;
}

.map-legend {
  position: absolute;
  left: 20px;
  bottom: 18px;
  display: flex;
  gap: 14px;
  padding: 10px 13px;
  border: 1px solid rgb(255 255 255 / 75%);
  border-radius: 12px;
  color: #344b3e;
  background: rgb(255 255 255 / 93%);
  box-shadow: 0 4px 14px rgb(0 35 19 / 10%);
  font-size: 0.7rem;
  font-weight: 600;
}

.map-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.legend-tree {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #087344;
}

.legend-route {
  width: 17px;
  height: 3px;
  border-radius: 999px;
  background: #078149;
}

.preview-list-panel {
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 27px 26px 23px;
  background: var(--mt-surface);
}

.preview-list-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 18px;
}

.preview-label {
  color: var(--preview-accent);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.preview-list-heading h3 {
  margin: 5px 0 0;
  color: var(--mt-forest);
  font-family: 'K2D', 'Poppins', sans-serif;
  font-size: 1.2rem;
  font-weight: 700;
}

.route-date {
  padding: 5px 10px;
  border-radius: 999px;
  color: var(--mt-text-muted);
  background: var(--mt-surface-soft);
  font-size: 0.72rem;
  font-weight: 600;
}

.preview-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.preview-stop {
  min-height: 80px;
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 12px 11px;
  border-top: 1px solid var(--landing-border, var(--mt-border));
  border-radius: 12px;
}

.preview-stop--next {
  margin-block: 5px;
  border: 1px solid color-mix(in srgb, #087344 26%, var(--landing-border, var(--mt-border)));
  background: color-mix(in srgb, #b5e440 15%, var(--mt-surface));
}

.stop-number {
  width: 30px;
  height: 30px;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background: #65746a;
  font-size: 0.73rem;
  font-weight: 700;
}

.preview-stop--complete .stop-number {
  background: #087344;
}

.preview-stop--next .stop-number {
  color: #173d27;
  background: #b5e440;
}

.stop-copy {
  min-width: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}

.stop-copy b {
  overflow: hidden;
  color: var(--mt-forest);
  font-size: 0.82rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stop-copy small {
  overflow: hidden;
  color: var(--mt-text-muted);
  font-size: 0.7rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stop-state {
  flex: 0 0 auto;
  color: var(--mt-text-muted);
  font-size: 0.75rem;
  font-weight: 600;
}

.stop-state--next {
  color: var(--preview-next-text);
}

.preview-action {
  margin-top: auto;
  padding-top: 20px;
}

.preview-action p {
  margin-bottom: 10px;
  color: var(--mt-text-muted);
  font-size: 0.76rem;
}

.preview-action p strong {
  color: var(--mt-forest);
  font-weight: 700;
}

.simulate-button,
.reset-button {
  width: 100%;
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 12px;
  color: #fff;
  background: #087344;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 160ms ease, transform 160ms ease;
}

.simulate-button:hover,
.reset-button:hover {
  background: #005a35;
  transform: translateY(-1px);
}

.demo-finished {
  color: var(--preview-accent) !important;
  font-weight: 700;
}

@media (max-width: 850px) {
  .preview-body {
    grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
  }
  .preview-list-panel {
    padding-inline: 18px;
  }
}

@media (max-width: 700px) {
  .product-preview {
    border-radius: 18px;
  }
  .preview-topbar {
    min-height: 0;
    align-items: stretch;
    flex-direction: column;
    gap: 15px;
    padding: 15px;
  }
  .preview-brand-line {
    justify-content: space-between;
    gap: 8px;
  }
  .progress-panel {
    width: 100%;
  }
  .preview-body {
    grid-template-columns: 1fr;
  }
  .preview-map {
    min-height: 250px;
  }
  .preview-list-panel {
    padding: 20px 15px 16px;
  }
  .preview-stop {
    min-height: 72px;
    gap: 10px;
    padding-inline: 8px;
  }
  .map-legend {
    left: 10px;
    bottom: 10px;
    gap: 9px;
    padding: 8px 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .map-route--drawn,
  .route-progress span,
  .simulate-button,
  .reset-button {
    transition-duration: 0.01ms;
  }
  .map-route {
    stroke-dashoffset: 0;
  }
}
</style>
