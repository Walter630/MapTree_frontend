import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get, put } = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }))
vi.mock('@/plugins/apiConnect', () => ({
  apiConnect: { get, put },
}))

import { getDailyRouteSummary, setDailyRouteTreeSelected } from './dailyRouteSchedules'

describe('gravação imediata da parada diária', () => {
  beforeEach(() => {
    get.mockReset()
    put.mockReset()
  })

  it('envia estado selecionado ao endpoint por data e árvore e retorna só podas', async () => {
    put.mockResolvedValue({
      data: [
        { id: 'stop-1', treeId: 'tree/1', status: 'PENDING', type: 'PRUNING' },
        { id: 'inspection-1', treeId: 'tree/2', status: 'PENDING', type: 'INSPECTION' },
      ],
    })

    const result = await setDailyRouteTreeSelected('2026-11-14', 'tree/1', true)

    expect(put).toHaveBeenCalledWith('/scheduling/daily-route/2026-11-14/stops/tree%2F1', {
      selected: true,
    })
    expect(result.map(({ id }) => id)).toEqual(['stop-1'])
  })

  it('consulta somente o resumo do mês solicitado', async () => {
    get.mockResolvedValue({
      data: [{ date: '2026-11-14', pendingCount: 2, completedCount: 1 }],
    })

    await expect(getDailyRouteSummary('2026-11')).resolves.toEqual([
      { date: '2026-11-14', pendingCount: 2, completedCount: 1 },
    ])
    expect(get).toHaveBeenCalledWith('/scheduling/daily-route', {
      params: { month: '2026-11' },
    })
  })
})
