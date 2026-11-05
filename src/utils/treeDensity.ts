export type TreeDensityDimension = 'species' | 'status' | 'vigor' | 'proximity' | 'nests' | 'canopy'

export interface TreeDensityInput {
  latitude: number
  longitude: number
  speciesName?: string
  status?: string
  vigor?: string
  nearPowerLine?: boolean
  nestCount?: number | null
  nestAgeYears?: number | null
  averageNestSizeCm?: number | null
  canopyWidthMeters?: number | null
}

export interface TreeDensityCell {
  key: string
  label: string
  count: number
  south: number
  west: number
  north: number
  east: number
  treeCount?: number
  averageNestAgeYears?: number
  averageNestSizeCm?: number
}

const METERS_PER_DEGREE = 111_320

export function isValidGeoPoint(latitude: unknown, longitude: unknown): latitude is number {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return false
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  )
}

function categoryFor(tree: TreeDensityInput, dimension: TreeDensityDimension): string {
  switch (dimension) {
    case 'species':
      return tree.speciesName?.trim() || 'Espécie não identificada'
    case 'status':
      return tree.status?.trim() || 'Sem status'
    case 'vigor':
      return tree.vigor?.trim() || 'Sem vigor informado'
    case 'proximity':
      return tree.nearPowerLine ? 'Indicador de risco ativo' : 'Sem alerta atual'
    case 'nests':
      return Number.isFinite(tree.nestCount) && Number(tree.nestCount) > 0
        ? 'Com ninhos'
        : 'Sem ninhos registrados'
    case 'canopy':
      return Number.isFinite(tree.canopyWidthMeters) && Number(tree.canopyWidthMeters) > 0
        ? 'Copa medida'
        : 'Sem medição de copa'
  }
}

export function estimateCrownAreaM2(canopyWidthMeters: number): number {
  return Math.PI * (canopyWidthMeters / 2) ** 2
}

