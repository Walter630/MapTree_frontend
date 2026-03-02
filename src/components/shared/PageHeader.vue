<template>
  <div class="page-header mb-6">
    <!-- Breadcrumbs -->
    <div v-if="breadcrumbs.length" class="d-flex align-center mb-4">
      <template v-for="(crumb, i) in breadcrumbs" :key="i">
        <span
          class="text-caption"
          :class="i < breadcrumbs.length - 1 ? 'text-grey-darken-1 breadcrumb-link' : 'font-weight-bold text-indigo-darken-4'"
          @click="crumb.to ? $router.push(crumb.to) : null"
        >
          {{ crumb.text }}
        </span>
        <v-icon v-if="i < breadcrumbs.length - 1" size="small" class="mx-1 text-grey-darken-1">
          mdi-chevron-right
        </v-icon>
      </template>
    </div>

    <!-- Título + Botão voltar -->
    <div class="d-flex align-center">
      <v-btn
        v-if="showBackButton"
        icon="mdi-chevron-left"
        variant="outlined"
        density="comfortable"
        class="mr-4 back-btn"
        @click="$router.back()"
      />
      <div>
        <h2 class="text-h5 font-weight-bold text-indigo-darken-4">{{ title }}</h2>
        <p v-if="subtitle" class="text-caption text-grey mt-1">{{ subtitle }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Breadcrumb {
  text: string
  to?: string
}

withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    breadcrumbs?: Breadcrumb[]
    showBackButton?: boolean
  }>(),
  {
    subtitle: '',
    breadcrumbs: () => [],
    showBackButton: true,
  },
)
</script>

<style scoped>
.breadcrumb-link {
  cursor: pointer;
  transition: color 0.2s;
}

.breadcrumb-link:hover {
  color: #1a237e;
}

.back-btn {
  min-width: 42px;
  min-height: 42px;
  border-radius: 8px;
  border: 1px solid #d9d9d9;
}

</style>

