import { describe, expect, it } from 'vitest'
import {
  coordinateDistanceKm,
  groupRoute,
  MAX_SUGGESTED_ROUTE_RADIUS_KM,
} from '@/utils/dailyRoutePlanner'
import type { PrioritizedTree, TreePriorityInput } from '@/utils/treePriority'

function prioritizedTree(
  id: string,
  latitude: number | null,
  longitude: number | null,
  priorityScore: number,
): PrioritizedTree<TreePriorityInput & { id: string }> {
  return {
    tree: { id, latitude, longitude },
    priorityScore,
    urgency: 'HIGH',
    needsPruning: true,
    reason: 'Teste',
    recommendedAction: 'Teste',
    heightRatio: null,
    daysToWire: null,
  }
}

describe('dailyRoutePlanner', () => {
  it('measures geographic distance in kilometers', () => {
    const distance = coordinateDistanceKm(
      { latitude: -5.24338, longitude: -38.12755 },
      { latitude: -5.245, longitude: -38.129 },
    )

    expect(distance).toBeGreaterThan(0.1)
    expect(distance).toBeLessThan(1)
  })

  it('keeps a suggested route within the radius of its highest-priority stop', () => {
    const nearby = prioritizedTree('nearby', -5.245, -38.129, 80)
    const distant = prioritizedTree('distant', -2, -23, 90)
    const urgent = prioritizedTree('urgent', -5.24338, -38.12755, 100)

    const route = groupRoute([urgent, nearby, distant], 20, MAX_SUGGESTED_ROUTE_RADIUS_KM)

    expect(route.map(({ tree }) => tree.id)).toContain('urgent')
    expect(route.map(({ tree }) => tree.id)).toContain('nearby')
    expect(route.map(({ tree }) => tree.id)).not.toContain('distant')
  })

  it('omits stops without valid coordinates from a geographically bounded suggestion', () => {
    const route = groupRoute(
      [
        prioritizedTree('valid', -5.24338, -38.12755, 100),
        prioritizedTree('missing', null, null, 90),
      ],
      20,
      MAX_SUGGESTED_ROUTE_RADIUS_KM,
    )

    expect(route.map(({ tree }) => tree.id)).toEqual(['valid'])
  })
})
