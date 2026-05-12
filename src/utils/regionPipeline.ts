/**
 * Region Pipeline - Sistema de Carregamento de Árvores por Região
 * Divide o mapa em regiões hierárquicas: Estado > Cidade > Bairro > Quadrante
 */

import { apiConnect } from '@/plugins/apiConnect'

// ============================================================
// TIPOS
// ============================================================

export interface Region {
  id: string
  name: string
  type: 'state' | 'city' | 'district' | 'quadrant'
  bounds: {
    north: number
    south: number
    east: number
    west: number
  }
  center: {
    lat: number
    lng: number
  }
  parentId?: string
  treeCount?: number
  loaded: boolean
}

export interface TileCoord {
  x: number
  y: number
  zoom: number
}

export interface TileData {
  coord: TileCoord
  bounds: {
    north: number
    south: number
    east: number
    west: number
  }
  trees: any[]
  loaded: boolean
  loading: boolean
  lastAccessed: number
}

// ============================================================
// REGIÕES PRE-DEFINIDAS (Ceará - exemplo)
// ============================================================

export const CEARA_REGIONS: Region[] = [
  // Fortaleza e região metropolitana
  {
    id: 'for-metro',
    name: 'Fortaleza e Região Metropolitana',
    type: 'city',
    bounds: { north: -3.68, south: -3.92, east: -38.35, west: -38.65 },
    center: { lat: -3.7327, lng: -38.5270 },
    loaded: false
  },
  {
    id: 'for-norte',
    name: 'Fortaleza - Zona Norte',
    type: 'district',
    bounds: { north: -3.68, south: -3.74, east: -38.45, west: -38.52 },
    center: { lat: -3.71, lng: -38.485 },
    parentId: 'for-metro',
    loaded: false
  },
  {
    id: 'for-sul',
    name: 'Fortaleza - Zona Sul',
    type: 'district',
    bounds: { north: -3.76, south: -3.82, east: -38.45, west: -38.55 },
    center: { lat: -3.79, lng: -38.50 },
    parentId: 'for-metro',
    loaded: false
  },
  {
    id: 'for-leste',
    name: 'Fortaleza - Zona Leste',
    type: 'district',
    bounds: { north: -3.71, south: -3.78, east: -38.42, west: -38.48 },
    center: { lat: -3.745, lng: -38.45 },
    parentId: 'for-metro',
    loaded: false
  },
  {
    id: 'for-oeste',
    name: 'Fortaleza - Zona Oeste',
    type: 'district',
    bounds: { north: -3.71, south: -3.78, east: -38.52, west: -38.58 },
    center: { lat: -3.745, lng: -38.55 },
    parentId: 'for-metro',
    loaded: false
  },
  {
    id: 'maracanau',
    name: 'Maracanaú',
    type: 'city',
    bounds: { north: -3.82, south: -3.88, east: -38.55, west: -38.65 },
    center: { lat: -3.85, lng: -38.60 },
    parentId: 'for-metro',
    loaded: false
  },
  {
    id: 'caucaia',
    name: 'Caucaia',
    type: 'city',
    bounds: { north: -3.70, south: -3.80, east: -38.55, west: -38.70 },
    center: { lat: -3.75, lng: -38.62 },
    parentId: 'for-metro',
    loaded: false
  },
  {
    id: 'eusebio',
    name: 'Eusébio',
    type: 'city',
    bounds: { north: -3.85, south: -3.90, east: -38.40, west: -38.50 },
    center: { lat: -3.875, lng: -38.45 },
    parentId: 'for-metro',
    loaded: false
  },

  // Interior
  {
    id: 'crato',
    name: 'Crato',
    type: 'city',
    bounds: { north: -7.20, south: -7.30, east: -39.35, west: -39.45 },
    center: { lat: -7.25, lng: -39.40 },
    loaded: false
  },
  {
    id: 'juazeiro',
    name: 'Juazeiro do Norte',
    type: 'city',
    bounds: { north: -7.18, south: -7.28, east: -39.28, west: -39.38 },
    center: { lat: -7.23, lng: -39.33 },
    loaded: false
  },
  {
    id: 'sobral',
    name: 'Sobral',
    type: 'city',
    bounds: { north: -3.65, south: -3.75, east: -40.30, west: -40.40 },
    center: { lat: -3.70, lng: -40.35 },
    loaded: false
  },
  {
    id: 'igarassu',
    name: 'Iguatu',
    type: 'city',
    bounds: { north: -6.35, south: -6.45, east: -39.25, west: -39.35 },
    center: { lat: -6.40, lng: -39.30 },
    loaded: false
  }
]

