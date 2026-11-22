<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, toRefs } from 'vue'
import { RouterLink } from 'vue-router'
import DemoRoutePreview from '@/components/public/DemoRoutePreview.vue'
import TreeMonitoringPreview from '@/components/public/TreeMonitoringPreview.vue'
import type { LandingDocument, LandingImage, LandingSectionId } from '@/types/landing'
import { resolveLandingHref, resolveLandingImage } from '@/utils/landingContent'

const props = defineProps<{ content: LandingDocument; draft?: boolean }>()
const { content } = toRefs(props)
const mobileMenuOpen = ref(false)
const menuButton = ref<HTMLButtonElement | null>(null)
const landingRoot = ref<HTMLElement | null>(null)
let revealObserver: IntersectionObserver | null = null

const imagePath = (image: LandingImage) => resolveLandingImage(image, props.draft)
const linkPath = (href: string) => resolveLandingHref(href, window.location.hostname)
const isVisible = (id: LandingSectionId | 'footer') => props.content.visibility[id]

function closeMobileMenu(restoreFocus = false) {
  mobileMenuOpen.value = false
  if (restoreFocus) menuButton.value?.focus()
}

onMounted(() => {
  const canRevealSections =
    !props.draft &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
    'IntersectionObserver' in window &&
    landingRoot.value

  if (canRevealSections && landingRoot.value) {
    const revealTargets = landingRoot.value.querySelectorAll<HTMLElement>('.scroll-reveal')
    if (revealTargets.length) {
      revealObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible')
              observer.unobserve(entry.target)
            }
          })
        },
        { threshold: 0.1, rootMargin: '0px 0px -48px 0px' },
      )
      landingRoot.value.classList.add('reveals-active')
      revealTargets.forEach((target) => revealObserver?.observe(target))
    }
  }
})

onBeforeUnmount(() => {
  revealObserver?.disconnect()
  revealObserver = null
})
</script>

