<script lang="ts">
import PruningMap from '@/components/functions/MapsView/PruningMap.vue'
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'MapPage',
  components: {
    PruningMap,
  },
  data() {
    return {
      tasks: [],
      loading: false,
      error: false,
      isMobile: false,
    }
  },
  mounted() {
    this.isMobile = window.innerWidth < 768
  },

})
</script>

<template>

    <div class="full-map-page">
      <PruningMap :tasks="tasks" @update-tasks="tasks = $event" />
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
