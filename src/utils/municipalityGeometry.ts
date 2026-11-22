export type MunicipalityPosition = readonly [longitude: number, latitude: number]
export type MunicipalityLinearRing = readonly MunicipalityPosition[]
export type MunicipalityPolygonCoordinates = readonly MunicipalityLinearRing[]
export type MunicipalityMultiPolygonCoordinates = readonly MunicipalityPolygonCoordinates[]

export type MunicipalityGeometry =
  | { type: 'Polygon'; coordinates: MunicipalityPolygonCoordinates }
  | { type: 'MultiPolygon'; coordinates: MunicipalityMultiPolygonCoordinates }

const EPSILON = 1e-10

function isPosition(value: unknown): value is MunicipalityPosition {
  if (!Array.isArray(value) || value.length < 2) return false
  const [longitude, latitude] = value
  return (
    typeof longitude === 'number' &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    typeof latitude === 'number' &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90
  )
}

function isLinearRing(value: unknown): value is MunicipalityLinearRing {
  if (!Array.isArray(value) || value.length < 4 || !value.every(isPosition)) return false
  const first = value[0]
  const last = value[value.length - 1]
  return Boolean(first && last && first[0] === last[0] && first[1] === last[1])
}

function isPolygonCoordinates(value: unknown): value is MunicipalityPolygonCoordinates {
  return Array.isArray(value) && value.length > 0 && value.every(isLinearRing)
}

function isMultiPolygonCoordinates(value: unknown): value is MunicipalityMultiPolygonCoordinates {
  return Array.isArray(value) && value.length > 0 && value.every(isPolygonCoordinates)
}

export function isMunicipalityGeometry(value: unknown): value is MunicipalityGeometry {
  if (!value || typeof value !== 'object') return false
  const geometry = value as Record<string, unknown>
  if (geometry.type === 'Polygon') return isPolygonCoordinates(geometry.coordinates)
  if (geometry.type === 'MultiPolygon') return isMultiPolygonCoordinates(geometry.coordinates)
  return false
}

function pointOnSegment(
  point: MunicipalityPosition,
  start: MunicipalityPosition,
  end: MunicipalityPosition,
): boolean {
  const segmentLengthSquared = (end[0] - start[0]) ** 2 + (end[1] - start[1]) ** 2
  if (segmentLengthSquared <= EPSILON) {
    return Math.abs(point[0] - start[0]) <= EPSILON && Math.abs(point[1] - start[1]) <= EPSILON
  }

  const cross =
    (point[1] - start[1]) * (end[0] - start[0]) -
    (point[0] - start[0]) * (end[1] - start[1])
  if (Math.abs(cross) > EPSILON) return false

  const dot =
    (point[0] - start[0]) * (end[0] - start[0]) +
    (point[1] - start[1]) * (end[1] - start[1])
  if (dot < -EPSILON) return false

  return dot <= segmentLengthSquared + EPSILON
}

function ringContains(point: MunicipalityPosition, ring: MunicipalityLinearRing): boolean {
  let inside = false

  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const start = ring[index]!
    const end = ring[previous]!
    if (pointOnSegment(point, start, end)) return true

    const crossesLatitude = (start[1] > point[1]) !== (end[1] > point[1])
    if (
      crossesLatitude &&
      point[0] <
        ((end[0] - start[0]) * (point[1] - start[1])) / (end[1] - start[1]) + start[0]
    ) {
      inside = !inside
    }
  }

  return inside
}

function polygonContains(point: MunicipalityPosition, polygon: MunicipalityPolygonCoordinates) {
  const [outer, ...holes] = polygon
  if (!outer || !ringContains(point, outer)) return false
  return !holes.some((hole) => ringContains(point, hole))
}

export function createMunicipalityPointValidator(value: unknown): (longitude: number, latitude: number) => boolean {
  if (!isMunicipalityGeometry(value)) return () => false
  const polygons = value.type === 'Polygon' ? [value.coordinates] : value.coordinates

  return (longitude, latitude) => {
    if (
      !Number.isFinite(longitude) ||
      !Number.isFinite(latitude) ||
      longitude < -180 ||
      longitude > 180 ||
      latitude < -90 ||
      latitude > 90
    ) {
      return false
    }

    const point: MunicipalityPosition = [longitude, latitude]
    return polygons.some((polygon) => polygonContains(point, polygon))
  }
}

export function isPointInsideMunicipality(
  longitude: number,
  latitude: number,
  geometry: unknown,
): boolean {
  return createMunicipalityPointValidator(geometry)(longitude, latitude)
}
