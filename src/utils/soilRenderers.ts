/**
 * Soil Renderers - Alternativas de Visualização de Solo
 * 
 * Opções disponíveis:
 * 1. HEATMAP - Mapa de calor interpolado (melhor para grandes áreas)
 * 2. GRID - Grid/Quadriculado colorido (balanceado)
 * 3. POLYGONS - Polígonos delimitados (preciso se tiver geometria)
 * 4. CIRCLES - Círculos com raio (atual, simples)
 * 5. DOTS - Pontos simples (mais leve)
 */

import * as L from 'leaflet'
import { getSoilInfo } from './soilData'

// ============================================================
// TIPOS
// ============================================================

export type SoilRenderMode = 'heatmap' | 'grid' | 'polygons' | 'circles' | 'dots'

export interface SoilPoint {
  lat: number
  lng: number
  soilType?: string
  soilQuality?: string
  value?: number // 0-1 para heatmap
}

export interface RenderOptions {
  mode?: SoilRenderMode
  opacity?: number
  interactive?: boolean
  showLabels?: boolean
}

// ============================================================
// RENDERIZADOR 1: HEATMAP (Mapa de Calor Interpolado)
// ============================================================

/**
 * Renderiza solo como heatmap usando interpolação de cores
 * Requer Leaflet.heat ou implementação customizada com Canvas
 */
export function renderSoilHeatmap(
  map: L.Map,
  container: L.LayerGroup,
  points: SoilPoint[],
  options: { opacity?: number } = {}
): void {
  container.clearLayers()

  const opacity = options.opacity ?? 0.6

  // Cria um layer de canvas customizado
  const canvasLayer = L.GridLayer.extend({
    createTile: function(coords: any) {
      const tile = document.createElement('canvas')
      const tileSize = this.getTileSize()
      tile.setAttribute('width', String(tileSize.x))
      tile.setAttribute('height', String(tileSize.y))

      const ctx = tile.getContext('2d')
      if (!ctx) return tile

      // Calcula bounds deste tile
      const tileBounds = getTileBounds(coords, this._map.getZoom())

      // Desenha interpolação de cores
      drawHeatmapInterpolation(ctx, tileSize.x, tileSize.y, points, tileBounds, opacity)

      return tile
    }
  })

  // @ts-ignore
  const layer = new canvasLayer({
    opacity: opacity,
    zIndex: 100
  })

  container.addLayer(layer)
}

/**
 * Desenha interpolação IDW (Inverse Distance Weighting)
 */
function drawHeatmapInterpolation(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  points: SoilPoint[],
  tileBounds: { north: number, south: number, east: number, west: number },
  opacity: number
): void {
  const imageData = ctx.createImageData(width, height)
  const data = imageData.data

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Converte pixel para coordenadas geo
      const lat = tileBounds.north - (y / height) * (tileBounds.north - tileBounds.south)
      const lng = tileBounds.west + (x / width) * (tileBounds.east - tileBounds.west)

      // Interpola valor baseado na distância aos pontos
      const value = interpolateValue(lat, lng, points)

      // Converte valor para cor
      const color = valueToColor(value)

      const idx = (y * width + x) * 4
      data[idx] = color.r     // R
      data[idx + 1] = color.g // G
      data[idx + 2] = color.b // B
      data[idx + 3] = Math.floor(255 * opacity * color.a) // A
    }
  }

  ctx.putImageData(imageData, 0, 0)
}

function interpolateValue(lat: number, lng: number, points: SoilPoint[]): number {
  if (points.length === 0) return 0.5

  let weightedSum = 0
  let weightSum = 0
  const power = 2 // IDW power

  for (const point of points) {
    const distance = Math.sqrt(
      Math.pow(lat - point.lat, 2) + Math.pow(lng - point.lng, 2)
    )

    if (distance < 0.0001) {
      return point.value ?? getSoilQualityValue(point.soilQuality)
    }

    const weight = 1 / Math.pow(distance * 1000, power)
    const value = point.value ?? getSoilQualityValue(point.soilQuality)

    weightedSum += weight * value
    weightSum += weight
  }

  return weightSum > 0 ? weightedSum / weightSum : 0.5
}