// ============================================================
// SISTEMA DE TILES (Quadrantes Dinâmicos)
// ============================================================

const TILE_CACHE = new Map<string, TileData>()
const MAX_CACHE_SIZE = 200 // Limite de tiles em memória (aumentado para grandes volumes)

/**
 * Gera chave única para um tile
 */
export function getTileKey(coord: TileCoord): string {
  return `${coord.zoom}_${coord.x}_${coord.y}`
}

/**
 * Converte coordenadas lat/lng para tile (Slippy Map)
 */
export function latLngToTile(lat: number, lng: number, zoom: number): TileCoord {
  const n = Math.pow(2, zoom)
  const x = Math.floor((lng + 180) / 360 * n)
  const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n)
  return { x, y, zoom }
}

/**
 * Converte tile para bounds geográficos
 */
export function tileToBounds(coord: TileCoord): { north: number, south: number, east: number, west: number } {
  const n = Math.pow(2, coord.zoom)

  const west = coord.x / n * 360 - 180
  const east = (coord.x + 1) / n * 360 - 180

  const south = tileToLat(coord.y + 1, n)
  const north = tileToLat(coord.y, n)

  return { north, south, east, west }
}

function tileToLat(y: number, n: number): number {
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)))
  return latRad * 180 / Math.PI
}

/**
 * Obtém tiles visíveis no mapa
 */
export function getVisibleTiles(
  bounds: { north: number, south: number, east: number, west: number },
  zoom: number
): TileCoord[] {
  const tiles: TileCoord[] = []

  const nw = latLngToTile(bounds.north, bounds.west, zoom)
  const se = latLngToTile(bounds.south, bounds.east, zoom)

  for (let x = nw.x; x <= se.x; x++) {
    for (let y = se.y; y <= nw.y; y++) {
      tiles.push({ x, y, zoom })
    }
  }

  return tiles
}

/**
 * Busca árvores para um tile específico
 */
export async function loadTileData(coord: TileCoord): Promise<TileData | null> {
  const key = getTileKey(coord)

  // Verifica cache
  const cached = TILE_CACHE.get(key)
  if (cached && !cached.loading) {
    cached.lastAccessed = Date.now()
    return cached
  }

  const bounds = tileToBounds(coord)

  const tileData: TileData = {
    coord,
    bounds,
    trees: [],
    loaded: false,
    loading: true,
    lastAccessed: Date.now()
  }

  TILE_CACHE.set(key, tileData)

  try {
    const res = await apiConnect.getTreesInBounds(
      bounds.north,
      bounds.south,
      bounds.east,
      bounds.west,
      5000 // Limite por tile (aumentado para suportar grandes volumes)
    )

    tileData.trees = res.data || []
    tileData.loaded = true
    tileData.loading = false

    // Limpa cache antigo se necessário
    cleanupCache()

    return tileData
  } catch (err) {
    console.error(`Erro ao carregar tile ${key}:`, err)
    tileData.loading = false
    return null
  }
}

/**
 * Limpa tiles antigos do cache
 */
function cleanupCache(): void {
  if (TILE_CACHE.size <= MAX_CACHE_SIZE) return

  // Ordena por último acesso e remove os mais antigos
  const sorted = Array.from(TILE_CACHE.entries())
    .sort((a, b) => b[1].lastAccessed - a[1].lastAccessed)

  const toRemove = sorted.slice(MAX_CACHE_SIZE)
  toRemove.forEach(([key]) => TILE_CACHE.delete(key))
}

