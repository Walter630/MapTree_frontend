<template>
  <main class="tw:grid tw:min-h-screen tw:place-items-center tw:bg-mt-canvas tw:px-6 tw:py-16 tw:text-mt-ink">
    <section class="tw:w-full tw:max-w-xl tw:text-center" aria-labelledby="not-found-title">
      <p class="tw:font-semibold tw:tracking-[0.18em] tw:text-mt-green">ERRO 404</p>
      <h1 id="not-found-title" class="tw:mt-4 tw:font-heading tw:text-4xl tw:font-bold sm:tw:text-5xl">
        Esta página não existe.
      </h1>
      <p class="tw:mt-4 tw:text-base tw:leading-7 tw:text-mt-text-muted">
        Confira o endereço ou volte para o início do MapTree.
      </p>
      <RouterLink
        to="/"
        class="tw:mt-8 tw:inline-flex tw:min-h-12 tw:items-center tw:justify-center tw:rounded-xl tw:bg-mt-forest tw:px-6 tw:py-3 tw:font-semibold tw:text-white tw:focus-visible:tw:outline-2 tw:focus-visible:tw:outline-offset-4 tw:focus-visible:tw:outline-mt-green"
      >
        Voltar ao início
      </RouterLink>
    </section>
  </main>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>
