<template>
  <v-card class="tree-ai-card" elevation="0">
    <!-- ===== Header ===== -->
    <div class="card-hero" :class="`hero-${riskClass}`">
      <div class="hero-glow" />
      <div class="hero-content">
        <div class="d-flex align-center justify-space-between">
          <div>
            <p class="text-overline hero-label">Análise de IA</p>
            <h2 class="hero-title">{{ data.commonName }}</h2>
          </div>
          <div class="d-flex flex-column align-end">
            <div class="risk-badge mb-2" :class="`risk-${riskClass}`">
              <v-icon size="18" class="mr-1">{{ riskIcon }}</v-icon>
              {{ riskLabel }}
            </div>
            <v-chip
              v-if="data.vigor"
              size="x-small"
              class="font-weight-bold"
              variant="flat"
              :color="vigorColor"
            >
              <v-icon start size="14">{{ vigorIcon }}</v-icon>
              {{ vigorLabel }}
            </v-chip>
          </div>
        </div>
      </div>
    </div>

    <v-card-text class="card-body">
      <!-- ===== Alerta de IA ===== -->
      <v-alert
        v-if="data.aiPrediction.alert"
        type="warning"
        variant="tonal"
        density="compact"
        icon="mdi-alert-circle-outline"
        class="mb-5 ai-alert"
        rounded="lg"
        prominent
      >
        <span class="font-weight-medium">{{ data.aiPrediction.alert }}</span>
      </v-alert>

      <!-- ===== Progresso Altura vs Fio ===== -->
      <div class="section-block mb-6">
        <div class="section-header">
          <v-icon size="20" class="mr-2" color="blue-darken-1">mdi-arrow-expand-vertical</v-icon>
          <span class="section-title">Altura vs Fiação Elétrica</span>
        </div>

        <div class="height-progress-container mt-3">
          <div class="height-labels d-flex justify-space-between mb-1">
            <span class="text-caption font-weight-bold">
              {{ data.aiPrediction.estimated_height_m.toFixed(1) }}m
              <span class="text-grey-darken-1 font-weight-regular">(Atual)</span>
            </span>
            <span class="text-caption font-weight-bold">
              {{ data.aiPrediction.wire_height_m.toFixed(1) }}m
              <span class="text-grey-darken-1 font-weight-regular">(Fiação)</span>
            </span>
          </div>

          <div class="progress-track">
            <div class="progress-fill" :style="{ width: heightPercent + '%' }" :class="`fill-${riskClass}`">
              <div class="progress-glow" />
            </div>
            <div class="progress-wire-marker" :style="{ left: '100%' }">
              <v-icon size="14" color="amber-darken-3">mdi-flash</v-icon>
            </div>
          </div>

          <p class="text-caption text-center mt-2 text-grey-darken-1">
            <strong>{{ heightPercent.toFixed(0) }}%</strong> da altura da fiação
          </p>
        </div>

        <!-- ===== Métricas em grid ===== -->
        <v-row class="mt-4" dense>
          <v-col cols="6" sm="3">
            <div class="metric-card">
              <v-icon size="24" :color="(data.aiPrediction.will_reach_wire || heightPercent >= 90) ? 'red' : 'green'">
                {{ (data.aiPrediction.will_reach_wire || heightPercent >= 90) ? 'mdi-alert-octagon' : 'mdi-check-circle' }}
              </v-icon>
              <p class="metric-value" :class="(data.aiPrediction.will_reach_wire || heightPercent >= 90) ? 'text-red' : 'text-green'">
                {{ (data.aiPrediction.will_reach_wire || heightPercent >= 90) ? 'SIM' : 'NÃO' }}
              </p>
              <p class="metric-label">Alcançará fiação</p>
            </div>
          </v-col>

          <v-col cols="6" sm="3">
            <div class="metric-card">
              <v-icon size="24" color="indigo">mdi-calendar-clock</v-icon>
              <p class="metric-value">{{ heightPercent >= 100 ? 'ALCANÇADO' : (data.aiPrediction.days_to_wire ? data.aiPrediction.days_to_wire.toLocaleString() : 'N/A') }}</p>
              <p class="metric-label">Dias até a fiação</p>
            </div>
          </v-col>

          <v-col cols="6" sm="3">
            <div class="metric-card">
              <v-icon size="24" color="deep-purple">mdi-calendar-month</v-icon>
              <p class="metric-value">{{ heightPercent >= 100 ? '0.0' : data.aiPrediction.months_to_wire.toFixed(1) }}</p>
              <p class="metric-label">Meses estimados</p>
            </div>
          </v-col>

          <v-col cols="6" sm="3">
            <div class="metric-card">
              <v-icon size="24" color="teal">mdi-ruler</v-icon>
              <p class="metric-value">{{ remainingMeters }}m</p>
              <p class="metric-label">Faltam para o fio</p>
            </div>
          </v-col>
        </v-row>
      </div>

      <v-divider class="mb-6" />

      <div class="section-block mb-6">
        <div class="section-header mb-4">
          <v-icon size="22" class="mr-2" color="green-darken-1">mdi-brain</v-icon>
          <span class="section-title">Análise de Redes Neurais</span>
        </div>

        <v-row dense>
          <!-- Copa -->
          <v-col cols="12" sm="6">
            <div class="insight-card-v2">
              <div class="insight-header">
                <div class="insight-badge canopy-badge">
                  <v-icon size="20" color="white">{{ canopyIcon }}</v-icon>
                </div>
                <span class="insight-label">Geometria da Copa</span>
              </div>
              <div class="insight-main mt-3">
                <div class="d-flex align-center justify-space-between mb-1">
                  <h3 class="insight-value">{{ canopyLabel }}</h3>
                  <span class="text-caption text-grey-darken-1">L/A: {{ data.aiPrediction.canopy.ratio_width_height.toFixed(2) }}</span>
                </div>
                <p class="text-caption text-grey mb-0">Formato estimado via processamento de imagem e espécie.</p>
              </div>
            </div>
          </v-col>

          <!-- Fibonacci / R -->
          <v-col cols="12" sm="6">
            <div class="insight-card-v2">
              <div class="insight-header">
                <div class="insight-badge r-badge">
                  <v-icon size="20" color="white">mdi-chart-bell-curve-cumulative</v-icon>
                </div>
                <span class="insight-label">R (Confiabilidade)</span>
              </div>
              <div class="insight-main mt-3">
                <div class="d-flex align-center justify-space-between mb-2">
                  <h3 class="insight-value">{{ (data.aiPrediction.fibonacci_info.growth_modifier * 100).toFixed(0) }}%</h3>
                  <v-chip size="x-small" color="blue-lighten-4" variant="flat" class="text-blue-darken-4 font-weight-bold">Ajuste IA</v-chip>
                </div>
                <div class="modern-progress mb-2">
                  <div class="modern-progress-fill" :style="{ width: (data.aiPrediction.fibonacci_info.growth_modifier * 100) + '%' }" />
                </div>
                <p class="text-caption r-desc">
                  Este índice indica a precisão do modelo matemático para esta predição específica.
                </p>
              </div>
            </div>
          </v-col>
        </v-row>
      </div>

      <!-- ===== Histórico Biométrico (Medições Reais) ===== -->
      <div v-if="data.measurements && data.measurements.length > 0" class="section-block mb-6">
        <v-divider class="mb-6" />
        <div class="section-header mb-3">
          <v-icon size="20" class="mr-2" color="blue-grey-darken-2">mdi-history</v-icon>
          <span class="section-title">Histórico Biométrico</span>
        </div>

        <div class="measurement-timeline">
          <div v-for="m in data.measurements.slice(0, 3)" :key="m.id" class="measurement-log-item">
            <div class="log-date">{{ formatDate(m.date) }}</div>
            <div class="log-values">
              <span class="mr-3">📏 <strong>{{ m.height.toFixed(2) }}m</strong> <small>(Alt)</small></span>
              <span>🌳 <strong>{{ m.canopyWidth.toFixed(2) }}m</strong> <small>(Copa)</small></span>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== Solo (Inteligência Integrada) ===== -->
      <template v-if="data.soil">
        <v-divider class="mb-6" />

        <div class="section-block">
          <div class="section-header mb-4">
            <v-icon size="20" class="mr-2" color="brown-darken-1">mdi-terraform</v-icon>
            <span class="section-title">Inteligência de Solo & Terreno</span>
          </div>

          <!-- Growth & Definition Card -->
          <div class="soil-analysis-banner mb-5" :style="{ borderLeft: `4px solid ${soilMarkerColor}` }">
            <div class="d-flex justify-space-between align-center mb-1">
              <span class="text-overline font-weight-bold">Expectativa de Crescimento</span>
              <v-chip size="x-small" :color="soilMarkerColor" class="font-weight-bold" variant="flat">
                {{ soilGrowthLabel }}
              </v-chip>
            </div>
            <p class="text-body-2 mb-0">{{ soilDefinition }}</p>
          </div>

          <v-row dense>
            <!-- Argila -->
            <v-col cols="12" sm="6">
              <div class="soil-metric-item">
                <div class="d-flex justify-space-between text-caption font-weight-bold mb-1">
                  <span>Argila</span>
                  <span>{{ data.soil.clay ? data.soil.clay.toFixed(1) + '%' : 'N/A' }}</span>
                </div>
                <v-progress-linear
                  :model-value="data.soil.clay || 0"
                  height="6"
                  rounded
                  :color="soilMarkerColor"
                  bg-color="grey-lighten-4"
                />
              </div>
            </v-col>
            <!-- pH -->
            <v-col cols="12" sm="6">
              <div class="soil-metric-item">
                <div class="d-flex justify-space-between text-caption font-weight-bold mb-1">
                  <span>Acidez (pH)</span>
                  <span>{{ data.soil.ph ? data.soil.ph.toFixed(1) : 'N/A' }}</span>
                </div>
                <v-progress-linear
                  :model-value="(data.soil.ph || 0) * 7"
                  height="6"
                  rounded
                  :color="soilMarkerColor"
                  bg-color="grey-lighten-4"
                />
              </div>
            </v-col>
          </v-row>

          <v-row class="mt-4" dense>
            <v-col cols="6" sm="3">
              <div class="metric-card">
                <v-icon size="20" color="brown-darken-2">mdi-arrow-collapse-down</v-icon>
                <p class="metric-value">{{ data.soil.depth.toFixed(1) }}m</p>
                <p class="metric-label">Profundidade</p>
              </div>
            </v-col>
            <v-col cols="6" sm="3">
              <div class="metric-card">
                <v-icon size="20" color="orange-darken-3">mdi-slope-downhill</v-icon>
                <p class="metric-value">{{ data.soil.inclination.toFixed(0) }}°</p>
                <p class="metric-label">Inclinação</p>
              </div>
            </v-col>
            <v-col cols="6" sm="3">
              <div class="metric-card">
                <v-icon size="24" :color="soilQualityColor">{{ soilQualityIcon }}</v-icon>
                <p class="metric-value text-caption" :class="`text-${soilQualityColor}`">{{ soilQualityLabel }}</p>
                <p class="metric-label">Qualidade</p>
              </div>
            </v-col>
            <v-col cols="6" sm="3">
              <div class="metric-card">
                <v-icon size="20" color="green-darken-2">mdi-leaf-circle</v-icon>
                <p class="metric-value">{{ (data.soil.coverage * 100).toFixed(0) }}%</p>
                <p class="metric-label">Cobertura</p>
              </div>
            </v-col>
          </v-row>
        </div>
      </template>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import type { TreeWithAi } from '@/plugins/apiConnect'

