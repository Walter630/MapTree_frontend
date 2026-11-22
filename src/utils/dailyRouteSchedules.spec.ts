import { describe, expect, it } from 'vitest'
import {
  getDailyRouteSchedulesByStatus,
  getPendingMapStops,
  type DailyRouteSchedule,
} from './dailyRouteSchedules'

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
  it('usa somente paradas pendentes da API e preserva a ordem salva', () => {
    const stops = getPendingMapStops([
      schedule('first', 1, 'COMPLETED'),
      schedule('third', 3, 'PENDING'),
      schedule('cancelled', 4, 'CANCELLED'),
      schedule('second', 2, 'PENDING'),
    ])
    expect(stops.map(({ id, order }) => [id, order])).toEqual([
      ['second', 2],
      ['third', 3],
    ])
  })

  it('não exibe rascunhos ou snapshots locais que não estão na agenda da API', () => {
    expect(getPendingMapStops([])).toEqual([])
  })

  it('não desenha uma rota concluída nem inventa um ponto para coordenadas ausentes', () => {
    const missing = schedule('missing', 2, 'PENDING')
    missing.tree.latitude = null
    expect(getPendingMapStops([schedule('first', 1, 'COMPLETED'), missing])).toEqual([])
  })
})

describe('abas da rota diária', () => {
  const schedules = [
    schedule('third', 3, 'PENDING'),
    schedule('first', 1, 'COMPLETED'),
    schedule('cancelled', 2, 'CANCELLED'),
    schedule('second', 2, 'PENDING'),
  ]

  it('separa somente pendentes e concluídas sem renumerar a ordem salva', () => {
    expect(
      getDailyRouteSchedulesByStatus(schedules, 'PENDING').map(({ treeId, routeOrder }) => [
        treeId,
        routeOrder,
      ]),
    ).toEqual([
      ['second', 2],
      ['third', 3],
    ])
    expect(
      getDailyRouteSchedulesByStatus(schedules, 'COMPLETED').map(({ treeId, routeOrder }) => [
        treeId,
        routeOrder,
      ]),
    ).toEqual([['first', 1]])
  })
})