<template>
  <main ref="landingRoot" class="landing tw:w-full tw:overflow-clip tw:bg-mt-canvas tw:text-mt-ink">
    <div id="inicio" class="hero-shell tw:relative tw:isolate tw:flex tw:flex-col tw:overflow-hidden tw:bg-[#00281a] tw:text-white">
      <picture class="hero-photo">
        <source :srcset="imagePath(content.fields.hero.mobileImage)" media="(max-width: 700px)" />
        <img
          :src="imagePath(content.fields.hero.desktopImage)"
          width="1672"
          height="941"
          :alt="content.fields.hero.desktopImage.alt || content.fields.hero.mobileImage.alt"
          fetchpriority="high"
          decoding="async"
        />
      </picture>
      <div class="hero-shade" aria-hidden="true"></div>

      <header class="landing-header tw:flex tw:min-h-[5.875rem] tw:items-center tw:justify-between tw:gap-4 tw:border-b tw:border-white/20 tw:max-compact:min-h-[4.75rem]">
        <RouterLink class="brand" to="/" aria-label="MapTree, início">
          <img :src="imagePath(content.fields.header.logo)" width="260" height="77" :alt="content.fields.header.logo.alt" />
        </RouterLink>
        <button
          ref="menuButton"
          class="landing-mobile-toggle tw:items-center tw:justify-center tw:rounded-full tw:border tw:border-white/50 tw:text-white"
          type="button"
          aria-controls="landing-navigation"
          :aria-expanded="mobileMenuOpen"
          :aria-label="mobileMenuOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'"
          @click="mobileMenuOpen = !mobileMenuOpen"
          @keydown.esc.prevent="closeMobileMenu(true)"
        >
          <span aria-hidden="true">{{ mobileMenuOpen ? '×' : '☰' }}</span>
        </button>
        <nav
          class="landing-nav"
          :class="{ 'is-open': mobileMenuOpen }"
          id="landing-navigation"
          aria-label="Navegação da página"
          @keydown.esc.prevent="closeMobileMenu(true)"
        >
          <a v-for="(item, index) in content.fields.header.navigation" :key="`${item.href}-${index}`" :href="linkPath(item.href)" @click="closeMobileMenu()">{{ item.label }}</a>
          <a class="header-login" :href="linkPath('login')" @click="closeMobileMenu()">{{ content.fields.header.loginLabel }}</a>
          <a class="header-access" :href="linkPath('register')" @click="closeMobileMenu()">
            {{ content.fields.header.accessLabel }}
          </a>
        </nav>
      </header>

      <section class="hero tw:flex tw:flex-1 tw:items-center tw:max-compact:items-end" aria-labelledby="hero-title">
        <div class="hero-copy tw:relative tw:z-10 tw:w-[min(52rem,58%)] tw:max-tablet:w-[min(40rem,72%)] tw:max-compact:w-full">
          <h1 id="hero-title" class="tw:tracking-[-0.035em]">{{ content.fields.hero.title }}</h1>
          <p>{{ content.fields.hero.description }}</p>
          <div class="hero-actions">
            <a class="button button-primary" :href="linkPath('register')">
              {{ content.fields.hero.primaryActionLabel }} <span aria-hidden="true">→</span>
            </a>
            <a class="button button-secondary" :href="linkPath(content.fields.hero.secondaryActionHref)">{{ content.fields.hero.secondaryActionLabel }}</a>
          </div>
          <div class="hero-capabilities" aria-label="Recursos do MapTree">
            <span v-for="capability in content.fields.hero.capabilities" :key="capability"><i aria-hidden="true">✓</i> {{ capability }}</span>
          </div>
        </div>
        <figure class="hero-product-preview" aria-label="Prévia demonstrativa do painel MapTree">
          <img
            :src="imagePath(content.fields.hero.previewImage)"
            :alt="content.fields.hero.previewImage.alt"
            width="960"
            height="600"
            loading="eager"
          />
          <figcaption>{{ content.fields.hero.previewCaption }}</figcaption>
        </figure>
      </section>
    </div>

    <template v-for="sectionId in content.order" :key="sectionId">
    <section
      v-if="sectionId === 'prevention' && isVisible('prevention')"
      id="prevencao"
      class="monitor-section section-wrap scroll-reveal tw:py-[7.25rem] tw:max-tablet:py-[6.5rem] tw:max-compact:py-[4.75rem]"
      aria-labelledby="monitor-title"
    >
      <div class="section-heading">
        <h2 id="monitor-title">{{ content.fields.prevention.title }}</h2>
        <p>{{ content.fields.prevention.description }}</p>
      </div>
      <TreeMonitoringPreview />
    </section>

    <section v-if="sectionId === 'productDemo' && isVisible('productDemo')" id="produto" class="product-section section-wrap scroll-reveal" aria-labelledby="product-title">
      <div class="section-heading">
        <h2 id="product-title">{{ content.fields.productDemo.title }}</h2>
        <p>{{ content.fields.productDemo.description }}</p>
      </div>
      <DemoRoutePreview />
      <p class="preview-caption">{{ content.fields.productDemo.caption }}</p>
    </section>

    <section
      v-if="sectionId === 'workflow' && isVisible('workflow')"
      id="como-funciona"
      class="workflow-section scroll-reveal"
      aria-labelledby="workflow-title"
    >
      <div class="section-wrap">
        <div class="section-heading">
          <h2 id="workflow-title">{{ content.fields.workflow.title }}</h2>
          <p>{{ content.fields.workflow.description }}</p>
        </div>

        <ol class="steps">
          <li v-for="step in content.fields.workflow.steps" :key="step.id" class="step-card">
            <div class="step-image-wrap">
              <img :src="imagePath(step.image)" :alt="step.image.alt" width="480" height="300" loading="lazy" />
              <span class="step-number">{{ step.number }}</span>
            </div>
            <div class="step-copy">
              <h3>{{ step.title }}</h3>
              <p>{{ step.description }}</p>
            </div>
          </li>
        </ol>
      </div>
    </section>

    <section v-if="sectionId === 'features' && isVisible('features')" id="funcionalidades" class="features-section section-wrap scroll-reveal" aria-labelledby="features-title">
      <div class="section-heading">
        <h2 id="features-title">{{ content.fields.features.title }}</h2>
        <p>{{ content.fields.features.description }}</p>
      </div>
      <div class="features-grid">
        <article v-for="feature in content.fields.features.items" :key="feature.id" class="feature-card">
          <span class="feature-icon" aria-hidden="true">{{ feature.icon }}</span>
          <h3>{{ feature.title }}</h3>
          <p>{{ feature.description }}</p>
        </article>
      </div>
    </section>

    <section v-if="sectionId === 'audience' && isVisible('audience')" class="audience-section section-wrap scroll-reveal" aria-labelledby="audience-title">
      <div class="section-heading">
        <h2 id="audience-title">{{ content.fields.audience.title }}</h2>
        <p class="audience-intro">
          {{ content.fields.audience.description }}
        </p>
      </div>
      <div class="audience-grid">
        <article v-for="card in content.fields.audience.cards" :key="card.id" class="audience-card">
          <span class="audience-icon" aria-hidden="true">{{ card.icon }}</span>
          <div>
            <h3>{{ card.title }}</h3>
            <p>{{ card.description }}</p>
          </div>
        </article>
      </div>
    </section>

    <section v-if="sectionId === 'about' && isVisible('about')" id="sobre" class="about-section" aria-labelledby="about-title">
      <div class="about-inner section-wrap scroll-reveal">
        <div class="about-photo-wrap">
          <img
            class="about-photo-main"
            :src="imagePath(content.fields.about.mainImage)"
            :alt="content.fields.about.mainImage.alt"
            width="1536"
            height="1024"
            loading="lazy"
            decoding="async"
          />
          <figure class="about-photo-inset">
            <img
              :src="imagePath(content.fields.about.insetImage)"
              :alt="content.fields.about.insetImage.alt"
              width="1536"
              height="1024"
              loading="lazy"
              decoding="async"
            />
            <figcaption>{{ content.fields.about.insetCaption }}</figcaption>
          </figure>
          <span class="photo-caption">{{ content.fields.about.mainCaption }}</span>
        </div>
        <div class="about-copy">
          <h2 id="about-title">{{ content.fields.about.title }}</h2>
          <p v-for="(paragraph, index) in content.fields.about.paragraphs" :key="index" :class="{ 'about-note': index > 0 }">{{ paragraph }}</p>
          <a class="text-link" :href="linkPath('register')">{{ content.fields.about.actionLabel }} <span aria-hidden="true">→</span></a>
        </div>
      </div>
    </section>

    <section v-if="sectionId === 'analytics' && isVisible('analytics')" class="ai-section scroll-reveal" aria-labelledby="ai-title">
      <div class="ai-inner section-wrap">
        <div class="ai-status">{{ content.fields.analytics.badge }}</div>
        <h2 id="ai-title">{{ content.fields.analytics.title }}</h2>
        <p v-for="(paragraph, index) in content.fields.analytics.paragraphs" :key="index">{{ paragraph }}</p>
      </div>
    </section>

    <section
      v-if="sectionId === 'faq' && isVisible('faq')"
      id="perguntas-frequentes"
      class="faq-section section-wrap scroll-reveal"
      aria-labelledby="faq-title"
    >
      <div class="section-heading">
        <h2 id="faq-title">{{ content.fields.faq.title }}</h2>
      </div>
      <div class="faq-list">
        <details v-for="(item, index) in content.fields.faq.items" :key="item.id" :open="index === 0">
          <summary>{{ item.question }}</summary>
          <p>{{ item.answer }}</p>
        </details>
      </div>
    </section>

    <section v-if="sectionId === 'finalCta' && isVisible('finalCta')" class="final-cta scroll-reveal" aria-labelledby="final-cta-title">
      <div class="final-cta-inner section-wrap">
        <div>
          <h2 id="final-cta-title">{{ content.fields.finalCta.title }}</h2>
          <p>{{ content.fields.finalCta.description }}</p>
        </div>
        <a class="button button-primary" :href="linkPath('register')">
          {{ content.fields.finalCta.buttonLabel }} <span aria-hidden="true">→</span>
        </a>
      </div>
    </section>
    </template>

    <footer v-if="isVisible('footer')" class="landing-footer">
      <div class="footer-inner section-wrap">
        <RouterLink class="footer-brand" to="/" aria-label="MapTree, início">
          <img :src="imagePath(content.fields.header.logo)" width="260" height="77" :alt="content.fields.header.logo.alt" />
        </RouterLink>
        <p>{{ content.fields.footer.tagline }}</p>
        <nav class="footer-nav" aria-label="Links do rodapé">
          <a v-for="(item, index) in content.fields.footer.links" :key="`${item.href}-${index}`" :href="linkPath(item.href)">{{ item.label }}</a>
          <a :href="linkPath('login')">{{ content.fields.footer.loginLabel }}</a>
          <a :href="linkPath('register')">{{ content.fields.footer.accessLabel }}</a>
        </nav>
        <p class="footer-pending-links">{{ content.fields.footer.pendingLinks }}</p>
        <a class="back-to-top" href="#inicio">{{ content.fields.footer.backToTopLabel }}</a>
      </div>
    </footer>
  </main>
