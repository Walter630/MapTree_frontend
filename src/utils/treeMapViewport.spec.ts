import { describe, expect, it } from 'vitest'
import { getDensestTreeMapCluster, uniqueTreeMapPoints } from './treeMapViewport'

describe('uniqueTreeMapPoints', () => {
  it('deduplicates by stable tree id while keeping distinct trees at the same location', () => {
    const first = { id: 'same-id', latitude: -3.73, longitude: -38.52 }
    const duplicate = { ...first }
    const distinct = { ...first, id: 'different-id' }

    expect(uniqueTreeMapPoints([first, duplicate, distinct])).toEqual([first, distinct])
  })
})

describe('getDensestTreeMapCluster', () => {
  it('keeps a distant outlier from pulling a local inventory out of view', () => {
    const localTrees = [
      { id: '1', latitude: -3.73, longitude: -38.52 },
      { id: '2', latitude: -3.74, longitude: -38.53 },
      { id: '3', latitude: -3.72, longitude: -38.51 },
    ]
    const outlier = { id: '4', latitude: -2, longitude: -23 }

    expect(getDensestTreeMapCluster([...localTrees, outlier]).map((tree) => tree.id)).toEqual([
      '1',
      '2',
      '3',
    ])
  })

  it('returns valid points when there is no second point to cluster', () => {
    const onlyTree = { id: '1', latitude: -3.73, longitude: -38.52 }

    expect(getDensestTreeMapCluster([onlyTree])).toEqual([onlyTree])
    expect(getDensestTreeMapCluster([{ id: 'bad', latitude: 91, longitude: 0 }])).toEqual([])
  })
})
