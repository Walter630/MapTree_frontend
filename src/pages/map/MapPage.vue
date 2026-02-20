<script lang="ts">
import { defineComponent } from 'vue'
import PruningMap from '@/components/functions/MapsView/PruningMap.vue'

export default defineComponent({
  name: 'MapPage',
  components: { PruningMap },

  data() {
    return {
      tasks: [],
    }
  },
})
</script>

<template>
  <div class="full-map-page">
    <PruningMap :tasks="tasks" />
  </div>
</template>

<style scoped>
.full-map-page {
  width: 100vw;
  height: 80vh;
  padding: 0;
  margin: 0;
  overflow: hidden;
}
</style>
