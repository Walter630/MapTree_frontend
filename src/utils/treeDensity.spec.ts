import { describe, expect, it } from 'vitest'
import {
  buildTreeDensityCells,
  countTreesBySpecies,
  estimateCrownAreaM2,
  estimateTotalCrownAreaM2,
  getTreeDensityCategories,
  getTreeDensityHeatPoints,
  isValidGeoPoint,
  type TreeDensityInput,
} from './treeDensity'

const point = (overrides: Partial<TreeDensityInput> = {}): TreeDensityInput => ({
  latitude: -3.7319,
  longitude: -38.5267,
  speciesName: 'Oitizeiro',
  status: 'NORMAL',
  vigor: 'GOOD',
  nearPowerLine: false,
  ...overrides,
})

describe('treeDensity', () => {
  it('groups nearby trees and reports the most concentrated cell first', () => {
    const cells = buildTreeDensityCells(
      [
        point(),
        point({ latitude: -3.732, longitude: -38.5268 }),
        point({ latitude: -3.75, longitude: -38.55 }),
      ],
      'species',
    )

    expect(cells[0]?.count).toBe(2)
    expect(cells[0]?.label).toBe('Todas as categorias')
  })

  it('filters cells by the selected category', () => {
    const cells = buildTreeDensityCells(
      [point(), point({ latitude: -3.732, speciesName: 'Ipê' })],
      'species',
      250,
      'Ipê',
    )

    expect(cells).toHaveLength(1)
    expect(cells[0]?.label).toBe('Ipê')
  })

  it('uses the displayed species categories for heat points, including legacy names', () => {
    const trees = [
      point({ speciesName: '  Ipê-Amarelo  ' }),
      point({ latitude: -3.732, speciesName: 'Oiticica' }),
      point({ latitude: -3.733, speciesName: ' ' }),
      point({ latitude: 91, speciesName: 'Ipê-Amarelo' }),
    ]

    expect(getTreeDensityCategories(trees, 'species')).toContain('Ipê-Amarelo')
    expect(getTreeDensityHeatPoints(trees, 'species', 'Ipê-Amarelo')).toEqual([
      [-3.7319, -38.5267, 1],
    ])
    expect(getTreeDensityHeatPoints(trees, 'species', 'Espécie não identificada')).toEqual([
      [-3.733, -38.5267, 1],
    ])
    expect(getTreeDensityHeatPoints(trees, 'species', 'Mangueira')).toEqual([])
    expect(getTreeDensityHeatPoints(trees, 'species')).toHaveLength(3)
  })

  it('accepts zero latitude and longitude and rejects invalid coordinates', () => {
    expect(isValidGeoPoint(0, 0)).toBe(true)
    expect(isValidGeoPoint('', 0)).toBe(false)
    expect(isValidGeoPoint(91, 0)).toBe(false)
    const cells = buildTreeDensityCells(
      [
        point({ latitude: 0, longitude: 0 }),
        point({ latitude: Number.NaN, longitude: 0 }),
        point({ latitude: 91, longitude: 0 }),
      ],
      'status',
    )

    expect(cells).toHaveLength(1)
    expect(cells[0]?.count).toBe(1)
  })

  it('returns no cells for invalid cell size or no valid points', () => {
    expect(buildTreeDensityCells([point()], 'species', 0)).toEqual([])
    expect(buildTreeDensityCells([point({ latitude: Number.NaN })], 'species')).toEqual([])
  })

  it('lists distinct categories without duplication', () => {
    expect(
      getTreeDensityCategories([point(), point(), point({ speciesName: 'Ipê' })], 'species'),
    ).toEqual(['Ipê', 'Oitizeiro'])
  })

  it('sums nest quantity and averages estimated age and size for each cell', () => {
    const cells = buildTreeDensityCells(
      [
        point({ nestCount: 2, nestAgeYears: 1, averageNestSizeCm: 35 }),
        point({ latitude: -3.732, nestCount: 3, nestAgeYears: 3, averageNestSizeCm: 65 }),
        point({ latitude: -3.732, nestCount: 0 }),
      ],
      'nests',
    )

    expect(cells).toHaveLength(1)
    expect(cells[0]).toMatchObject({
      label: 'Ninhos',
      count: 5,
      treeCount: 2,
      averageNestAgeYears: 2,
      averageNestSizeCm: 50,
    })
  })

  it('counts tree species and sorts the most frequent species first', () => {
    expect(
      countTreesBySpecies([
        point({ speciesName: 'Ipê' }),
        point({ speciesName: 'Oitizeiro' }),
        point({ speciesName: 'Ipê' }),
      ]),
    ).toEqual([
      { name: 'Ipê', count: 2 },
      { name: 'Oitizeiro', count: 1 },
    ])
  })

  it('estimates crown projection from measured width and excludes missing measurements', () => {
    const trees = [
      point({ canopyWidthMeters: 4 }),
      point({ latitude: -3.732, canopyWidthMeters: 2 }),
      point(),
    ]
    const result = estimateTotalCrownAreaM2(trees)

    expect(result.measuredTrees).toBe(2)
    expect(result.areaM2).toBeCloseTo(estimateCrownAreaM2(4) + estimateCrownAreaM2(2))
    const hottestCanopyCell = buildTreeDensityCells(trees, 'canopy')[0]
    expect(hottestCanopyCell?.treeCount).toBe(2)
    expect(hottestCanopyCell?.count).toBeCloseTo(estimateCrownAreaM2(4) + estimateCrownAreaM2(2))
  })
})