export default defineComponent({
  name: 'TreeAiStats',

  props: {
    data: {
      type: Object as PropType<TreeWithAi>,
      required: true,
    },
  },

  computed: {
    /* ---------- Risco ---------- */
    riskClass(): string {
      // OVERRIDE: Se estiver a 90% ou mais da fiação, é CRÍTICO independente do status da IA
      if (this.heightPercent >= 90) return 'critical'

      const s = String(this.data.aiPrediction.risk_status || this.data.status).toUpperCase()
      const map: Record<string, string> = {
        NORMAL: 'normal',
        MODERATE: 'moderate',
        CRITICAL: 'critical',
        TO_PRUNE: 'critical',
        UNDER_OBSERVATION: 'observation'
      }
      return map[s] || 'normal'
    },

    riskLabel(): string {
      if (this.heightPercent >= 100) return 'CONTATO COM FIAÇÃO'
      if (this.heightPercent >= 90) return 'RISCO IMINENTE'

      const s = String(this.data.aiPrediction.risk_status || this.data.status).toUpperCase()
      const map: Record<string, string> = {
        NORMAL: 'Risco Normal',
        MODERATE: 'Risco Moderado',
        CRITICAL: 'RISCO CRÍTICO',
        TO_PRUNE: 'Poda Necessária',
        UNDER_OBSERVATION: 'Em Observação'
      }
      return map[s] || 'Análise de IA'
    },

    riskIcon(): string {
      const s = String(this.data.aiPrediction.risk_status || this.data.status).toUpperCase()
      const map: Record<string, string> = {
        NORMAL: 'mdi-shield-check',
        MODERATE: 'mdi-shield-alert',
        CRITICAL: 'mdi-shield-remove',
        TO_PRUNE: 'mdi-content-cut',
        UNDER_OBSERVATION: 'mdi-eye-outline',
      }
      return map[s] || 'mdi-shield-check'
    },

    /* ---------- Altura ---------- */
    heightPercent(): number {
      const pct =
        (this.data.aiPrediction.estimated_height_m / this.data.aiPrediction.wire_height_m) * 100
      return Math.min(pct, 100)
    },

    remainingMeters(): string {
      const diff =
        this.data.aiPrediction.wire_height_m - this.data.aiPrediction.estimated_height_m
      return Math.max(diff, 0).toFixed(2)
    },

    /* ---------- Copa ---------- */
    canopyIcon(): string {
      const map: Record<string, string> = {
        WIDE: 'mdi-tree',
        NARROW: 'mdi-pine-tree',
        ROUND: 'mdi-circle-outline',
        COLUMNAR: 'mdi-pillar',
      }
      return map[this.data.aiPrediction.canopy.shape] || 'mdi-tree'
    },

    canopyLabel(): string {
      const map: Record<string, string> = {
        WIDE: 'Ampla',
        NARROW: 'Estreita',
        ROUND: 'Arredondada',
        COLUMNAR: 'Colunar',
      }
      return map[this.data.aiPrediction.canopy.shape] || this.data.aiPrediction.canopy.shape
    },

    canopyColor(): string {
      const map: Record<string, string> = {
        WIDE: 'teal',
        NARROW: 'indigo',
        ROUND: 'green',
        COLUMNAR: 'deep-purple',
      }
      return map[this.data.aiPrediction.canopy.shape] || 'grey'
    },

    /* ---------- Fibonacci ---------- */
    fibonacciPercent(): number {
      return Math.min(this.data.aiPrediction.fibonacci_info.growth_modifier * 100, 100)
    },

    /* ---------- Solo ---------- */
    soilQualityLabel(): string {
      if (!this.data.soil) return ''
      const map: Record<string, string> = {
        GOOD: 'Bom',
        REGULAR: 'Regular',
        BAD: 'Ruim',
      }
      return map[this.data.soil.quality] || this.data.soil.quality
    },

    soilQualityColor(): string {
      if (!this.data.soil) return 'grey'
      const map: Record<string, string> = {
        GOOD: 'green-darken-2',
        REGULAR: 'orange-darken-2',
        BAD: 'red-darken-1',
      }
      return map[this.data.soil.quality] || 'grey'
    },

    soilQualityIcon(): string {
      if (!this.data.soil) return 'mdi-help-circle'
      const map: Record<string, string> = {
        GOOD: 'mdi-star-face',
        REGULAR: 'mdi-emoticon-neutral-outline',
        BAD: 'mdi-emoticon-dead-outline',
      }
      return map[this.data.soil.quality] || 'mdi-help-circle'
    },

    soilGrowthLabel(): string {
      if (!this.data.soil) return ''
      const map: Record<string, string> = {
        GOOD: 'Acelerado (+20%)',
        REGULAR: 'Estável (Normal)',
        BAD: 'Retardado (-30%)',
      }
      return map[this.data.soil.quality] || 'N/A'
    },

    soilDefinition(): string {
      if (!this.data.soil) return ''
      const map: Record<string, string> = {
        GOOD: 'Solo Fértil com alta retenção de nutrientes e profundidade ideal para raízes.',
        REGULAR: 'Solo com composição estável, adequado para o desenvolvimento urbano padrão.',
        BAD: 'Solo compactado ou muito arenoso. Pode limitar o vigor da árvore.',
      }
      return map[this.data.soil.quality] || 'Análise de solo pendente.'
    },

    soilMarkerColor(): string {
      if (!this.data.soil) return '#94a3b8'
      const map: Record<string, string> = {
        GOOD: '#22c55e',
        REGULAR: '#f59e0b',
        BAD: '#ef4444',
      }
      return map[this.data.soil.quality] || '#94a3b8'
    },

    /* ---------- Vigor (Saúde) ---------- */
    vigorLabel(): string {
      const map: Record<string, string> = {
        EXCELLENT: 'Vigor Excelente',
        GOOD: 'Saúde Estável',
        POOR: 'Saúde Debilitada',
        DEAD: 'Espécime Morto',
      }
      return map[this.data.vigor] || 'Vigor Desconhecido'
    },

    vigorColor(): string {
      const map: Record<string, string> = {
        EXCELLENT: 'green-accent-4',
        GOOD: 'light-green-darken-2',
        POOR: 'amber-darken-3',
        DEAD: 'grey-darken-3',
      }
      return map[this.data.vigor] || 'grey'
    },

    vigorIcon(): string {
      const map: Record<string, string> = {
        EXCELLENT: 'mdi-heart-plus',
        GOOD: 'mdi-heart',
        POOR: 'mdi-heart-broken',
        DEAD: 'mdi-skull-crossbones',
      }
      return map[this.data.vigor] || 'mdi-help-circle'
    },
  },

  methods: {
    formatDate(dateStr: string): string {
      const d = new Date(dateStr)
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    },
  },
})
</script>

