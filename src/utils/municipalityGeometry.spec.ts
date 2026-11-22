import { describe, expect, it } from 'vitest'
import { isMunicipalityGeometry, isPointInsideMunicipality } from './municipalityGeometry'

const polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [-39, -4],
      [-38, -4],
      [-38, -3],
      [-39, -3],
      [-39, -4],
    ],
    [
      [-38.7, -3.8],
      [-38.3, -3.8],
      [-38.3, -3.4],
      [-38.7, -3.4],
      [-38.7, -3.8],
    ],
  ],
} as const

describe('municipalityGeometry', () => {
  it('validates points inside a polygon and on its outer border', () => {
    expect(isMunicipalityGeometry(polygon)).toBe(true)
    expect(isPointInsideMunicipality(-38.9, -3.9, polygon)).toBe(true)
    expect(isPointInsideMunicipality(-39, -3.5, polygon)).toBe(true)
  })

  it('rejects points outside the polygon, inside a hole, and invalid coordinates', () => {
    expect(isPointInsideMunicipality(-39.1, -3.5, polygon)).toBe(false)
    expect(isPointInsideMunicipality(-38.5, -3.6, polygon)).toBe(false)
    expect(isPointInsideMunicipality(Number.NaN, -3.6, polygon)).toBe(false)
  })

  it('accepts a point in any polygon of a multipolygon', () => {
    const multipolygon = {
      type: 'MultiPolygon',
      coordinates: [
        [[[-39, -4], [-38, -4], [-38, -3], [-39, -3], [-39, -4]]],
        [[[-37, -4], [-36, -4], [-36, -3], [-37, -3], [-37, -4]]],
      ],
    }

    expect(isPointInsideMunicipality(-36.5, -3.5, multipolygon)).toBe(true)
    expect(isPointInsideMunicipality(-37.5, -3.5, multipolygon)).toBe(false)
  })
})