function getSoilQualityValue(quality?: string): number {
  switch (quality?.toUpperCase()) {
    case 'EXCELLENT': return 0.9
    case 'GOOD': return 0.7
    case 'REGULAR': return 0.5
    case 'POOR': return 0.3
    case 'BAD': return 0.1
    default: return 0.5
  }
}

function valueToColor(value: number): { r: number, g: number, b: number, a: number } {
  // Escala: 0 = vermelho ruim, 0.5 = amarelo regular, 1 = verde bom
  if (value < 0.33) {
    // Vermelho a laranja
    return { r: 231, g: 76, b: 60, a: 0.8 }
  } else if (value < 0.66) {
    // Amarelo
    return { r: 241, g: 196, b: 15, a: 0.7 }
  } else {
    // Verde
    return { r: 46, g: 204, b: 113, a: 0.6 }
  }
}

function getTileBounds(coords: { x: number, y: number, z: number }, zoom: number) {
  const n = Math.pow(2, zoom)
  const west = coords.x / n * 360 - 180
  const east = (coords.x + 1) / n * 360 - 180

  const lat1 = tile2lat(coords.y, n)
  const lat2 = tile2lat(coords.y + 1, n)

  return {
    north: lat1,
    south: lat2,
    east,
    west
  }
}

function tile2lat(y: number, n: number): number {
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)))
  return latRad * 180 / Math.PI
}

// ============================================================
// RENDERIZADOR 2: GRID (Quadriculado)
// ============================================================

/**
 * Renderiza solo como grid de células coloridas
 * Mais organizado que círculos sobrepostos
 */
export function renderSoilGrid(
  map: L.Map,
  container: L.LayerGroup,
  points: SoilPoint[],
  options: { cellSizeMeters?: number, opacity?: number } = {}
): void {
  container.clearLayers()

  const cellSize = options.cellSizeMeters ?? 300
  const opacity = options.opacity ?? 0.25

  // Agrupa pontos por célula do grid
  const gridCells = new Map<string, { points: SoilPoint[], center: { lat: number, lng: number } }>()

  for (const point of points) {
    const cellKey = getGridCellKey(point.lat, point.lng, cellSize)

    if (!gridCells.has(cellKey)) {
      gridCells.set(cellKey, {
        points: [],
        center: getCellCenter(point.lat, point.lng, cellSize)
      })
    }

    gridCells.get(cellKey)!.points.push(point)
  }

  // Renderiza cada célula como um retângulo
  for (const [key, cell] of gridCells) {
    const dominantSoil = getDominantSoilType(cell.points)
    const info = getSoilInfo(dominantSoil)

    // Célula como polígono retangular
    const cellBounds = getCellBounds(cell.center, cellSize)
    const polygon = L.rectangle(cellBounds, {
      color: info.color,
      fillColor: info.color,
      fillOpacity: opacity,
      weight: 1,
      opacity: 0.8,
      dashArray: '2, 4',
      interactive: false
    })

    container.addLayer(polygon)

    // Marcador central com tooltip
    const marker = L.circleMarker(cell.center, {
      radius: 4,
      color: '#fff',
      fillColor: info.color,
      fillOpacity: 1,
      weight: 1
    })

    marker.bindTooltip(info.name, {
      permanent: false,
      direction: 'top',
      className: 'soil-tooltip'
    })

    container.addLayer(marker)
  }
}

function getGridCellKey(lat: number, lng: number, cellSizeMeters: number): string {
  // Aproximadamente 111km por grau de latitude
  const latFactor = cellSizeMeters / 111000
  const lngFactor = cellSizeMeters / (111000 * Math.cos(lat * Math.PI / 180))

  const cellX = Math.floor(lng / lngFactor)
  const cellY = Math.floor(lat / latFactor)

  return `${cellX}_${cellY}`
}