export function buildTreeDensityCells(
  trees: readonly TreeDensityInput[],
  dimension: TreeDensityDimension,
  cellSizeMeters = 250,
  selectedCategory = 'all',
): TreeDensityCell[] {
  if (!Number.isFinite(cellSizeMeters) || cellSizeMeters <= 0 || trees.length === 0) return []

  let latitudeSum = 0
  let validCount = 0
  for (const tree of trees) {
    if (
      isValidGeoPoint(tree.latitude, tree.longitude) &&
      (dimension !== 'nests' || (Number.isFinite(tree.nestCount) && Number(tree.nestCount) > 0)) &&
      (dimension !== 'canopy' ||
        (Number.isFinite(tree.canopyWidthMeters) && Number(tree.canopyWidthMeters) > 0))
    ) {
      latitudeSum += tree.latitude
      validCount++
    }
  }
  if (validCount === 0) return []

  const referenceLatitude = latitudeSum / validCount
  const metersPerLongitudeDegree =
    METERS_PER_DEGREE * Math.max(0.01, Math.cos((referenceLatitude * Math.PI) / 180))
  const bins = new Map<
    string,
    {
      count: number
      category: string
      x: number
      y: number
      treeCount: number
      ageSum: number
      ageSamples: number
      sizeSum: number
      sizeSamples: number
    }
  >()

  for (const tree of trees) {
    const { latitude, longitude } = tree
    if (!isValidGeoPoint(latitude, longitude)) continue
    const category = categoryFor(tree, dimension)
    if (selectedCategory !== 'all' && category !== selectedCategory) continue
    if (dimension === 'nests' && (!Number.isFinite(tree.nestCount) || Number(tree.nestCount) <= 0))
      continue
    if (
      dimension === 'canopy' &&
      (!Number.isFinite(tree.canopyWidthMeters) || Number(tree.canopyWidthMeters) <= 0)
    )
      continue

    const x = Math.floor((longitude * metersPerLongitudeDegree) / cellSizeMeters)
    const y = Math.floor((latitude * METERS_PER_DEGREE) / cellSizeMeters)
    const key = `${x}:${y}`
    const bin = bins.get(key)
    if (bin) {
      bin.count +=
        dimension === 'nests'
          ? Number(tree.nestCount)
          : dimension === 'canopy'
            ? estimateCrownAreaM2(Number(tree.canopyWidthMeters))
            : 1
      bin.treeCount++
      if (dimension === 'nests' && Number.isFinite(tree.nestAgeYears)) {
        bin.ageSum += Number(tree.nestAgeYears)
        bin.ageSamples++
      }
      if (dimension === 'nests' && Number.isFinite(tree.averageNestSizeCm)) {
        bin.sizeSum += Number(tree.averageNestSizeCm)
        bin.sizeSamples++
      }
    } else
      bins.set(key, {
        count:
          dimension === 'nests'
            ? Number(tree.nestCount)
            : dimension === 'canopy'
              ? estimateCrownAreaM2(Number(tree.canopyWidthMeters))
              : 1,
        category:
          dimension === 'nests'
            ? 'Ninhos'
            : dimension === 'canopy'
              ? 'Área de copa estimada'
              : selectedCategory === 'all'
                ? 'Todas as categorias'
                : category,
        x,
        y,
        treeCount: 1,
        ageSum:
          dimension === 'nests' && Number.isFinite(tree.nestAgeYears)
            ? Number(tree.nestAgeYears)
            : 0,
        ageSamples: dimension === 'nests' && Number.isFinite(tree.nestAgeYears) ? 1 : 0,
        sizeSum:
          dimension === 'nests' && Number.isFinite(tree.averageNestSizeCm)
            ? Number(tree.averageNestSizeCm)
            : 0,
        sizeSamples: dimension === 'nests' && Number.isFinite(tree.averageNestSizeCm) ? 1 : 0,
      })
  }

  const cells = Array.from(bins, ([key, bin]) => {
    const westMeters = bin.x * cellSizeMeters
    const southMeters = bin.y * cellSizeMeters
    return {
      key,
      label: bin.category,
      count: bin.count,
      south: southMeters / METERS_PER_DEGREE,
      west: westMeters / metersPerLongitudeDegree,
      north: (southMeters + cellSizeMeters) / METERS_PER_DEGREE,
      east: (westMeters + cellSizeMeters) / metersPerLongitudeDegree,
      ...(dimension === 'nests' || dimension === 'canopy'
        ? {
            treeCount: bin.treeCount,
            ...(dimension === 'nests' && bin.ageSamples
              ? { averageNestAgeYears: bin.ageSum / bin.ageSamples }
              : {}),
            ...(dimension === 'nests' && bin.sizeSamples
              ? { averageNestSizeCm: bin.sizeSum / bin.sizeSamples }
              : {}),
          }
        : {}),
    }
  })

  return cells.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

export function getTreeDensityCategories(
  trees: readonly TreeDensityInput[],
  dimension: TreeDensityDimension,
): string[] {
  return [
    ...new Set(
      trees
        .filter((tree) => isValidGeoPoint(tree.latitude, tree.longitude))
        .filter(
          (tree) =>
            dimension !== 'nests' ||
            (Number.isFinite(tree.nestCount) && Number(tree.nestCount) > 0),
        )
        .filter(
          (tree) =>
            dimension !== 'canopy' ||
            (Number.isFinite(tree.canopyWidthMeters) && Number(tree.canopyWidthMeters) > 0),
        )
        .map((tree) => categoryFor(tree, dimension)),
    ),
  ].sort((a, b) => a.localeCompare(b))
}

export function countTreesBySpecies(
  trees: readonly TreeDensityInput[],
): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>()
  for (const tree of trees) {
    const name = tree.speciesName?.trim() || 'Espécie não identificada'
    counts.set(name, (counts.get(name) || 0) + 1)
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

export function estimateTotalCrownAreaM2(trees: readonly TreeDensityInput[]): {
  areaM2: number
  measuredTrees: number
} {
  let areaM2 = 0
  let measuredTrees = 0
  for (const tree of trees) {
    const width = tree.canopyWidthMeters
    if (!Number.isFinite(width) || Number(width) <= 0) continue
    areaM2 += estimateCrownAreaM2(Number(width))
    measuredTrees++
  }
  return { areaM2, measuredTrees }
}