</template>

<style scoped>
.landing {
  display: flex;
  flex-direction: column;
  --landing-width: 1200px;
  --landing-ink: var(--mt-forest);
  --landing-muted: var(--mt-text-muted);
  --landing-border: var(--mt-border);
  --landing-accent: #087344;
}

:global(:root[data-theme='dark']) .landing {
  --landing-accent: #75d397;
}

.section-wrap {
  width: min(var(--landing-width), calc(100% - 64px));
  margin-inline: auto;
}

.landing :is(h1, h2, h3) {
  text-wrap: balance;
}

.landing p {
  text-wrap: pretty;
}

.hero-shell {
  min-height: 100vh;
  min-height: 100dvh;
}

.hero-photo,
.hero-shade {
  position: absolute;
  z-index: -1;
  inset: 0;
}

.hero-photo img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  object-position: center 46%;
  animation: hero-photo-in 1.25s cubic-bezier(0.2, 0.7, 0.2, 1) both;
}

.landing-header {
  animation: hero-content-in 650ms cubic-bezier(0.2, 0.7, 0.2, 1) 80ms both;
}

.hero-copy > * {
  animation: hero-content-in 680ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
}

.hero-copy > h1 {
  animation-delay: 140ms;
}

.hero-copy > p {
  animation-delay: 260ms;
}