// ============================================================
// SISTEMA DE REGIÕES HIERÁRQUICAS
// ============================================================

const LOADED_REGIONS = new Set<string>()

/**
 * Busca árvores para uma região específica
 */
export async function loadRegionData(regionId: string): Promise<Region | null> {
  const region = CEARA_REGIONS.find(r => r.id === regionId)
  if (!region) return null

  if (LOADED_REGIONS.has(regionId)) {
    return region // Já carregada
  }

  try {
    const res = await apiConnect.getTreesInBounds(
      region.bounds.north,
      region.bounds.south,
      region.bounds.east,
      region.bounds.west,
      10000 // Limite por região (aumentado para suportar grandes volumes)
    )

    region.treeCount = (res.data || []).length
    region.loaded = true
    LOADED_REGIONS.add(regionId)

    return region
  } catch (err) {
    console.error(`Erro ao carregar região ${regionId}:`, err)
    return null
  }
}

/**
 * Encontra região que contém uma coordenada
 */
export function findRegionAtLocation(lat: number, lng: number): Region | null {
  // Procura do mais específico (district) para o mais geral (city)
  const districts = CEARA_REGIONS.filter(r => r.type === 'district')
  for (const region of districts) {
    if (isPointInBounds(lat, lng, region.bounds)) {
      return region
    }
  }

  const cities = CEARA_REGIONS.filter(r => r.type === 'city')
  for (const region of cities) {
    if (isPointInBounds(lat, lng, region.bounds)) {
      return region
    }
  }

  return null
}

/**
 * Encontra regiões filhas de uma região pai
 */
export function getChildRegions(parentId: string): Region[] {
  return CEARA_REGIONS.filter(r => r.parentId === parentId)
}

function isPointInBounds(
  lat: number,
  lng: number,
  bounds: { north: number, south: number, east: number, west: number }
): boolean {
  return lat <= bounds.north &&
         lat >= bounds.south &&
         lng <= bounds.east &&
         lng >= bounds.west
}

// ============================================================
// ESTRATÉGIA DE CARREGAMENTO INTELIGENTE
// ============================================================

export interface LoadStrategy {
  type: 'region' | 'tile' | 'radius'
  priority: number
}

/**
 * Decide a melhor estratégia baseado no zoom e visão atual
 */
export function decideLoadStrategy(
  zoom: number,
  bounds: { north: number, south: number, east: number, west: number }
): LoadStrategy {
  if (zoom <= 10) {
    // Zoom muito afastado: carrega por região (cidades)
    return { type: 'region', priority: 1 }
  } else if (zoom <= 14) {
    // Zoom médio: carrega por tiles
    return { type: 'tile', priority: 2 }
  } else {
    // Zoom próximo: carrega por raio + tiles detalhados
    return { type: 'radius', priority: 3 }
  }
}

// ============================================================
// FUNÇÕES DE UTILIDADE
// ============================================================

/**
 * Calcula o centro de uma lista de árvores
 */
export function calculateTreesCenter(trees: { latitude: number, longitude: number }[]): { lat: number, lng: number } | null {
  if (!trees || trees.length === 0) return null

  const sumLat = trees.reduce((sum, t) => sum + t.latitude, 0)
  const sumLng = trees.reduce((sum, t) => sum + t.longitude, 0)

  return {
    lat: sumLat / trees.length,
    lng: sumLng / trees.length
  }
}

/**
 * Estima a quantidade de tiles necessários para uma área
 */
export function estimateTileCount(
  bounds: { north: number, south: number, east: number, west: number },
  zoom: number
): number {
  const tiles = getVisibleTiles(bounds, zoom)
  return tiles.length
}

/**
 * Retorna estatísticas do cache
 */
export function getCacheStats(): { size: number, maxSize: number, hitRate: number } {
  return {
    size: TILE_CACHE.size,
    maxSize: MAX_CACHE_SIZE,
    hitRate: 0 // TODO: Implementar tracking de hits/misses
  }
}

/**
 * Limpa todo o cache
 */
export function clearCache(): void {
  TILE_CACHE.clear()
  LOADED_REGIONS.clear()
}
