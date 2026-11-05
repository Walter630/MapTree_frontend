import type { PrioritizedTree, TreePriorityInput } from '@/utils/treePriority'

export const MAX_SUGGESTED_ROUTE_RADIUS_KM = 30

function coordinatesFor(tree: TreePriorityInput): [number, number] | null {
  const rawLatitude = tree.latitude ?? tree.lat
  const rawLongitude = tree.longitude ?? tree.lng
  if (
    rawLatitude === null ||
    rawLatitude === undefined ||
    rawLongitude === null ||
    rawLongitude === undefined
  ) {
    return null
  }

  const latitude = Number(rawLatitude)
  const longitude = Number(rawLongitude)
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return null
  }

  return [latitude, longitude]
}

export function coordinateDistanceKm(first: TreePriorityInput, second: TreePriorityInput): number {
  const firstCoordinates = coordinatesFor(first)
  const secondCoordinates = coordinatesFor(second)
  if (!firstCoordinates || !secondCoordinates) return Number.POSITIVE_INFINITY

  const [lat1, lng1] = firstCoordinates
  const [lat2, lng2] = secondCoordinates
  const radians = Math.PI / 180
  const deltaLatitude = (lat2 - lat1) * radians
  const deltaLongitude = (lng2 - lng1) * radians
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(lat1 * radians) * Math.cos(lat2 * radians) * Math.sin(deltaLongitude / 2) ** 2

  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

function routeBlock(tree: TreePriorityInput): string {
  const coordinates = coordinatesFor(tree)
  if (!coordinates) return ''
  const [latitude, longitude] = coordinates
  return `${Math.floor(latitude / 0.0012)}:${Math.floor(longitude / 0.0012)}`
}

/** Orders a route by urgency and proximity, optionally keeping every stop near its first stop. */
export function groupRoute<T extends TreePriorityInput>(
  items: PrioritizedTree<T>[],
  limit = 20,
  maxRadiusKm = Number.POSITIVE_INFINITY,
): PrioritizedTree<T>[] {
  if (limit <= 0 || items.length === 0) return []

  let candidates = items
  if (Number.isFinite(maxRadiusKm)) {
    candidates = items.filter(({ tree }) => coordinatesFor(tree) !== null)
    const anchor = candidates[0]?.tree
    if (!anchor) return []
    candidates = candidates.filter(({ tree }) => coordinateDistanceKm(anchor, tree) <= maxRadiusKm)
  }

  const remaining = [...candidates]
  const ordered: PrioritizedTree<T>[] = []
  let current = remaining.shift()

  while (current && ordered.length < limit) {
    ordered.push(current)
    if (!remaining.length) break

    const currentBlock = routeBlock(current.tree)
    let bestIndex = 0
    let bestScore = Number.NEGATIVE_INFINITY

    remaining.forEach((candidate, index) => {
      const candidateBlock = routeBlock(candidate.tree)
      const sameBlockBonus = currentBlock && candidateBlock === currentBlock ? 120 : 0
      const proximityPenalty = coordinateDistanceKm(current!.tree, candidate.tree) * 24
      const candidateScore = candidate.priorityScore * 1.8 + sameBlockBonus - proximityPenalty
      if (candidateScore > bestScore) {
        bestScore = candidateScore
        bestIndex = index
      }
    })

    current = remaining.splice(bestIndex, 1)[0]
  }

  return ordered
}
