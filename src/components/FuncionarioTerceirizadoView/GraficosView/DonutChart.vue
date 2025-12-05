<template>
  <div class="donut-chart-container">
    <div ref="chartContainer" class="chart"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, watch } from 'vue';
import * as d3 from 'd3';

export default defineComponent({
  name: 'DonutChart',
  props: {
    data: {
      type: Object as () => ({ agendadas: number; pendentes: number; execucao: number; concluidas: number }),
      required: true,
    },
    width: {
      type: Number,
      default: 200,
    },
    height: {
      type: Number,
      default: 200,
    },
  },
  setup(props) {
    const chartContainer = ref<HTMLElement | null>(null);

    const drawChart = () => {
      if (!chartContainer.value) return;

      // Clear previous chart
      d3.select(chartContainer.value).selectAll('*').remove();

      const width = props.width;
      const height = props.height;
      const radius = Math.min(width, height) / 2;

      const data = [

        { label: 'Em Execução', value: props.data.execucao, color: '#C1E328' },
        { label: 'Concluídas', value: props.data.concluidas, color: '#0057FF' },
      ];

      const total = data.reduce((sum, item) => sum + item.value, 0);
      if (total === 0) return;

      const svg = d3
        .select(chartContainer.value)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);

      const arc = d3.arc()
        .innerRadius(radius * 0.6)
        .outerRadius(radius * 0.9);

      const pie = d3.pie<typeof data[0]>()
        .sort(null)
        .value(d => d.value);

      const arcs = svg.selectAll('.arc')
        .data(pie(data))
        .enter()
        .append('g')
        .attr('class', 'arc');

      arcs.append('path')
        .attr('d', arc as any)
        .attr('fill', d => d.data.color)
        .attr('stroke', '#fff')
        .style('stroke-width', '2px');
    };

    onMounted(drawChart);
    watch(() => props.data, drawChart, { deep: true });

    return {
      chartContainer,
    };
  },
});
</script>

<style scoped>
.donut-chart-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.chart {
  width: 100%;
  height: 100%;
}
</style>