<style scoped>
/* ============ CARD ROOT ============ */
.tree-ai-card {
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: #fff;
  transition: box-shadow 0.3s ease;
}

.tree-ai-card:hover {
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.08) !important;
}

/* ============ HERO HEADER ============ */
.card-hero {
  position: relative;
  padding: 24px 24px 20px;
  overflow: hidden;
}

.hero-glow {
  position: absolute;
  top: -40px;
  right: -40px;
  width: 160px;
  height: 160px;
  border-radius: 50%;
  filter: blur(50px);
  opacity: 0.4;
  pointer-events: none;
}

.hero-normal {
  background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%);
}
.hero-normal .hero-glow { background: #4CAF50; }

.hero-moderate {
  background: linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%);
}
.hero-moderate .hero-glow { background: #FF9800; }

.hero-critical {
  background: linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%);
}
.hero-critical .hero-glow { background: #F44336; }

.hero-content {
  position: relative;
  z-index: 1;
}

.hero-label {
  font-size: 10px !important;
  letter-spacing: 2px !important;
  color: rgba(0, 0, 0, 0.45);
  margin-bottom: 4px;
}

.hero-title {
  font-size: 24px;
  font-weight: 800;
  color: #1a1a1a;
  line-height: 1.2;
}

/* ============ RISK BADGE ============ */
.risk-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 24px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
  animation: badgePulse 2.5s ease-in-out infinite;
}

