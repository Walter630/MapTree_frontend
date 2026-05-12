<script lang="ts">
import { defineComponent } from 'vue'
import PruningMap from '@/components/functions/MapsView/PruningMap.vue'

export default defineComponent({
  name: 'MapPage',
  components: { PruningMap },
})
</script>

<template>
  <div class="full-map-page">
    <PruningMap />
  </div>
</template>

<style scoped>
.full-map-page {
  width: 100%;
  height: calc(100vh - 64px);
  padding: 0;
  margin: 0;
  overflow: hidden;
  position: relative;
}

/* Remove padding do v-main para esta página */
:deep(.v-main) {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}
</style>
