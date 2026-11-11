import { apiConnect } from '@/plugins/apiConnect'
import type { TreeApiRecord } from '@/types/treeApi'
import type { DailyRouteStopSnapshot } from './dailyRouteStorage'
import type { RoutePruning } from './pruningWorkflow'

export interface DailyRouteSchedule<T = TreeApiRecord> {
  id: string
  treeId: string
  routeOrder?: number
  status: string
  tree: T
  prunings?: RoutePruning[]
  type: string
}

export async function getDailyRouteSchedules<T = TreeApiRecord>(date: string) {
  const { data } = await apiConnect.get<DailyRouteSchedule<T>[]>('/scheduling', {
    params: { date, mine: 'true' },
  })
  return data.filter((stop) => stop.type === 'PRUNING')
}

export function routeStopSnapshot(
  tree: Pick<TreeApiRecord, 'id' | 'latitude' | 'longitude' | 'lat' | 'lng' | 'species'>,
  order: number,
  scheduleId?: string,
): DailyRouteStopSnapshot | null {
  const lat = tree.latitude ?? tree.lat
  const lng = tree.longitude ?? tree.lng
  if (lat == null || lng == null || lat === '' || lng === '') return null
  const latitude = Number(lat)
  const longitude = Number(lng)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null
  return { id: tree.id, order, latitude, longitude, label: tree.species?.commonName, scheduleId }
}

export function getPendingMapStops(
  schedules: DailyRouteSchedule[],
  cached: DailyRouteStopSnapshot[],
): DailyRouteStopSnapshot[] {
  const scheduledTrees = new Set(schedules.map((stop) => stop.treeId))
  const pending = schedules.flatMap((stop, index) => {
    if (stop.status !== 'PENDING') return []
    const point = routeStopSnapshot(stop.tree, stop.routeOrder || index + 1, stop.id)
    return point ? [point] : []
  })
  return [
    ...pending,
    ...cached.filter((stop) => !stop.scheduleId && !scheduledTrees.has(stop.id)),
  ].sort((a, b) => a.order - b.order)
}
