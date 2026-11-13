import { isValidGeoPoint } from '@/utils/treeDensity'

export interface TreeMapPoint {
  latitude: number
  longitude: number
}

export function uniqueTreeMapPoints<T extends TreeMapPoint & { id: string }>(
  points: readonly T[],
): T[] {
  const seenIds = new Set<string>()
  return points.filter((point) => {
    if (seenIds.has(point.id)) return false
    seenIds.add(point.id)
    return true
  })
}

const EARTH_RADIUS_KM = 6371

function distanceKm(a: TreeMapPoint, b: TreeMapPoint): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180
  const latDelta = toRadians(b.latitude - a.latitude)
  const lngDelta = toRadians(b.longitude - a.longitude)
  const latA = toRadians(a.latitude)
  const latB = toRadians(b.latitude)
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(lngDelta / 2) ** 2

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(haversine))
}

/**
 * Picks the densest nearby group for the first map viewport. This keeps a
 * single bad or distant coordinate from pulling a local inventory off-screen.
 * All points remain in the map data and can still be found through search.
 */
export function getDensestTreeMapCluster<T extends TreeMapPoint>(
  points: readonly T[],
  radiusKm = 75,
): T[] {
  const validPoints = points.filter((point) => isValidGeoPoint(point.latitude, point.longitude))
  if (validPoints.length <= 1) return validPoints

  let densestCluster: T[] = []

  for (const center of validPoints) {
    const cluster = validPoints.filter((point) => distanceKm(center, point) <= radiusKm)
    if (cluster.length > densestCluster.length) densestCluster = cluster
  }

  return densestCluster.length ? densestCluster : [validPoints[0]!]
}
