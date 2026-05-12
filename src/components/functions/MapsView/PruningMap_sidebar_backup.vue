<!--
  BACKUP DO MENU LATERAL ORIGINAL (Accordion)
  Data: 2025-04-30
  Este arquivo contém o menu lateral original com estrutura de accordion.
  Caso as novas mudanças não sejam satisfatórias, restaurar este conteúdo
  na seção SIDEBAR do PruningMap.vue
-->

<!-- ============ BOTÃO TOGGLE SIDEBAR ============ -->
<v-btn
  class="sidebar-toggle-btn"
  icon
  size="small"
  elevation="4"
  color="white"
  :style="{ left: sidebarOpen ? '285px' : '12px' }"
  @click="sidebarOpen = !sidebarOpen"
>
  <v-icon>{{ sidebarOpen ? 'mdi-chevron-left' : 'mdi-chevron-right' }}</v-icon>
</v-btn>

<!-- ============ SIDEBAR (BACKUP - Accordion) ============ -->
<Transition name="fade">
  <div v-if="sidebarOpen && isMobile" class="sidebar-backdrop" @click="sidebarOpen = false" />
</Transition>

<Transition name="slide">
  <div v-show="sidebarOpen" class="map-sidebar">

    <!-- Mini dashboard compacto -->
    <div class="sidebar-section dashboard-section">
      <div class="d-flex align-center justify-space-between mb-3">
        <p class="sidebar-title mb-0">
          <v-icon size="20" color="green-darken-2" class="mr-1">mdi-leaf</v-icon>
          Mapa de Podas
        </p>
        <v-chip size="x-small" color="green" variant="flat" class="font-weight-bold">
          {{ visibleTreeCount }} visíveis
        </v-chip>
        <span class="text-caption text-grey-darken-1 ml-2">de {{ treeCount }} total</span>
      </div>

      <div class="stats-grid">
        <div class="stat-card" style="--accent:#4CAF50" @click="activeFilter = 'ALL'">
          <div class="stat-number">{{ visibleTreeCount }}</div>
          <div class="stat-label">Visíveis 🗺️</div>
        </div>
        <div class="stat-card" style="--accent:#2196F3" @click="activeFilter = 'ALL'">
          <div class="stat-number">{{ treeCount }}</div>
          <div class="stat-label">Total 🌳</div>
        </div>
        <div class="stat-card" style="--accent:#FF3B3B" @click="activeFilter = 'DANGER'">
          <div class="stat-number">{{ dangerCount }}</div>
          <div class="stat-label">Risco ⚡</div>
        </div>
        <div class="stat-card" style="--accent:#FF9800" @click="activeFilter = 'TO_PRUNE'">
          <div class="stat-number">{{ statusCounts['TO_PRUNE'] || 0 }}</div>
          <div class="stat-label">Podar ✂️</div>
        </div>
      </div>
    </div>

    <!-- Accordion Organizado -->
    <v-expansion-panels v-model="expandedPanels" multiple variant="accordion" class="sidebar-panels">

      <!-- Painel 1: Carregamento de Árvores -->
      <v-expansion-panel value="carregamento" class="sidebar-panel">
        <v-expansion-panel-title class="panel-title">
          <v-icon size="18" class="mr-2" color="green-darken-2">mdi-map-marker-multiple</v-icon>
          <span class="text-subtitle-2 font-weight-medium">Carregar Árvores</span>
          <v-spacer />
          <v-chip v-if="selectedRegion" size="x-small" color="teal" variant="flat" class="ml-2">
            {{ selectedRegion.name }}
          </v-chip>
        </v-expansion-panel-title>
        <v-expansion-panel-text class="panel-content">

          <!-- Seleção de Região -->
          <v-select
            v-model="selectedRegion"
            :items="availableRegions"
            item-title="name"
            return-object
            label="Selecionar cidade/região"
            density="compact"
            variant="outlined"
            class="mb-2"
            clearable
            hide-details
            @update:model-value="(region) => region && loadCityStats(region)"
          />

          <!-- Preview de estatísticas da cidade -->
          <div v-if="selectedRegion" class="city-stats-preview mb-3">
            <div v-if="cityStats" class="stats-card mb-2 pa-2 rounded-lg" style="background: linear-gradient(135deg, #f5f5f5, #e0e0e0);">
              <div class="d-flex justify-space-between align-center mb-1">
                <span class="text-caption font-weight-bold text-grey-darken-2">
                  <v-icon size="14" color="green" class="mr-1">mdi-tree</v-icon>
                  {{ cityStats.total }} árvores
                </span>
                <span v-if="cityStats.withRisk > 0" class="text-caption font-weight-bold text-red-darken-2">
                  <v-icon size="14" color="red" class="mr-1">mdi-alert</v-icon>
                  {{ cityStats.withRisk }} em risco
                </span>
              </div>
              <div class="d-flex" style="height: 4px; border-radius: 2px; overflow: hidden;">
                <div
                  v-for="(count, status) in cityStats.byStatus"
                  :key="status"
                  :style="{
                    width: (count / cityStats.total * 100) + '%',
                    backgroundColor: STATUS_CONFIG[status]?.color || '#999'
                  }"
                  :title="`${status}: ${count}`"
                />
              </div>
            </div>

            <v-btn
              block
              size="small"
              variant="tonal"
              color="blue-darken-1"
              prepend-icon="mdi-download"
              @click="fetchTreesByRegion(selectedRegion, true)"
              :loading="loadingRegion"
            >
              Carregar {{ selectedRegion.name }}
            </v-btn>
          </div>

          <div class="d-flex gap-2 mb-3">
            <v-btn
              size="small"
              variant="flat"
              color="teal-darken-1"
              prepend-icon="mdi-crosshairs-gps"
              @click="detectAndLoadRegion"
              class="flex-grow-1"
              density="comfortable"
            >
              Minha Região
            </v-btn>
            <v-btn
              size="small"
              variant="tonal"
              color="green-darken-1"
              prepend-icon="mdi-refresh"
              :loading="loadingTrees"
              @click="fetchTreesNearby(true)"
              density="comfortable"
              title="Carregar por raio"
            />
          </div>

          <v-btn
            v-if="hasMoreTrees"
            block
            size="small"
            variant="flat"
            color="blue-darken-1"
            prepend-icon="mdi-map-marker-radius"
            :loading="loadingTrees"
            @click="loadMoreTrees"
            class="mb-2"
          >
            Expandir raio ({{ loadRadius < 5 ? '5km' : loadRadius < 10 ? '10km' : loadRadius < 20 ? '20km' : '50km' }})
          </v-btn>

          <v-btn
            block
            size="small"
            variant="text"
            color="grey-darken-1"
            prepend-icon="mdi-grid"
            :loading="loadingTrees"
            :disabled="!selectedRegion"
            @click="loadVisibleTiles"
            class="mb-2"
          >
            Carregar área visível (tiles)
          </v-btn>

          <v-progress-linear v-if="loadingTrees" indeterminate color="green" class="mt-2" height="2" />

          <v-divider class="my-3" />
          <div class="d-flex align-center justify-space-between">
            <span class="text-caption text-grey-darken-1">
              <v-icon size="14" class="mr-1">mdi-refresh-auto</v-icon>
              Auto-carregar ao ampliar
            </span>
            <v-switch
              v-model="autoLoadOnZoom"
              color="green"
              density="compact"
              hide-details
              size="small"
            />
          </div>

          <div class="text-caption text-grey-darken-1 mt-2 text-center">
            <v-icon size="12" class="mr-1">mdi-information-outline</v-icon>
            {{ visibleTreeCount }} visíveis de {{ treeCount }} carregadas
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>

      <!-- Painel 2: Filtros -->
      <v-expansion-panel value="filtros" class="sidebar-panel">
        <v-expansion-panel-title class="panel-title">
          <v-icon size="18" class="mr-2" color="orange-darken-2">mdi-filter-variant</v-icon>
          <span class="text-subtitle-2 font-weight-medium">Filtros</span>
          <v-spacer />
          <v-chip size="x-small" color="orange" variant="flat" class="ml-2">
            {{ activeFilter === 'ALL' ? 'Todos' : STATUS_CONFIG[activeFilter]?.label || activeFilter }}
          </v-chip>
        </v-expansion-panel-title>
        <v-expansion-panel-text class="panel-content">
          <div class="filter-chips">
            <v-chip
              size="small"
              :variant="activeFilter === 'ALL' ? 'flat' : 'outlined'"
              :color="activeFilter === 'ALL' ? 'green' : 'grey'"
              @click="activeFilter = 'ALL'"
              class="mr-1 mb-1"
            >
              Todos
            </v-chip>
            <v-chip
              v-for="(cfg, key) in STATUS_CONFIG"
              :key="key"
              size="small"
              :variant="activeFilter === key ? 'flat' : 'outlined'"
              :color="cfg.color"
              @click="activeFilter = String(key)"
              class="mr-1 mb-1"
            >
              {{ cfg.emoji }} {{ cfg.label }}
            </v-chip>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>

    </v-expansion-panels>
  </div>
</Transition>
