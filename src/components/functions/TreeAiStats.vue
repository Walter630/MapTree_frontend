<template>
  <v-card class="tree-ai-card" elevation="0">
    <v-card-text class="card-body">
      <section class="tree-summary" aria-label="Resumo da árvore">
        <div class="tree-summary__risk">
          <p class="tree-summary__label">Risco operacional</p>
          <v-chip
            class="tree-summary__risk-badge font-weight-bold"
            :color="operationalStatusColor"
            variant="tonal"
            :aria-label="`Risco operacional: ${operationalStatusLabel}`"
          >
            {{ operationalStatusLabel }}
          </v-chip>
          <p v-if="registeredClassificationLabel" class="tree-summary__classification">
            Classificação registrada: {{ registeredClassificationLabel }}
          </p>
        </div>

        <div class="tree-summary__row" aria-label="Última poda">
          <v-icon class="tree-summary__row-icon" size="20" aria-hidden="true">
            mdi-calendar-clock
          </v-icon>
          <span class="tree-summary__row-label">Última poda</span>
          <time class="tree-summary__row-value">{{ lastPruneDateLabel }}</time>
        </div>

        <div class="tree-summary__row" :aria-label="`Vigor da árvore: ${vigorLabel}`">
          <v-icon class="tree-summary__row-icon" size="20" :color="vigorColor" aria-hidden="true">
            {{ vigorIcon }}
          </v-icon>
          <span class="tree-summary__row-label">Vigor da árvore</span>
          <strong class="tree-summary__row-value">{{ vigorLabel }}</strong>
        </div>
      </section>

      <v-divider class="tree-summary__divider" />

      <section class="ai-prediction" aria-labelledby="ai-prediction-title">
        <div class="ai-prediction__heading">
          <v-icon color="primary" size="20" aria-hidden="true">mdi-brain</v-icon>
          <h3 id="ai-prediction-title" class="ai-prediction__title">Previsão da IA</h3>
        </div>

        <div
          v-if="predictionState === 'loading'"
          class="prediction-state"
          role="status"
          aria-live="polite"
        >
          <span class="prediction-spinner" aria-hidden="true" />
          <span>Consultando previsão...</span>
        </div>

        <v-alert
          v-else-if="predictionState === 'error'"
          class="prediction-state-alert"
          type="error"
          variant="tonal"
          density="compact"
          role="alert"
        >
          <span>{{ errorMessage || 'Não foi possível consultar a previsão.' }}</span>
          <template #append>
            <v-btn variant="text" size="small" @click="$emit('retry')">Tentar novamente</v-btn>
          </template>
        </v-alert>

        <v-alert
          v-else-if="!hasValidPrediction"
          class="prediction-state-alert"
          type="info"
          variant="tonal"
          density="compact"
          role="status"
        >
          Previsão indisponível.
        </v-alert>

        <template v-else>
          <div class="plain-summary" :class="`plain-summary--${riskClass}`">
            <div class="plain-summary-icon" aria-hidden="true">
              <v-icon size="22" color="white">{{ riskIcon }}</v-icon>
            </div>
            <div class="plain-summary-text">
              <p class="plain-summary-title mb-1">{{ plainSummary.title }}</p>
              <p class="plain-summary-desc mb-0">{{ plainSummary.description }}</p>
            </div>
          </div>

          <v-alert
            v-if="data.aiPrediction?.alert"
            type="warning"
            variant="tonal"
            density="compact"
            icon="mdi-alert-circle-outline"
            class="mt-3 mb-0 ai-alert"
            rounded="lg"
          >
            <span class="font-weight-medium">{{ data.aiPrediction.alert }}</span>
          </v-alert>
        </template>

        <v-btn
          v-if="hasTechnicalDetails"
          block
          variant="tonal"
          color="primary"
          class="technical-details-toggle mt-3 text-none"
          :prepend-icon="showDetails ? 'mdi-chevron-up' : 'mdi-information-outline'"
          :aria-expanded="showDetails"
          @click="showDetails = !showDetails"
        >
          {{ showDetails ? 'Ocultar detalhes técnicos' : 'Ver detalhes técnicos' }}
        </v-btn>
      </section>

      <div v-if="showDetails && hasValidPrediction" class="technical-details">
        <!-- ===== Progresso Altura vs Fio ===== -->
        <div class="section-block mb-6">
          <div class="section-header">
            <v-icon size="20" class="mr-2" color="blue-darken-1">mdi-arrow-expand-vertical</v-icon>
            <span class="section-title">Altura vs Fiação Elétrica</span>
          </div>

          <div class="height-progress-container mt-3">
            <div class="height-labels d-flex justify-space-between mb-1">
              <span class="text-caption font-weight-bold">
                {{ (data.aiPrediction?.estimated_height_m || 0).toFixed(1) }}m
                <span class="text-grey-darken-1 font-weight-regular">(Atual)</span>
              </span>
              <span class="text-caption font-weight-bold">
                {{ (data.aiPrediction?.wire_height_m || 6.5).toFixed(1) }}m
                <span class="text-grey-darken-1 font-weight-regular">(Fiação)</span>
              </span>
            </div>

            <div class="progress-track">
              <div
                class="progress-fill"
                :style="{ width: heightPercent + '%' }"
                :class="`fill-${riskClass}`"
              >
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
                <v-icon
                  size="24"
                  :color="
                    data.aiPrediction?.will_reach_wire || heightPercent >= 90 ? 'error' : 'success'
                  "
                >
                  {{
                    data.aiPrediction?.will_reach_wire || heightPercent >= 90
                      ? 'mdi-alert-octagon'
                      : 'mdi-check-circle'
                  }}
                </v-icon>
                <p
                  class="metric-value"
                  :class="
                    data.aiPrediction?.will_reach_wire || heightPercent >= 90
                      ? 'text-error'
                      : 'text-success'
                  "
                >
                  {{ data.aiPrediction?.will_reach_wire || heightPercent >= 90 ? 'SIM' : 'NÃO' }}
                </p>
                <p class="metric-label">Alcançará fiação</p>
              </div>
            </v-col>

            <v-col cols="6" sm="3">
              <div class="metric-card">
                <v-icon size="24" color="indigo">mdi-calendar-clock</v-icon>
                <p class="metric-value">
                  {{
                    heightPercent >= 100
                      ? 'ALCANÇADO'
                      : data.aiPrediction?.days_to_wire
                        ? data.aiPrediction.days_to_wire.toLocaleString()
                        : 'N/A'
                  }}
                </p>
                <p class="metric-label">Dias até a fiação</p>
              </div>
            </v-col>

            <v-col cols="6" sm="3">
              <div class="metric-card">
                <v-icon size="24" color="deep-purple">mdi-calendar-month</v-icon>
                <p class="metric-value">
                  {{
                    heightPercent >= 100
                      ? '0.0'
                      : data.aiPrediction?.months_to_wire?.toFixed(1) || '0.0'
                  }}
                </p>
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
            <span class="section-title">Análise da Inteligência Artificial</span>
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
                    <span class="text-caption text-grey-darken-1"
                      >L/A:
                      {{ (data.aiPrediction?.canopy?.ratio_width_height || 0).toFixed(2) }}</span
                    >
                  </div>
                  <p class="text-caption text-grey mb-0">
                    Formato estimado via processamento de imagem e espécie.
                  </p>
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
                  <span class="insight-label">Confiança da Previsão</span>
                </div>
                <div class="insight-main mt-3">
                  <div class="d-flex align-center justify-space-between mb-2">
                    <h3 class="insight-value">
                      {{
                        ((data.aiPrediction?.fibonacci_info?.growth_modifier || 0) * 100).toFixed(
                          0,
                        )
                      }}%
                    </h3>
                    <v-chip
                      size="x-small"
                      color="blue-lighten-4"
                      variant="flat"
                      class="text-blue-darken-4 font-weight-bold"
                      >Ajuste IA</v-chip
                    >
                  </div>
                  <div class="modern-progress mb-2">
                    <div
                      class="modern-progress-fill"
                      :style="{
                        width:
                          (data.aiPrediction?.fibonacci_info?.growth_modifier || 0) * 100 + '%',
                      }"
                    />
                  </div>
                  <p class="text-caption r-desc">
                    O quanto a IA está confiante nesta previsão. Quanto maior, mais precisa é a
                    estimativa.
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
            <div
              v-for="m in data.measurements.slice(0, 3)"
              :key="m.id"
              class="measurement-log-item"
            >
              <div class="log-date">{{ formatDate(m.date) }}</div>
              <div class="log-values">
                <span class="mr-3"
                  >📏 <strong>{{ m.height.toFixed(2) }}m</strong> <small>(Alt)</small></span
                >
                <span
                  >🌳 <strong>{{ m.canopyWidth.toFixed(2) }}m</strong> <small>(Copa)</small></span
                >
              </div>
            </div>
          </div>
        </div>

        <!-- ===== Solo (Inteligência Integrada) ===== -->
        <template v-if="soilInfo">
          <v-divider class="mb-6" />

          <div class="section-block">
            <div class="section-header mb-4">
              <v-icon size="20" class="mr-2" color="brown-darken-1">mdi-terraform</v-icon>
              <span class="section-title">Inteligência de Solo & Terreno</span>
              <v-chip
                v-if="!data.soil"
                size="x-small"
                variant="tonal"
                color="brown"
                class="ml-auto font-weight-bold"
              >
                ESTIMATIVA REGIONAL (EMBRAPA)
              </v-chip>
            </div>

            <!-- Growth & Definition Card -->
            <div
              class="soil-analysis-banner mb-5"
              :style="{
                borderLeft: `6px solid ${soilMarkerColor}`,
                background: `${soilMarkerColor}08`,
              }"
            >
              <div class="d-flex justify-space-between align-center mb-1">
                <span class="text-overline font-weight-bold" style="color: var(--mt-ink)"
                  >Expectativa de Crescimento</span
                >
                <v-chip
                  size="x-small"
                  :color="soilMarkerColor"
                  class="font-weight-bold"
                  variant="flat"
                >
                  {{ soilGrowthLabel }}
                </v-chip>
              </div>
              <p class="text-body-2 mb-0" style="color: var(--mt-ink); font-weight: 500">
                {{ soilDefinition }}
              </p>
            </div>

            <v-row dense>
              <!-- Argila -->
              <v-col cols="12" sm="6">
                <div class="soil-metric-item">
                  <div class="d-flex justify-space-between text-caption font-weight-bold mb-1">
                    <span>Argila</span>
                    <span>{{
                      data.soil?.clay
                        ? data.soil.clay.toFixed(1) + '%'
                        : (soilInfo?.typicalClay || 60) + '% (Típica)'
                    }}</span>
                  </div>
                  <v-progress-linear
                    :model-value="data.soil?.clay || soilInfo?.typicalClay || 60"
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
                    <span>pH</span>
                    <span>{{
                      data.soil?.ph
                        ? data.soil.ph.toFixed(1)
                        : (soilInfo?.typicalPh || 6.5) + ' (Típico)'
                    }}</span>
                  </div>
                  <v-progress-linear
                    :model-value="(data.soil?.ph || soilInfo?.typicalPh || 6.5) * 11"
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
                  <p class="metric-value">
                    {{ data.soil?.depth ? data.soil.depth.toFixed(1) + 'm' : '1.5m (Est.)' }}
                  </p>
                  <p class="metric-label">Profundidade</p>
                </div>
              </v-col>
              <v-col cols="6" sm="3">
                <div class="metric-card">
                  <v-icon size="20" color="orange-darken-3">mdi-slope-downhill</v-icon>
                  <p class="metric-value">
                    {{
                      data.soil?.inclination ? data.soil.inclination.toFixed(0) + '°' : '8° (Suave)'
                    }}
                  </p>
                  <p class="metric-label">Inclinação</p>
                </div>
              </v-col>
              <v-col cols="6" sm="3">
                <div class="metric-card">
                  <v-icon size="24" :color="soilQualityColor">{{ soilQualityIcon }}</v-icon>
                  <p class="metric-value text-caption" :class="`text-${soilQualityColor}`">
                    {{ soilQualityLabel }}
                  </p>
                  <p class="metric-label">Qualidade</p>
                </div>
              </v-col>
              <v-col cols="6" sm="3">
                <div class="metric-card">
                  <v-icon size="20" color="green-darken-2">mdi-leaf-circle</v-icon>
                  <p class="metric-value">{{ ((data.soil?.coverage || 0.6) * 100).toFixed(0) }}%</p>
                  <p class="metric-label">Cobertura</p>
                </div>
              </v-col>
            </v-row>
          </div>
        </template>
      </div>
      <v-alert
        v-else-if="showDetails"
        type="info"
        variant="tonal"
        density="compact"
        icon="mdi-information-outline"
        class="mb-5"
        rounded="lg"
      >
        Detalhes técnicos indisponíveis sem uma previsão válida.
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import type { TreeWithAi } from '@/plugins/apiConnect'
import { getSoilInfo } from '@/utils/soilData'

