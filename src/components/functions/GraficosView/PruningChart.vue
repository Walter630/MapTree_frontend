<template>
  <div class="pruning-chart-container">
    <Line v-if="loaded" :data="chartData" :options="chartOptions" />
    <div v-else class="d-flex align-center justify-center h-100">
      <v-progress-circular indeterminate color="primary" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartData,
  type ChartOptions
} from 'chart.js'
import { Line } from 'vue-chartjs'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

export default defineComponent({
  name: 'PruningChart',
  components: { Line },
  setup() {
    const loaded = ref(false)
    const chartData = ref<ChartData<'line'>>({
      labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
      datasets: [
        {
          label: 'Podas Realizadas',
          backgroundColor: (context: any) => {
            const chart = context.chart
            const { ctx, chartArea } = chart
            if (!chartArea) return 'rgba(46, 125, 50, 0.2)'
            const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top)
            gradient.addColorStop(0, 'rgba(46, 125, 50, 0)')
            gradient.addColorStop(1, 'rgba(46, 125, 50, 0.4)')
            return gradient
          },
          borderColor: '#2E7D32',
          pointBackgroundColor: '#2E7D32',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#2E7D32',
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          data: [12, 19, 15, 25, 22, 30]
        }
      ]
    })

    const chartOptions = ref<ChartOptions<'line'>>({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#1a1a1a',
          titleFont: { size: 14, weight: 'bold' },
          bodyFont: { size: 13 },
          padding: 12,
          cornerRadius: 8,
          displayColors: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            display: false
          },
          border: {
            display: false
          },
          ticks: {
            color: '#9e9e9e',
            font: { size: 11 }
          }
        },
        x: {
          grid: {
            display: false
          },
          border: {
            display: false
          },
          ticks: {
            color: '#9e9e9e',
            font: { size: 11 }
          }
        }
      }
    })

    let timeoutId: ReturnType<typeof setTimeout>
    onMounted(() => {
      // Simulate API load
      timeoutId = setTimeout(() => {
        loaded.value = true
      }, 500)
    })

    onUnmounted(() => {
      if (timeoutId) clearTimeout(timeoutId)
    })

    return { chartData, chartOptions, loaded }
  }
})
</script>

<style scoped>
.pruning-chart-container {
  width: 100%;
  height: 270px;
  position: relative;
}
</style>