function getCellCenter(lat: number, lng: number, cellSizeMeters: number): { lat: number, lng: number } {
  const latFactor = cellSizeMeters / 111000
  const lngFactor = cellSizeMeters / (111000 * Math.cos(lat * Math.PI / 180))

  const cellX = Math.floor(lng / lngFactor)
  const cellY = Math.floor(lat / latFactor)

  return {
    lat: (cellY + 0.5) * latFactor,
    lng: (cellX + 0.5) * lngFactor
  }
}

function getCellBounds(center: { lat: number, lng: number }, cellSizeMeters: number): L.LatLngBounds {
  const latDelta = (cellSizeMeters / 111000) / 2
  const lngDelta = (cellSizeMeters / (111000 * Math.cos(center.lat * Math.PI / 180))) / 2

  return L.latLngBounds(
    [center.lat - latDelta, center.lng - lngDelta],
    [center.lat + latDelta, center.lng + lngDelta]
  )
}

function getDominantSoilType(points: SoilPoint[]): string {
  const counts = new Map<string, number>()

  for (const p of points) {
    const type = p.soilType || p.soilQuality || 'UNKNOWN'
    counts.set(type, (counts.get(type) || 0) + 1)
  }

  let maxType = 'UNKNOWN'
  let maxCount = 0

  for (const [type, count] of counts) {
    if (count > maxCount) {
      maxCount = count
      maxType = type
    }
  }

  return maxType
}

// ============================================================
// RENDERIZADOR 3: POLYGONS (Áreas Delimitadas)
// ============================================================

/**
 * Renderiza solo como polígonos delimitados
 * Requer dados de geometria (fronteiras de cada tipo de solo)
 * Fallback para círculos se não tiver geometria
 */
export function renderSoilPolygons(
  map: L.Map,
  container: L.LayerGroup,
  soilAreas: Array<{
    type: string
    geometry: L.LatLngExpression[]
    center: { lat: number, lng: number }
  }>,
  options: { opacity?: number } = {}
): void {
  container.clearLayers()

  const opacity = options.opacity ?? 0.2

  for (const area of soilAreas) {
    const info = getSoilInfo(area.type)

    // Polígono da área de solo
    const polygon = L.polygon(area.geometry as L.LatLngExpression[], {
      color: info.color,
      fillColor: info.color,
      fillOpacity: opacity,
      weight: 2,
      opacity: 0.9,
      smoothFactor: 1,
      interactive: true
    })

    polygon.bindPopup(`
      <div style="text-align:center; min-width:150px;">
        <div style="font-weight:700; color:${info.color}; font-size:14px;">${info.name}</div>
        <div style="font-size:11px; color:#666; margin-top:4px;">${info.description}</div>
      </div>
    `)

    container.addLayer(polygon)

    // Marcador no centro
    const centerMarker = L.circleMarker(area.center, {
      radius: 6,
      color: '#fff',
      fillColor: info.color,
      fillOpacity: 0.9,
      weight: 2
    })

    centerMarker.bindTooltip(info.name, {
      permanent: false,
      direction: 'top'
    })

    container.addLayer(centerMarker)
  }
}

// ============================================================
// RENDERIZADOR 4: DOTS (Pontos Simples - Mais Leve)
// ============================================================

/**
 * Renderiza solo como pontos simples
 * Opção mais leve para dispositivos móveis
 */
export function renderSoilDots(
  map: L.Map,
  container: L.LayerGroup,
  points: SoilPoint[],
  options: { radius?: number, opacity?: number } = {}
): void {
  container.clearLayers()

  const radius = options.radius ?? 4
  const opacity = options.opacity ?? 0.8

  // Usa Canvas para melhor performance
  const canvasLayer = L.canvas({ padding: 0.5 })

  for (const point of points) {
    const info = getSoilInfo(point.soilType || point.soilQuality || 'UNKNOWN')

    const dot = L.circleMarker([point.lat, point.lng], {
      radius: radius,
      color: info.color,
      fillColor: info.color,
      fillOpacity: opacity,
      weight: 0,
      renderer: canvasLayer
    })

    dot.bindTooltip(info.name, {
      permanent: false,
      direction: 'top'
    })

    container.addLayer(dot)
  }
}