type PredictionState = 'loading' | 'available' | 'unavailable' | 'error'

const TREE_STATUS_LABELS: Record<string, string> = {
  NORMAL: 'Normal',
  MODERATE: 'Moderado',
  TO_PRUNE: 'Poda necessária',
  CRITICAL: 'Crítico',
  DANGER: 'Crítico',
  UNDER_OBSERVATION: 'Em observação',
  PRUNED: 'Poda registrada',
}

const SAO_PAULO_DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function formatLastPruneDate(value?: string | null): string {
  if (!value?.trim()) return 'Data não informada'

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  let date: Date

  if (dateOnly) {
    const [, yearText, monthText, dayText] = dateOnly
    const year = Number(yearText)
    const month = Number(monthText)
    const day = Number(dayText)
    date = new Date(Date.UTC(year, month - 1, day, 12))
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return 'Data não informada'
    }
  } else {
    date = new Date(value)
  }

  return Number.isNaN(date.getTime()) ? 'Data não informada' : SAO_PAULO_DATE_FORMATTER.format(date)
}

export default defineComponent({
  name: 'TreeAiStats',

  props: {
    data: {
      type: Object as PropType<TreeWithAi>,
      required: true,
    },
    predictionState: {
      type: String as PropType<PredictionState>,
      default: 'unavailable',
    },
    errorMessage: {
      type: String,
      default: '',
    },
  },

  emits: ['retry'],

  data() {
    return {
      showDetails: false,
    }
  },

  computed: {
    /* ---------- Validação da predição ---------- */
    hasValidPrediction(): boolean {
      const p = this.data.aiPrediction
      if (!p || typeof p !== 'object') return false
      return (
        Number.isFinite(p.estimated_height_m) &&
        p.estimated_height_m > 0 &&
        Number.isFinite(p.wire_height_m) &&
        p.wire_height_m > 0
      )
    },

    hasTechnicalDetails(): boolean {
      return this.predictionState === 'available' && this.hasValidPrediction
    },

    /* ---------- Risco ---------- */
    riskClass(): string {
      if (!this.hasValidPrediction) return 'observation'
      // OVERRIDE: Se estiver a 90% ou mais da fiação, é CRÍTICO independente do status da IA
      if (this.heightPercent >= 90) return 'critical'

      const s = String(this.data.aiPrediction?.risk_status || '').toUpperCase()
      const map: Record<string, string> = {
        NORMAL: 'normal',
        MODERATE: 'moderate',
        CRITICAL: 'critical',
        TO_PRUNE: 'critical',
        UNDER_OBSERVATION: 'observation',
      }
      return map[s] || 'normal'
    },

    riskIcon(): string {
      if (!this.hasValidPrediction) return 'mdi-information-outline'
      const s = String(this.data.aiPrediction?.risk_status || '').toUpperCase()
      const map: Record<string, string> = {
        NORMAL: 'mdi-shield-check',
        MODERATE: 'mdi-shield-alert',
        CRITICAL: 'mdi-shield-remove',
        TO_PRUNE: 'mdi-content-cut',
        UNDER_OBSERVATION: 'mdi-eye-outline',
      }
      return map[s] || 'mdi-information-outline'
    },

    operationalStatusLabel(): string {
      const status = String(this.data.effectiveStatus || this.data.status || '').toUpperCase()
      return TREE_STATUS_LABELS[status] || 'Sem classificação'
    },

    registeredClassificationLabel(): string {
      const status = String(this.data.status || '').trim().toUpperCase()
      if (!status) return ''
      const label = TREE_STATUS_LABELS[status] || status
      return label.toLocaleLowerCase('pt-BR') === this.operationalStatusLabel.toLocaleLowerCase('pt-BR')
        ? ''
        : label
    },

    operationalStatusColor(): string {
      const status = String(this.data.effectiveStatus || this.data.status || '').toUpperCase()
      if (status === 'CRITICAL' || status === 'DANGER') return 'error'
      if (status === 'TO_PRUNE') return 'warning'
      if (status === 'UNDER_OBSERVATION') return 'info'
      if (status === 'NORMAL' || status === 'PRUNED') return 'success'
      return 'info'
    },

    /* ---------- Resumo em linguagem simples (para leigos) ---------- */
    plainSummary(): { title: string; description: string } {
      const pct = this.heightPercent
      const faltam = this.remainingMeters
      const meses = this.data.aiPrediction?.months_to_wire

      // Texto sobre o tempo, quando disponível e relevante
      const tempoTxt =
        meses && meses > 0 && pct < 100
          ? ` No ritmo de crescimento estimado, levará cerca de ${Math.round(meses)} ${Math.round(meses) === 1 ? 'mês' : 'meses'} para se aproximar da fiação.`
          : ''

      if (pct >= 90) {
        return {
          title: 'Prioridade de vistoria',
          description:
            'A altura estimada está próxima ou acima da referência da fiação. Priorize a vistoria em campo.',
        }
      }
      if (pct >= 70) {
        return {
          title: 'Situação: Atenção',
          description: `A diferença estimada até a referência é de ${faltam} m.${tempoTxt} Inclua a árvore no planejamento de vistorias.`,
        }
      }
      return {
        title: 'Estimativa abaixo da referência',
        description: `A diferença estimada de altura é de ${faltam} m. A avaliação depende da vistoria em campo.`,
      }
    },

    lastPruneDateLabel(): string {
      return formatLastPruneDate(this.data.lastPruneDate)
    },

    /* ---------- Altura ---------- */
    heightPercent(): number {
      const est = this.data.aiPrediction?.estimated_height_m || 0
      const wire = this.data.aiPrediction?.wire_height_m || 6.5
      const pct = (est / wire) * 100
      return Math.min(pct, 100)
    },

    remainingMeters(): string {
      const wire = this.data.aiPrediction?.wire_height_m || 6.5
      const est = this.data.aiPrediction?.estimated_height_m || 0
      const diff = wire - est
      return Math.max(diff, 0).toFixed(2)
    },

    /* ---------- Copa ---------- */
    canopyIcon(): string {
      const shape = this.data.aiPrediction?.canopy?.shape || 'WIDE'
      const map: Record<string, string> = {
        WIDE: 'mdi-tree',
        NARROW: 'mdi-pine-tree',
        ROUND: 'mdi-circle-outline',
        COLUMNAR: 'mdi-pillar',
      }
      return map[shape] || 'mdi-tree'
    },

    canopyLabel(): string {
      const shape = this.data.aiPrediction?.canopy?.shape || 'Desconhecida'
      const map: Record<string, string> = {
        WIDE: 'Ampla',
        NARROW: 'Estreita',
        ROUND: 'Arredondada',
        COLUMNAR: 'Colunar',
      }
      return map[shape] || shape
    },

    canopyColor(): string {
      const shape = this.data.aiPrediction?.canopy?.shape || ''
      const map: Record<string, string> = {
        WIDE: 'teal',
        NARROW: 'indigo',
        ROUND: 'green',
        COLUMNAR: 'deep-purple',
      }
      return map[shape] || 'grey'
    },

    /* ---------- Fibonacci ---------- */
    fibonacciPercent(): number {
      return Math.min((this.data.aiPrediction?.fibonacci_info?.growth_modifier || 0) * 100, 100)
    },

    /* ---------- Solo ---------- */
    soilQualityLabel(): string {
      return this.soilInfo?.name || this.data.soil?.quality || 'Solo Regional'
    },

    soilQualityColor(): string {
      const q = this.data.soil?.quality || 'REGULAR'
      const map: Record<string, string> = {
        GOOD: 'green-darken-2',
        REGULAR: 'orange-darken-2',
        BAD: 'red-darken-1',
      }
      return map[q] || 'grey'
    },

    soilQualityIcon(): string {
      const q = this.data.soil?.quality || 'REGULAR'
      const map: Record<string, string> = {
        GOOD: 'mdi-star-face',
        REGULAR: 'mdi-emoticon-neutral-outline',
        BAD: 'mdi-emoticon-dead-outline',
      }
      return map[q] || 'mdi-help-circle'
    },

    soilGrowthLabel(): string {
      return this.soilInfo?.growthImpact || 'N/A'
    },

    soilDefinition(): string {
      return this.soilInfo?.description || 'Análise de solo pendente.'
    },

    soilMarkerColor(): string {
      const typeKey = this.data.soil?.soilType || this.data.soil?.quality || 'LATOSSOLO_VERMELHO'
      return getSoilInfo(typeKey).color
    },

    soilInfo(): ReturnType<typeof getSoilInfo> {
      const typeKey = this.data.soil?.soilType || this.data.soil?.quality || 'LATOSSOLO_VERMELHO'
      return getSoilInfo(typeKey)
    },

    /* ---------- Vigor (Saúde) ---------- */
    vigorLabel(): string {
      const map: Record<string, string> = {
        EXCELLENT: 'Excelente',
        GOOD: 'Bom',
        POOR: 'Debilitado',
        DEAD: 'Morto',
      }
      return map[this.data.vigor || ''] || 'Indisponível'
    },

    vigorColor(): string {
      const map: Record<string, string> = {
        EXCELLENT: 'green-accent-4',
        GOOD: 'light-green-darken-2',
        POOR: 'amber-darken-3',
        DEAD: 'grey-darken-3',
      }
      return map[this.data.vigor || ''] || 'grey'
    },

    vigorIcon(): string {
      const map: Record<string, string> = {
        EXCELLENT: 'mdi-heart-plus',
        GOOD: 'mdi-heart',
        POOR: 'mdi-heart-broken',
        DEAD: 'mdi-skull-crossbones',
      }
      return map[this.data.vigor || ''] || 'mdi-help-circle'
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

/* ============ BODY ============ */
.card-body {
  padding: 18px !important;
}

.tree-summary {
  display: grid;
  gap: 14px;
  color: rgb(var(--v-theme-on-surface));
}

.tree-summary__risk {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.tree-summary__label,
.tree-summary__row-label {
  color: rgba(var(--v-theme-on-surface), 0.72);
  font-size: 0.82rem;
  font-weight: 600;
  margin: 0;
}

.tree-summary__risk-badge {
  min-height: 32px;
  font-size: 0.9rem;
}

.tree-summary__classification {
  color: rgba(var(--v-theme-on-surface), 0.72);
  font-size: 0.78rem;
  line-height: 1.4;
  margin: 0;
}

.tree-summary__row {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-height: 36px;
}

.tree-summary__row-icon {
  color: rgba(var(--v-theme-on-surface), 0.72);
}

.tree-summary__row-value {
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.9rem;
  text-align: right;
}

.tree-summary__divider {
  margin: 16px 0;
  opacity: 0.75;
}

.ai-prediction__heading {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.ai-prediction__title {
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0;
}

.prediction-state {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  color: rgba(var(--v-theme-on-surface), 0.78);
  font-size: 0.85rem;
}

.prediction-spinner {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  border: 2px solid rgba(var(--v-theme-primary), 0.22);
  border-top-color: rgb(var(--v-theme-primary));
  border-radius: 50%;
  animation: prediction-spin 0.8s linear infinite;
}

@keyframes prediction-spin {
  to {
    transform: rotate(360deg);
  }
}

.prediction-state-alert {
  margin: 0;
}

.technical-details-toggle {
  min-height: 42px;
}

@media (max-width: 400px) {
  .card-body {
    padding: 15px !important;
  }

  .tree-summary__row {
    grid-template-columns: 22px minmax(0, 1fr) auto;
    gap: 8px;
  }

  .tree-summary__row-label,
  .tree-summary__row-value {
    font-size: 0.82rem;
  }
}

/* ============ RESUMO EM LINGUAGEM SIMPLES ============ */
.plain-summary {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 16px;
  border: 1px solid transparent;
}

.plain-summary-icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.plain-summary-title {
  font-size: 1rem;
  font-weight: 800;
  color: #263238;
}

.plain-summary-desc {
  font-size: 0.875rem;
  color: #455a64;
  line-height: 1.45;
}

/* Variações por nível de risco */
.plain-summary--normal {
  background: #edf7ee;
  border-color: #c8e6c9;
}
.plain-summary--normal .plain-summary-icon {
  background: #43a047;
}

.plain-summary--observation {
  background: #fff8e1;
  border-color: #ffe082;
}
.plain-summary--observation .plain-summary-icon {
  background: #f9a825;
}

.plain-summary--moderate {
  background: #fff3e0;
  border-color: #ffcc80;
}
.plain-summary--moderate .plain-summary-icon {
  background: #fb8c00;
}

.plain-summary--critical {
  background: #fdecec;
  border-color: #f6c6c6;
}
.plain-summary--critical .plain-summary-icon {
  background: #e53935;
}

/* ============ AI ALERT ============ */
.ai-alert {
  border-left: 4px solid #ff8f00 !important;
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
  0% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

.fill-normal {
  background: linear-gradient(90deg, #66bb6a, #43a047);
}

.fill-moderate {
  background: linear-gradient(90deg, #ffb74d, #fb8c00);
}

.fill-critical {
  background: linear-gradient(90deg, #ef5350, #c62828);
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
  background: #fff8e1;
  border: 2px solid #ffb300;
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
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.05),
    0 2px 4px -1px rgba(0, 0, 0, 0.03);
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
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

/* Text and surfaces follow the active Vuetify theme. Semantic status accents stay distinct. */
.tree-ai-card {
  color: rgb(var(--v-theme-on-surface));
  background: rgb(var(--v-theme-surface));
  border-color: rgba(var(--v-theme-on-surface), 0.14);
}
.plain-summary {
  background: rgb(var(--v-theme-surface-variant));
  border-color: rgba(var(--v-theme-on-surface), 0.22);
}
.plain-summary-title,
.plain-summary-desc,
.section-title,
.metric-value,
.insight-label,
.insight-value,
.log-values {
  color: rgb(var(--v-theme-on-surface));
}
.metric-card,
.insight-card-v2,
.soil-analysis-banner,
.measurement-log-item {
  color: rgb(var(--v-theme-on-surface));
  background: rgb(var(--v-theme-surface));
  border-color: rgba(var(--v-theme-on-surface), 0.16);
}
.metric-card:hover,
.insight-card-v2:hover {
  background: rgb(var(--v-theme-surface-variant));
}
.progress-track,
.modern-progress {
  background: rgb(var(--v-theme-surface-variant));
}
.progress-wire-marker {
  background: color-mix(in srgb, var(--mt-status-warning) 16%, var(--mt-surface));
  border-color: var(--mt-status-warning);
  color: var(--mt-status-warning);
}
.metric-label,
.r-desc,
.log-date,
.tree-ai-card .text-grey-darken-1,
.tree-ai-card .text-grey {
  color: rgba(var(--v-theme-on-surface), 0.78) !important;
}
.tree-ai-card .text-error {
  color: rgb(var(--v-theme-error)) !important;
}
.tree-ai-card .text-success {
  color: rgb(var(--v-theme-success)) !important;
}
.progress-wire-marker {
  background: rgb(var(--v-theme-surface));
  border-color: rgb(var(--v-theme-warning));
}

</style>
