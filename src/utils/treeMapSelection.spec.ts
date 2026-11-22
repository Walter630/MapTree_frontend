import { describe, expect, it } from 'vitest'
import { selectTreeMapTrees } from './treeMapSelection'

const inventory = [
  { id: 'critical', latitude: -3.7, longitude: -38.5, status: 'CRITICAL', speciesName: 'Ipê' },
  { id: 'prune', latitude: -3.71, longitude: -38.51, status: 'TO_PRUNE', speciesName: 'Ipê' },
  {
    id: 'observe',
    latitude: -3.72,
    longitude: -38.52,
    status: 'UNDER_OBSERVATION',
    speciesName: 'Mangueira',
  },
  { id: 'normal', latitude: -3.73, longitude: -38.53, status: 'NORMAL', speciesName: 'Mangueira' },
]

describe('seleção compartilhada do mapa', () => {
  it('filtra status efetivo por correspondência exata', () => {
    expect(selectTreeMapTrees(inventory, 'CRITICAL', 'species').map(({ id }) => id)).toEqual([
      'critical',
    ])
    expect(selectTreeMapTrees(inventory, 'TO_PRUNE', 'species').map(({ id }) => id)).toEqual([
      'prune',
    ])
  })

  it('prefere effectiveStatus ao status salvo quando os valores divergem', () => {
    const tree = {
      id: 'saved-critical-measured-normal',
      latitude: -3.7,
      longitude: -38.5,
      status: 'NORMAL',
      effectiveStatus: 'CRITICAL',
      speciesName: 'Ipê',
    }
    expect(selectTreeMapTrees([tree], 'CRITICAL', 'species')).toEqual([tree])
    expect(selectTreeMapTrees([tree], 'ALL', 'status')[0]?.effectiveStatus).toBe('CRITICAL')
  })

  it('mantém árvores em observação no inventário completo', () => {
    expect(selectTreeMapTrees(inventory, 'ALL', 'species').map(({ id }) => id)).toEqual([
      'critical',
      'prune',
      'observe',
      'normal',
    ])
  })

  it('combina status e categoria adicional na mesma seleção', () => {
    expect(selectTreeMapTrees(inventory, 'ALL', 'species', 'Ipê').map(({ id }) => id)).toEqual([
      'critical',
      'prune',
    ])
    expect(selectTreeMapTrees(inventory, 'CRITICAL', 'species', 'Mangueira')).toEqual([])
  })
})