// ============================================================
// RENDERIZADOR 5: CIRCLES (Círculos com Raio - Atual)
// ============================================================

/**
 * Renderiza solo como círculos com raio
 * Versão atual, otimizada com Canvas
 */
export function renderSoilCircles(
  map: L.Map,
  container: L.LayerGroup,
  points: SoilPoint[],
  options: { radius?: number, fillOpacity?: number } = {}
): void {
  container.clearLayers()

  const radius = options.radius ?? 600
  const fillOpacity = options.fillOpacity ?? 0.12

  const canvasLayer = L.canvas({ padding: 0.5 })

  for (const point of points) {
    const info = getSoilInfo(point.soilType || point.soilQuality || 'UNKNOWN')

    // Área circular
    const circle = L.circle([point.lat, point.lng], {
      radius: radius,
      color: info.color,
      fillColor: info.color,
      fillOpacity: fillOpacity,
      weight: 1,
      dashArray: '5, 5',
      interactive: false,
      renderer: canvasLayer
    })

    container.addLayer(circle)

    // Centro
    const center = L.circleMarker([point.lat, point.lng], {
      radius: 5,
      color: '#fff',
      fillColor: info.color,
      fillOpacity: 1,
      weight: 2,
      renderer: canvasLayer
    })

    center.bindPopup(`
      <div class="soil-intelligence-card text-center">
        <div class="pa-3">
          <div class="text-overline font-weight-bold" style="color: ${info.color}">${info.name}</div>
          <div class="text-body-2 mb-2">${info.description}</div>
          <v-chip size="x-small" color="brown-darken-1" variant="flat">${info.growthImpact}</v-chip>
        </div>
      </div>
    `, { maxWidth: 240, className: 'soil-glass-popup' })

    container.addLayer(center)
  }
}

// ============================================================
// FUNÇÃO PRINCIPAL DE RENDERIZAÇÃO
// ============================================================

/**
 * Renderiza a camada de solo usando o modo especificado
 */
export function renderSoilLayer(
  map: L.Map,
  container: L.LayerGroup,
  points: SoilPoint[],
  mode: SoilRenderMode,
  options: RenderOptions
): void {
  switch (mode) {
    case 'heatmap':
      renderSoilHeatmap(map, container, points, { opacity: options.opacity })
      break
    case 'grid':
      renderSoilGrid(map, container, points, { opacity: options.opacity })
      break
    case 'circles':
      renderSoilCircles(map, container, points, { fillOpacity: options.opacity })
      break
    case 'dots':
      renderSoilDots(map, container, points, { opacity: options.opacity })
      break
    case 'polygons':
      // Requer dados de geometria - fallback para círculos se não tiver
      if ((points as any).geometries) {
        renderSoilPolygons(map, container, points as any, { opacity: options.opacity })
      } else {
        console.warn('Dados de geometria não disponíveis para polígonos. Usando círculos.')
        renderSoilCircles(map, container, points, { fillOpacity: options.opacity })
      }
      break
    default:
      renderSoilCircles(map, container, points, { fillOpacity: options.opacity })
  }
}

// ============================================================
// CONFIGURAÇÕES RECOMENDADAS POR CENÁRIO
// ============================================================

export const SOIL_RENDER_PRESETS = {
  /** Performance máxima, visualização mínima */
  minimal: {
    mode: 'dots' as SoilRenderMode,
    radius: 3,
    opacity: 0.7
  },
  /** Balanceado para mobile */
  mobile: {
    mode: 'dots' as SoilRenderMode,
    radius: 4,
    opacity: 0.8
  },
  /** Padrão para desktop */
  desktop: {
    mode: 'circles' as SoilRenderMode,
    radius: 600,
    opacity: 0.12
  },
  /** Visualização de padrões regionais */
  regional: {
    mode: 'grid' as SoilRenderMode,
    cellSizeMeters: 400,
    opacity: 0.25
  },
  /** Análise de qualidade interpolada */
  analysis: {
    mode: 'heatmap' as SoilRenderMode,
    opacity: 0.6
  }
}
