<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { catalogCount, speciesIcon, type CatalogSpecies } from '@/utils/speciesDisplay'

const props = defineProps<{
  species: CatalogSpecies[]
  mapPath: string
  loading?: boolean
  failed?: boolean
}>()
defineEmits<{ retry: [] }>()
const search = ref<string | null>('')
const page = ref(1)
const pageSize = 5
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
const sortedSpecies = computed(() =>
  [...props.species].sort(
    (a, b) =>
      (catalogCount(b) ?? -1) - (catalogCount(a) ?? -1) ||
      a.commonName.localeCompare(b.commonName, 'pt-BR'),
  ),
)
const results = computed(() =>
  sortedSpecies.value.filter((species) =>
    normalize(`${species.commonName} ${species.scientificName || ''}`).includes(
      normalize(search.value || ''),
    ),
  ),
)
const pageCount = computed(() => Math.max(1, Math.ceil(results.value.length / pageSize)))
const visibleSpecies = computed(() =>
  results.value.slice((page.value - 1) * pageSize, page.value * pageSize),
)
watch(search, () => {
  page.value = 1
})
watch(pageCount, (count) => {
  page.value = Math.min(page.value, count)
})
</script>

<template>
  <section class="catalog" aria-label="Espécies catalogadas">
    <header class="catalog-header">
      <h2>
        <v-icon size="18" color="green-darken-2" class="mr-2" aria-hidden="true">mdi-leaf</v-icon
        >Espécies catalogadas <span v-if="!loading && !failed">{{ species.length }}</span>
      </h2>
      <RouterLink :to="{ path: mapPath, query: { camada: 'calor' } }" class="catalog-map-link"
        >Ver no mapa ↗</RouterLink
      >
    </header>
    <div class="catalog-body">
      <p v-if="loading" role="status">Carregando catálogo…</p>
      <div v-else-if="failed" role="alert">
        Não foi possível carregar o catálogo.
        <v-btn variant="text" size="small" @click="$emit('retry')">Tentar novamente</v-btn>
      </div>
      <template v-else>
        <v-text-field
          v-model="search"
          label="Buscar espécie"
          placeholder="Nome popular ou científico"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          @click:clear="search = ''"
        />
        <div class="catalog-list">
          <RouterLink
            v-for="species in visibleSpecies"
            :key="species.id"
            :to="{ path: mapPath, query: { camada: 'calor', especie: species.commonName } }"
            class="catalog-species"
            :aria-label="`Ver ${species.commonName} no mapa de calor`"
          >
            <span class="catalog-symbol" aria-hidden="true">{{
              speciesIcon(species.commonName)
            }}</span>
            <div class="catalog-info">
              <strong>{{ species.commonName }}</strong
              ><em>{{ species.scientificName }}</em>
            </div>
            <span class="catalog-count"
              >{{
                catalogCount(species) === undefined
                  ? '—'
                  : catalogCount(species)?.toLocaleString('pt-BR')
              }}<small>{{
                catalogCount(species) === undefined
                  ? 'Sem contagem'
                  : catalogCount(species) === 1
                    ? 'árvore'
                    : 'árvores'
              }}</small></span
            >
            <v-icon size="16" color="grey" aria-hidden="true">mdi-chevron-right</v-icon>
          </RouterLink>
        </div>
        <p v-if="!visibleSpecies.length" class="empty-catalog">
          {{ search ? 'Nenhuma espécie encontrada.' : 'Nenhuma espécie cadastrada.' }}
        </p>
        <footer class="catalog-footer">
          <span role="status"
            >{{ results.length.toLocaleString('pt-BR') }} espécie(s){{
              search ? ' encontradas' : ' no catálogo'
            }}</span
          >
          <v-pagination
            v-if="pageCount > 1"
            v-model="page"
            :length="pageCount"
            :total-visible="3"
            density="compact"
            size="small"
            rounded="lg"
            active-color="green-darken-3"
            aria-label="Páginas do catálogo de espécies"
          />
        </footer>
      </template>
    </div>
  </section>
</template>

<style scoped>
.catalog {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #fff;
  min-width: 0;
  align-self: start;
}
.catalog-header {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #eef1f4;
}
h2 {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  font-size: 0.92rem;
  font-weight: 700;
  color: #334155;
}
h2 span {
  font-size: 0.72rem;
  font-weight: 500;
  margin-left: 8px;
  color: #64748b;
}
.catalog-map-link {
  color: #287543;
  font-size: 0.78rem;
  padding: 4px 0;
  text-underline-offset: 4px;
}
.catalog-body {
  padding: 12px 16px;
}
.catalog-list {
  margin-top: 8px;
}
.catalog-species {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  min-height: 62px;
  padding: 8px 4px;
  border-bottom: 1px solid #f0f2f4;
  color: #334155;
  text-decoration: none;
  border-radius: 4px;
}
.catalog-species:hover {
  background: #f4f8f5;
}
a:focus-visible {
  outline: 2px solid #237648;
  outline-offset: 2px;
}
.catalog-symbol {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: #edf5ef;
  font-size: 1rem;
  flex-shrink: 0;
}
.catalog-info {
  display: grid;
  gap: 3px;
  min-width: 0;
  overflow-wrap: anywhere;
  flex: 1;
}
.catalog-info strong {
  font-size: 0.84rem;
  font-weight: 600;
}
.catalog-info em {
  font-size: 0.72rem;
  color: #64748b;
}
.catalog-count {
  text-align: right;
  font-size: 0.85rem;
  font-weight: 700;
  flex-shrink: 0;
}
.catalog-count small {
  display: block;
  font-size: 0.64rem;
  font-weight: 400;
  color: #64748b;
}
.catalog-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  margin-top: 12px;
}
.catalog-footer > span,
.empty-catalog {
  font-size: 0.75rem;
  color: #64748b;
}
.empty-catalog {
  padding: 24px 0;
  text-align: center;
}
@media (max-width: 400px) {
  .catalog-header,
  .catalog-body {
    padding: 12px;
  }
  .catalog-footer {
    justify-content: center;
  }
}
</style>
