import { beforeEach, describe, expect, it } from 'vitest'
import {
  dailyRouteStorageKey,
  readDailyRouteSnapshot,
  saveDailyRouteSnapshot,
} from './dailyRouteStorage'
const tokenFor = (id: string) => `header.${btoa(JSON.stringify({ id }))}.signature`
const snapshot = {
  date: '2026-11-06',
  updatedAt: '2026-11-06T12:00:00Z',
  stops: [{ id: 'tree', order: 1, latitude: -3.7, longitude: -38.5 }],
}
beforeEach(() => localStorage.clear())
describe('Isolamento do cache da rota', () => {
  it('não compartilha a rota quando outro usuário entra no mesmo navegador', () => {
    localStorage.setItem('accessToken', tokenFor('user-a'))
    saveDailyRouteSnapshot(snapshot)
    const key = dailyRouteStorageKey(snapshot.date)
    expect(readDailyRouteSnapshot(snapshot.date)?.stops).toHaveLength(1)
    localStorage.setItem('accessToken', tokenFor('user-b'))
    expect(dailyRouteStorageKey(snapshot.date)).not.toBe(key)
    expect(readDailyRouteSnapshot(snapshot.date)).toBeNull()
  })
  it('não restaura caches antigos que não identificavam o dono', () => {
    localStorage.setItem('accessToken', tokenFor('user-a'))
    localStorage.setItem(`maptree:daily-route:${snapshot.date}`, JSON.stringify(snapshot))
    expect(readDailyRouteSnapshot(snapshot.date)).toBeNull()
  })
  it('não grava nem lê rotas sem sessão', () => {
    saveDailyRouteSnapshot(snapshot)
    expect(localStorage.length).toBe(0)
    expect(readDailyRouteSnapshot(snapshot.date)).toBeNull()
  })
})
