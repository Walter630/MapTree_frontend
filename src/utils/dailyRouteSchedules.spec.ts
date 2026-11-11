import { describe, expect, it } from 'vitest'
import { getPendingMapStops, type DailyRouteSchedule } from './dailyRouteSchedules'

function schedule(treeId: string, routeOrder: number, status: string): DailyRouteSchedule {
  return {
    id: `schedule-${treeId}`,
    treeId,
    status,
    routeOrder,
    type: 'PRUNING',
    tree: { id: treeId, latitude: -3.7, longitude: -38.5 },
  }
}

describe('paradas exibidas no mapa', () => {
  const cached = ['first', 'second', 'cancelled', 'draft'].map((id, index) => ({
    id,
    order: index + 1,
    latitude: -3.7,
    longitude: -38.5,
  }))

  it('substitui o cache pelo estado da API sem perder o rascunho local', () => {
    const stops = getPendingMapStops(
      [
        schedule('first', 1, 'COMPLETED'),
        schedule('second', 2, 'PENDING'),
        schedule('cancelled', 3, 'CANCELLED'),
      ],
      cached,
    )
    expect(stops.map(({ id, order }) => [id, order])).toEqual([
      ['second', 2],
      ['draft', 4],
    ])
  })

  it('não volta a exibir paradas confirmadas anteriormente e removidas da API', () => {
    expect(getPendingMapStops([], [{ ...cached[0]!, scheduleId: 'deleted' }])).toEqual([])
  })

  it('não desenha uma rota concluída nem inventa um ponto para coordenadas ausentes', () => {
    const missing = schedule('missing', 2, 'PENDING')
    missing.tree.latitude = null
    expect(getPendingMapStops([schedule('first', 1, 'COMPLETED'), missing], [cached[0]!])).toEqual(
      [],
    )
  })
})
