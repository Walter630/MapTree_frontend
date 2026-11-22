<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import {
  createCometEffect,
  drawCometFrame,
  type CometRenderProps,
} from '@/utils/cometOrbitRenderer'

const root = ref<HTMLDivElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)

const effectProps: CometRenderProps = {
  color: '#42A86F',
  accent: '#C6F513',
  comets: 24,
  trail: 62,
  spread: 48,
  advanced: {
    lapMs: 3710,
    perOrbit: 3,
    orbitRadius: 42,
    cageAspect: 88,
    orbitTwist: 31,
    shellSpin: 10,
    shellGlow: 38,
    orbitLines: 48,
    density: 420,
    headSpread: 2,
    tailSpread: 24,
    strayPct: 12,
    particleSize: 280,
    particleAlpha: 96,
    twinkle: 48,
    washColor: '#42A86F',
    washAlpha: 32,
    washWidth: 20,
    headGlow: 88,
    headCore: 9,
    depthDim: 40,
    globeSize: 46,
    globeColor: '#183B2B',
    globeFill: 92,
    gridLat: 7,
    gridLon: 12,
    gridOpacity: 48,
    globeSpin: 14,
    globeTilt: 18,
    drag: 0,
    inertia: 0,
    tapBurst: 0,
    hazeColor: '#75D397',
    hazeAlpha: 16,
    hazeRadius: 75,
    grain: 0,
    vignette: 0,
    hover: 0,
  },
}

let context: CanvasRenderingContext2D | null = null
let stage: Parameters<typeof drawCometFrame>[0] | null = null
let effect: ReturnType<typeof createCometEffect> | null = null
let resizeObserver: ResizeObserver | null = null
let motionPreference: MediaQueryList | null = null
let animationFrame = 0
let lastTime = 0
let clock = 0
let reducedMotion = false
let usesWindowResize = false

function render(now: number) {
  if (!context || !stage || !effect) return

  const dt = lastTime === 0 ? 0 : Math.min((now - lastTime) / 1000, 1 / 20)
  lastTime = now
  const animationDt = dt * 0.52
  clock += animationDt
  drawCometFrame(stage, effect, effectProps, clock, animationDt)
}

function animate(now: number) {
  animationFrame = 0
  render(now)
  if (!reducedMotion) animationFrame = requestAnimationFrame(animate)
}

function resize() {
  const element = root.value
  const target = canvas.value
  if (!element || !target || !context || !stage) return

  const bounds = element.getBoundingClientRect()
  stage.W = bounds.width || element.clientWidth
  stage.H = bounds.height || element.clientHeight
  stage.dpr = Math.min(window.devicePixelRatio || 1, 1.5)
  target.width = Math.max(1, Math.round(stage.W * stage.dpr))
  target.height = Math.max(1, Math.round(stage.H * stage.dpr))
  effect = createCometEffect()
  clock = 0
  lastTime = 0
  render(performance.now())
}

function syncMotionPreference() {
  reducedMotion = motionPreference?.matches ?? false
  if (animationFrame) cancelAnimationFrame(animationFrame)
  animationFrame = 0
  lastTime = 0
  render(performance.now())
  if (!reducedMotion) animationFrame = requestAnimationFrame(animate)
}

onMounted(() => {
  const target = canvas.value
  const element = root.value
  if (!element || !target || typeof CanvasRenderingContext2D === 'undefined') return
  context = target.getContext('2d')
  if (!context) return

  stage = {
    ctx: context,
    W: 0,
    H: 0,
    dpr: 1,
    pointer: { x: 0, y: 0, over: 0, down: false },
  }
  effect = createCometEffect()
  motionPreference = window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null
  reducedMotion = motionPreference?.matches ?? false
  motionPreference?.addEventListener('change', syncMotionPreference)

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(element)
  } else {
    window.addEventListener('resize', resize)
    usesWindowResize = true
  }

  resize()
  if (!reducedMotion) animationFrame = requestAnimationFrame(animate)
})

onBeforeUnmount(() => {
  if (animationFrame) cancelAnimationFrame(animationFrame)
  resizeObserver?.disconnect()
  if (usesWindowResize) window.removeEventListener('resize', resize)
  motionPreference?.removeEventListener('change', syncMotionPreference)
  context = null
  stage = null
  effect = null
})
</script>

<template>
  <div ref="root" class="comet-orbit" data-testid="comet-orbit-atom" aria-hidden="true">
    <canvas ref="canvas" />
  </div>
</template>

<style scoped>
.comet-orbit {
  position: relative;
  width: 200px;
  height: 160px;
  overflow: hidden;
  pointer-events: none;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