.risk-normal {
  background: rgba(76, 175, 80, 0.15);
  color: #2E7D32;
}

.risk-moderate {
  background: rgba(255, 152, 0, 0.15);
  color: #E65100;
}

.risk-critical {
  background: rgba(244, 67, 54, 0.15);
  color: #C62828;
  animation: badgePulseCritical 1.5s ease-in-out infinite;
}

@keyframes badgePulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); }
}

@keyframes badgePulseCritical {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.3); }
  50% { transform: scale(1.05); box-shadow: 0 0 12px 4px rgba(244, 67, 54, 0.15); }
}

/* ============ BODY ============ */
.card-body {
  padding: 24px !important;
}

/* ============ AI ALERT ============ */
.ai-alert {
  border-left: 4px solid #FF8F00 !important;
}

/* ============ SECTIONS ============ */
.section-header {
  display: flex;
  align-items: center;
}

.section-title {
  font-size: 15px;
  font-weight: 700;
  color: #333;
}

/* ============ PROGRESS BAR ============ */
.progress-track {
  position: relative;
  height: 12px;
  background: #f0f0f0;
  border-radius: 12px;
  overflow: visible;
}

.progress-fill {
  height: 100%;
  border-radius: 12px;
  position: relative;
  transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.progress-glow {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 40px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4));
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { opacity: 0; }
  50% { opacity: 1; }
  100% { opacity: 0; }
}