.hero-copy > .hero-actions {
  animation-delay: 380ms;
}

.hero-copy > .hero-capabilities {
  animation-delay: 500ms;
}

@keyframes hero-content-in {
  from {
    opacity: 0;
    transform: translate3d(0, 18px, 0);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes hero-photo-in {
  from {
    opacity: 0.78;
    transform: scale(1.035);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

.landing.reveals-active .scroll-reveal {
  opacity: 0;
  transform: translate3d(0, 22px, 0);
  transition:
    opacity 680ms cubic-bezier(0.2, 0.7, 0.2, 1),
    transform 680ms cubic-bezier(0.2, 0.7, 0.2, 1);
}

.landing.reveals-active .scroll-reveal.is-visible {
  opacity: 1;
  transform: translate3d(0, 0, 0);
}

.hero-shade {
  background:
    linear-gradient(90deg, rgb(0 31 20 / 98%) 0%, rgb(0 40 26 / 92%) 34%, rgb(0 40 26 / 55%) 57%, rgb(0 35 24 / 15%) 100%),
    linear-gradient(0deg, rgb(0 28 19 / 30%), transparent 34%);
}

.landing-header,
.hero {
  width: 100%;
  max-width: none;
  margin-inline: 0;
  padding-inline: clamp(1rem, 4vw, 5.5rem);
}

.landing-header {
  position: relative;
  z-index: 20;
}

.landing-mobile-toggle {
  display: none;
  width: 44px;
  height: 44px;
  font-size: 1.3rem;
  cursor: pointer;
}

.brand,
.footer-brand {
  width: 154px;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
}

.brand img,
.footer-brand img {
  width: 100%;
  height: auto;
  display: block;
  filter: brightness(0) invert(1);
}

.footer-nav {
  display: flex;
  align-items: center;
  gap: clamp(20px, 3vw, 40px);
}

.landing-nav a {
  color: rgb(255 255 255 / 88%);
  font-size: 0.88rem;
  font-weight: 600;
  text-decoration: none;
  transition: color 160ms ease, background-color 160ms ease;
}

.landing-nav {
  display: flex;
  align-items: center;
  gap: clamp(1rem, 2vw, 2rem);
}

.landing-mobile-toggle:focus-visible,
.landing-nav a:focus-visible {
  outline: 3px solid var(--mt-lime);
  outline-offset: 3px;
}

.landing-nav a:hover,
.landing-nav a:focus-visible {
  color: var(--mt-lime);
}

.landing-nav .header-login {
  min-width: 104px;
  min-height: 44px;
  display: inline-grid;
  place-items: center;
  border: 1px solid rgb(255 255 255 / 48%);
  border-radius: 999px;
  color: #fff;
}

.landing-nav .header-access {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding-inline: 18px;
  border-radius: 999px;
  color: #17351e;
  background: #c8ee67;
  font-weight: 700;
  white-space: nowrap;
}

.landing-nav .header-access:hover,
.landing-nav .header-access:focus-visible {
  color: #17351e;
  background: #d8f596;
}

.landing-nav .header-login:hover {
  color: #00281a;
  background: #fff;
}

.hero {
  position: relative;
  min-height: 596px;
  padding-block: 76px;
}

.hero-product-preview {
  width: min(38%, 470px);
  position: absolute;
  z-index: 1;
  right: clamp(1rem, 4vw, 5.5rem);
  top: 50%;
  margin: 0;
  padding: 12px;
  border: 1px solid rgb(255 255 255 / 55%);
  border-radius: 20px;
  background: rgb(255 255 255 / 94%);
  box-shadow: 0 30px 80px rgb(0 0 0 / 35%);
  transform: translateY(-42%);
}

.hero-product-preview img {
  width: 100%;
  display: block;
  border-radius: 12px;
}

.hero-product-preview figcaption {
  padding: 10px 4px 2px;
  color: #365247;
  font-size: 0.7rem;
  font-weight: 600;
}

.hero h1 {
  max-width: 832px;
  margin-top: 0;
  color: #fff;
  font-size: clamp(2.9rem, 5.2vw, 4.7rem);
  font-weight: 600;
  line-height: 1.08;
}

.hero-copy > p {
  max-width: 620px;
  margin-top: 22px;
  color: rgb(255 255 255 / 82%);
  font-size: clamp(1rem, 1.3vw, 1.12rem);
  line-height: 1.75;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 30px;
}

.button {
  min-height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 12px 21px;
  border: 1px solid transparent;
  border-radius: 12px;
  font-size: 0.88rem;
  font-weight: 700;
  line-height: 1.3;
  text-align: center;
  text-decoration: none;
  transition: transform 160ms ease, background-color 160ms ease, box-shadow 160ms ease;
}

.button:hover {
  transform: translateY(-2px);
}

.button > span {
  transition: transform 180ms ease;
}

.button:hover > span {
  transform: translateX(3px);
}

.button-primary {
  color: #193421;
  background: var(--mt-lime);
  box-shadow: 0 10px 28px rgb(0 0 0 / 18%);
}

.button-primary:hover {
  background: #c8ee67;
  box-shadow: 0 14px 32px rgb(0 0 0 / 23%);
}

.button-secondary {
  border-color: rgb(255 255 255 / 45%);
  color: #fff;
  background: rgb(255 255 255 / 7%);
}

.button-secondary:hover {
  background: rgb(255 255 255 / 15%);
}

.hero-capabilities {
  display: flex;
  flex-wrap: wrap;
  gap: 22px;
  margin-top: 34px;
  color: rgb(255 255 255 / 78%);
  font-size: 0.76rem;
  font-weight: 500;
}

.hero-capabilities span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.hero-capabilities i {
  color: var(--mt-lime);
  font-style: normal;
  font-weight: 700;
}

.product-section {
  padding-block: 112px 104px;
}

.section-heading {
  max-width: 720px;
  margin: 0 auto 38px;
  text-align: center;
}

.section-heading h2,
.about-copy h2,
.final-cta h2 {
  margin-top: 0;
  color: var(--mt-forest);
  font-size: clamp(2rem, 3.8vw, 3.25rem);
  font-weight: 600;
  letter-spacing: -0.035em;
  line-height: 1.16;
}

.section-heading > p {
  max-width: 640px;
  margin: 14px auto 0;
  color: var(--landing-muted);
  font-size: 0.97rem;
  line-height: 1.75;
}

.preview-caption {
  margin-top: 15px;
  color: var(--landing-muted);
  font-size: 0.76rem;
  text-align: center;
}

.workflow-section {
  padding-block: 100px 112px;
  background: var(--mt-surface-soft);
}

.steps {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 25px;
  margin: 54px 0 0;
  padding: 0;
  list-style: none;
}

.features-section {
  padding-block: 96px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  margin-top: 34px;
}

.feature-card {
  min-height: 210px;
  padding: 24px;
  border: 1px solid var(--landing-border);
  border-radius: 20px;
  background: var(--mt-surface);
}

.feature-icon {
  width: 42px;
  height: 42px;
  display: inline-grid;
  place-items: center;
  border-radius: 14px;
  color: #075c3a;
  background: #e4f3dc;
  font-size: 1.3rem;
}

.feature-card h3 {
  margin-top: 18px;
  color: var(--landing-ink);
  font-size: 1.05rem;
}

.feature-card p,
.audience-intro {
  margin-top: 10px;
  color: var(--landing-muted);
  line-height: 1.7;
}

.ai-section {
  padding-block: 86px;
  color: #fff;
  background:
    radial-gradient(ellipse at 88% 10%, rgb(184 229 93 / 24%), transparent 34%),
    #063a2a;
}

.ai-inner {
  max-width: 850px;
}

.ai-status {
  width: fit-content;
  padding: 7px 13px;
  border: 1px solid rgb(223 245 163 / 45%);
  border-radius: 999px;
  color: #e3f5a7;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.ai-inner h2 {
  margin-top: 20px;
  color: #fff;
  font-size: clamp(1.8rem, 3.4vw, 2.75rem);
}

.ai-inner p {
  max-width: 760px;
  margin-top: 14px;
  color: rgb(255 255 255 / 82%);
  line-height: 1.8;
}

.steps::before {
  position: absolute;
  top: 23px;
  right: 12.5%;
  left: 12.5%;
  height: 2px;
  content: '';
  background: color-mix(in srgb, var(--mt-green) 30%, var(--mt-border));
}

.step-card {
  min-width: 0;
  position: relative;
  z-index: 1;
}

.step-image-wrap {
  height: 210px;
  position: relative;
  overflow: hidden;
  border: 1px solid var(--landing-border);
  border-radius: 18px;
  background: var(--mt-surface);
  box-shadow: 0 12px 32px rgb(0 40 26 / 7%);
}

.step-image-wrap img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  object-position: center top;
  transition: transform 420ms cubic-bezier(0.2, 0.7, 0.2, 1);
}

.step-card:hover .step-image-wrap img {
  transform: scale(1.035);
}

.step-number {
  width: 46px;
  height: 46px;
  position: absolute;
  top: 0;
  left: 18px;
  display: grid;
  place-items: center;
  border: 4px solid var(--mt-surface-soft);
  border-radius: 50%;
  color: #fff;
  background: #087344;
  font-family: 'K2D', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
}

.step-copy {
  padding: 20px 6px 0;
}

.step-copy h3,
.audience-card h3 {
  color: var(--mt-forest);
  font-family: 'K2D', 'Poppins', sans-serif;
  font-size: 1.15rem;
  font-weight: 700;
}

.step-copy p,
.audience-card p {
  margin-top: 8px;
  color: var(--landing-muted);
  font-size: 0.88rem;
  line-height: 1.7;
}

.audience-section {
  padding-block: 110px;
}

.audience-section .section-heading {
  margin-bottom: 32px;
}

.audience-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.audience-card {
  min-height: 174px;
  display: flex;
  align-items: flex-start;
  gap: 18px;
  padding: 27px;
  border: 1px solid var(--landing-border);
  border-radius: 18px;
  background: var(--mt-surface);
  box-shadow: 0 8px 28px rgb(0 40 26 / 4%);
  transition:
    transform 220ms cubic-bezier(0.2, 0.7, 0.2, 1),
    box-shadow 220ms ease;
}

.audience-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 36px rgb(0 40 26 / 9%);
}

.audience-icon {
  width: 46px;
  height: 46px;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 14px;
  color: var(--landing-accent);
  background: color-mix(in srgb, var(--mt-lime) 30%, var(--mt-surface));
  font-size: 1.35rem;
  font-weight: 700;
}

.about-section {
  padding-block: 100px;
  background: var(--mt-surface-soft);
}

.about-inner {
  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(0, 0.98fr);
  align-items: center;
  gap: clamp(42px, 7vw, 92px);
}

.about-photo-wrap {
  min-height: 420px;
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  background: #dce9d6;
  box-shadow: 0 24px 50px rgb(0 40 26 / 13%);
}

.about-photo-main {
  width: 100%;
  height: 100%;
  position: absolute;
  inset: 0;
  display: block;
  object-fit: cover;
}

.about-photo-inset {
  width: min(46%, 300px);
  position: absolute;
  right: 18px;
  bottom: 74px;
  margin: 0;
  padding: 8px;
  border: 1px solid rgb(255 255 255 / 75%);
  border-radius: 18px;
  background: var(--mt-surface);
  box-shadow: 0 18px 42px rgb(0 25 17 / 28%);
  transform: rotate(2deg);
}

.about-photo-inset img {
  width: 100%;
  height: clamp(7rem, 14vw, 10rem);
  display: block;
  border-radius: 12px;
  object-fit: cover;
  object-position: 72% 18%;
}

.about-photo-inset figcaption {
  padding: 8px 6px 2px;
  color: var(--mt-forest);
  font-size: 0.72rem;
  font-weight: 700;
}

.photo-caption {
  max-width: 44%;
  position: absolute;
  bottom: 16px;
  left: 16px;
  padding: 10px 14px;
  border: 1px solid rgb(255 255 255 / 55%);
  border-radius: 11px;
  color: #fff;
  background: rgb(0 40 26 / 72%);
  font-size: 0.74rem;
  font-weight: 600;
  backdrop-filter: blur(8px);
}

.about-copy h2 {
  max-width: 520px;
}

.about-copy > p {
  margin-top: 18px;
  color: var(--landing-muted);
  font-size: 0.94rem;
  line-height: 1.82;
}

.about-copy .about-note {
  margin-top: 16px;
  padding: 15px 16px;
  border: 1px solid color-mix(in srgb, #7baf28 35%, var(--landing-border));
  border-radius: 12px;
  color: var(--mt-ink);
  background: color-mix(in srgb, var(--mt-lime) 13%, var(--mt-surface));
  font-size: 0.83rem;
}

.text-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 23px;
  color: var(--landing-accent);
  font-size: 0.88rem;
  font-weight: 700;
  text-decoration: none;
}

.text-link:hover {
  text-decoration: underline;
}

.faq-section {
  padding-block: 110px 120px;
}

.faq-list {
  max-width: 850px;
  margin-inline: auto;
  border-top: 1px solid var(--landing-border);
}

.faq-list details {
  border-bottom: 1px solid var(--landing-border);
}

.faq-list summary {
  min-height: 70px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  color: var(--mt-forest);
  font-family: 'K2D', 'Poppins', sans-serif;
  font-size: 1.02rem;
  font-weight: 700;
  cursor: pointer;
  list-style: none;
}

.faq-list summary::-webkit-details-marker {
  display: none;
}

.faq-list summary::after {
  content: '+';
  color: #087344;
  font-family: 'Poppins', sans-serif;
  font-size: 1.5rem;
  font-weight: 400;
}

.faq-list details[open] summary::after {
  content: '−';
}

.faq-list details p {
  max-width: 730px;
  padding: 0 42px 22px 0;
  color: var(--landing-muted);
  font-size: 0.9rem;
  line-height: 1.75;
}

.final-cta {
  color: #fff;
  background: #005657;
}

.final-cta-inner {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 30px;
  padding-block: 44px;
}

.final-cta h2 {
  max-width: 650px;
  color: #fff;
  font-size: clamp(1.8rem, 3.2vw, 2.65rem);
}

.final-cta p {
  max-width: 620px;
  margin-top: 12px;
  color: rgb(255 255 255 / 80%);
  line-height: 1.7;
}

.final-cta .button {
  min-width: 218px;
  flex: 0 0 auto;
}

.landing-footer {
  color: rgb(255 255 255 / 76%);
  background: #00281a;
}

.footer-inner {
  min-height: 190px;
  display: grid;
  grid-template-columns: 180px 1fr auto;
  align-items: center;
  gap: 18px 30px;
  padding-block: 34px;
}

.footer-brand {
  width: 132px;
}

.footer-inner > p {
  color: rgb(255 255 255 / 70%);
  font-size: 0.8rem;
}

.footer-inner > .footer-pending-links {
  grid-column: 1 / -1;
  grid-row: 3;
  margin: 0;
  font-size: 0.72rem !important;
}

.footer-nav {
  grid-column: 2 / 3;
  grid-row: 2;
  gap: 22px;
}

.footer-nav a,
.back-to-top {
  color: rgb(255 255 255 / 82%);
  font-size: 0.77rem;
  font-weight: 500;
  text-decoration: none;
}

.footer-nav a:hover,
.back-to-top:hover {
  color: var(--mt-lime);
}

.back-to-top {
  grid-column: 3;
  grid-row: 2;
  justify-self: end;
}

@media (max-width: 900px) {
  .steps {
    gap: 15px;
  }

  .features-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .step-image-wrap {
    height: 170px;
  }

  .about-inner {
    gap: 38px;
  }

  .footer-inner {
    grid-template-columns: 150px 1fr;
  }

  .footer-nav {
    grid-column: 1 / 3;
    grid-row: 2;
  }

  .back-to-top {
    grid-column: 2;
    grid-row: 2;
  }
}

@media (max-width: 700px) {
  .section-wrap {
    width: calc(100% - 40px);
  }

  .landing-header,
  .hero {
    padding-inline: 20px;
  }

  .hero-photo img {
    object-position: center 43%;
  }

  .hero-shade {
    background:
      linear-gradient(180deg, rgb(0 32 21 / 85%) 0%, rgb(0 36 24 / 81%) 46%, rgb(0 35 24 / 58%) 100%),
      linear-gradient(90deg, rgb(0 40 26 / 28%), transparent 100%);
  }

  .brand {
    width: 122px;
  }

  .landing-nav {
    position: absolute;
    top: calc(100% + 8px);
    right: 20px;
    left: 20px;
    z-index: 30;
    display: none;
    gap: 8px;
    padding: 14px;
    border: 1px solid rgb(255 255 255 / 18%);
    border-radius: 20px;
    background: #003624;
    box-shadow: 0 18px 44px rgb(0 0 0 / 30%);
  }

  .landing-nav.is-open {
    display: flex;
    align-items: stretch;
    flex-direction: column;
  }

  .landing-mobile-toggle {
    display: inline-flex;
    flex: 0 0 auto;
  }

  .landing-nav > a:not(.header-login) {
    display: flex;
  }

  .landing-nav > a:not(.header-login, .header-access) {
    min-height: 44px;
    align-items: center;
    padding-inline: 12px;
  }

  .landing-nav .header-login {
    width: 100%;
    min-height: 44px;
  }

  .landing-nav .header-access {
    width: 100%;
  }

  .hero-product-preview {
    display: none;
  }

  .hero {
    min-height: 684px;
    padding-block: 60px 44px;
  }

  .hero h1 {
    max-width: 540px;
    margin-top: 0;
    font-size: clamp(2.55rem, 11vw, 3.55rem);
    letter-spacing: -0.04em;
  }

  .hero-copy > p {
    margin-top: 15px;
    font-size: 0.95rem;
  }

  .hero-actions {
    flex-direction: column;
    gap: 10px;
    margin-top: 22px;
  }

  .hero-actions .button {
    width: 100%;
  }

  .hero-capabilities {
    gap: 13px;
    margin-top: 23px;
    font-size: 0.68rem;
  }

  .product-section,
  .audience-section,
  .faq-section,
  .features-section {
    padding-block: 76px;
  }

  .features-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .feature-card {
    min-height: 0;
    padding: 20px;
  }

  .section-heading {
    margin-bottom: 28px;
  }

  .section-heading h2,
  .about-copy h2 {
    font-size: clamp(1.9rem, 8vw, 2.6rem);
  }

  .section-heading > p {
    font-size: 0.88rem;
  }

  .workflow-section {
    padding-block: 76px;
  }

  .steps {
    grid-template-columns: 1fr;
    gap: 26px;
    margin-top: 36px;
    padding-left: 20px;
  }

  .steps::before {
    top: 20px;
    bottom: 80px;
    left: 21px;
    width: 2px;
    height: auto;
  }

  .step-card {
    display: grid;
    grid-template-columns: 70px 1fr;
    align-items: center;
    gap: 0 14px;
  }

  .step-image-wrap {
    width: 70px;
    height: 70px;
    grid-column: 1;
    grid-row: 1 / 3;
    overflow: visible;
    border: 0;
    border-radius: 50%;
    background: transparent;
    box-shadow: none;
  }

  .step-image-wrap img {
    width: 70px;
    height: 70px;
    border: 3px solid var(--mt-surface-soft);
    border-radius: 50%;
    object-fit: cover;
    object-position: 18% top;
    background: var(--mt-surface);
    box-shadow: 0 4px 12px rgb(0 40 26 / 13%);
  }

  .step-number {
    width: 27px;
    height: 27px;
    top: -5px;
    left: -8px;
    border-width: 2px;
    font-size: 0.58rem;
  }

  .step-copy {
    grid-column: 2;
    padding: 0;
  }

  .step-copy h3 {
    font-size: 1rem;
  }

  .step-copy p {
    margin-top: 4px;
    font-size: 0.79rem;
  }

  .audience-grid {
    grid-template-columns: 1fr;
    gap: 13px;
  }

  .audience-card {
    min-height: 0;
    gap: 14px;
    padding: 20px;
  }

  .audience-icon {
    width: 40px;
    height: 40px;
  }

  .audience-card h3 {
    font-size: 1rem;
  }

  .audience-card p {
    font-size: 0.8rem;
  }

  .about-section {
    padding-block: 76px;
  }

  .about-inner {
    grid-template-columns: 1fr;
    gap: 28px;
  }

  .about-photo-wrap {
    min-height: 270px;
    aspect-ratio: 4 / 3;
  }

  .about-photo-inset {
    right: 12px;
    bottom: 68px;
    width: 46%;
    padding: 6px;
    border-radius: 14px;
  }

  .about-photo-inset img {
    height: clamp(6rem, 30vw, 7rem);
    border-radius: 10px;
  }

  .about-photo-inset figcaption {
    padding: 6px 4px 1px;
    font-size: 0.65rem;
  }

  .photo-caption {
    max-width: 43%;
    bottom: 12px;
    left: 12px;
    padding: 8px 10px;
    font-size: 0.68rem;
  }

  .about-copy > p {
    font-size: 0.87rem;
  }

  .faq-list summary {
    min-height: 68px;
    font-size: 0.92rem;
  }

  .faq-list details p {
    padding-right: 20px;
    font-size: 0.83rem;
  }

  .final-cta-inner {
    min-height: 0;
    align-items: stretch;
    flex-direction: column;
    gap: 24px;
    padding-block: 48px;
  }

  .final-cta h2 {
    font-size: 2rem;
  }

  .final-cta .button {
    width: 100%;
  }

  .footer-inner {
    min-height: 0;
    grid-template-columns: 1fr auto;
    gap: 16px;
    padding-block: 32px;
  }

  .footer-brand {
    width: 112px;
  }

  .footer-inner > p {
    grid-column: 1 / 3;
    grid-row: 2;
    font-size: 0.73rem;
  }

  .footer-inner > .footer-pending-links {
    grid-row: 4;
  }

  .final-cta p {
    font-size: 0.9rem;
  }

  .footer-nav {
    grid-column: 1 / 3;
    grid-row: 3;
    flex-wrap: wrap;
    gap: 12px 20px;
  }

  .footer-nav a,
  .back-to-top {
    font-size: 0.72rem;
  }

  .back-to-top {
    grid-column: 2;
    grid-row: 1;
  }
}

@media (max-width: 360px) {
  .section-wrap {
    width: calc(100% - 32px);
  }

  .landing-header,
  .hero {
    padding-inline: 16px;
  }

  .hero h1 {
    font-size: 2.45rem;
  }

  .hero-capabilities {
    gap: 9px;
    font-size: 0.62rem;
  }

  .audience-card {
    padding: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

}
</style>
