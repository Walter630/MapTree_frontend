<script setup lang="ts">
import { onMounted, ref } from 'vue'
import LandingPageRenderer from '@/components/public/LandingPageRenderer.vue'
import { apiConnect } from '@/plugins/apiConnect'
import type { LandingDocument } from '@/types/landing'
import { resolveLandingImage } from '@/utils/landingContent'

const content = ref<LandingDocument | null>(null)
const loading = ref(true)
const errorMessage = ref('')

async function loadPublishedLanding() {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await apiConnect.getPublishedLanding()
    content.value = response.data.content
    const title = `MapTree | ${response.data.content.fields.hero.title}`
    const description = response.data.content.fields.hero.description
    const image = new URL(
      resolveLandingImage(response.data.content.fields.hero.desktopImage),
      window.location.origin,
    ).href
    document.title = title
    setMeta('name', 'description', description)
    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:image', image)
    setMeta('name', 'twitter:card', 'summary_large_image')
  } catch {
    errorMessage.value = 'Não foi possível carregar a página agora. Tente novamente.'
  } finally {
    loading.value = false
  }
}

function setMeta(attribute: 'name' | 'property', key: string, value: string) {
  let element = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.append(element)
  }
  element.content = value
}

onMounted(loadPublishedLanding)
</script>

<template>
  <div v-if="loading" class="landing-load-state" role="status" aria-live="polite">
    <span class="landing-load-spinner" aria-hidden="true"></span>
    <p>Carregando o MapTree…</p>
  </div>
  <div v-else-if="errorMessage" class="landing-load-state" role="alert">
    <p>{{ errorMessage }}</p>
    <button type="button" @click="loadPublishedLanding">Tentar novamente</button>
  </div>
  <LandingPageRenderer v-else-if="content" :content="content" />
</template>

<style scoped>
.landing-load-state {
  min-height: 100dvh;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 14px;
  padding: 24px;
  color: var(--mt-ink, #12382b);
  text-align: center;
}

.landing-load-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #d7e8df;
  border-top-color: #087344;
  border-radius: 50%;
  animation: landing-spin 700ms linear infinite;
}

.landing-load-state button {
  min-height: 44px;
  padding: 0 18px;
  border: 0;
  border-radius: 10px;
  color: #fff;
  background: #087344;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.landing-load-state button:focus-visible {
  outline: 3px solid #a4cb37;
  outline-offset: 3px;
}

@keyframes landing-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .landing-load-spinner { animation-duration: 2s; }
}
</style>