.fill-normal {
  background: linear-gradient(90deg, #66BB6A, #43A047);
}

.fill-moderate {
  background: linear-gradient(90deg, #FFB74D, #FB8C00);
}

.fill-critical {
  background: linear-gradient(90deg, #EF5350, #C62828);
}

.progress-wire-marker {
  position: absolute;
  top: -6px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #FFF8E1;
  border: 2px solid #FFB300;
  border-radius: 50%;
  z-index: 2;
}

/* ============ METRIC CARDS ============ */
.metric-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 16px 8px;
  border-radius: 12px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  transition: all 0.2s ease;
}

.metric-card:hover {
  background: #f5f5f5;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.metric-value {
  font-size: 18px;
  font-weight: 800;
  margin: 6px 0 2px;
  line-height: 1;
}

.metric-label {
  font-size: 11px;
  color: #888;
  font-weight: 500;
  line-height: 1.3;
}

/* ============ NEW INSIGHT CARDS V2 ============ */
.insight-card-v2 {
  background: white;
  border: 1px solid #edf2f7;
  border-radius: 16px;
  padding: 16px;
  height: 100%;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
}

.insight-card-v2:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  border-color: #cbd5e0;
}

.insight-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.insight-badge {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.canopy-badge {
  background: linear-gradient(135deg, #10b981, #059669);
}

.r-badge {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
}

.insight-label {
  font-size: 13px;
  font-weight: 700;
  color: #4a5568;
}

.insight-value {
  font-size: 20px;
  font-weight: 800;
  color: #1a202c;
  margin: 0;
}

.modern-progress {
  width: 100%;
  height: 6px;
  background: #edf2f7;
  border-radius: 10px;
  overflow: hidden;
}

.modern-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #60a5fa, #2563eb);
  border-radius: 10px;
  transition: width 1s ease;
}

.r-desc {
  font-size: 11px !important;
  color: #718096 !important;
  line-height: 1.4 !important;
}

@media (max-width: 600px) {
  .insight-card-v2 {
    margin-bottom: 8px;
  }
}

/* ============ SOIL QUALITY BAR ============ */
.soil-quality-bar {
  border-radius: 10px;
  overflow: hidden;
}

.soil-segments {
  display: flex;
  border-radius: 10px;
  overflow: hidden;
}

.soil-segment {
  flex: 1;
  padding: 8px 12px;
  text-align: center;
  opacity: 0.3;
  transition: all 0.3s ease;
}

.soil-segment span {
  font-size: 12px;
  font-weight: 700;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.soil-segment.active {
  opacity: 1;
  transform: scaleY(1.15);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* ============ SOIL ANALYSIS BANNER ============ */
.soil-analysis-banner {
  background: #fdfdfd;
  padding: 12px 16px;
  border-radius: 4px 12px 12px 4px;
  border: 1px solid #f1f5f9;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
}

.soil-metric-item {
  padding: 4px;
}

/* ============ BIOMETRIC LOGS ============ */
.measurement-timeline {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.measurement-log-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #f8f9fa;
  border-radius: 10px;
  border-left: 3px solid #607d8b;
}

.log-date {
  font-size: 11px;
  font-weight: 700;
  color: #546e7a;
  text-transform: uppercase;
}

.log-values {
  font-size: 13px;
  color: #333;
}
</style>
