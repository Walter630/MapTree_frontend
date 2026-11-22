import { apiConnect } from '@/plugins/apiConnect'
import type { TreeApiRecord } from '@/types/treeApi'
import type { DailyRouteStopSnapshot } from './dailyRouteStorage'
import type { RoutePruning } from './pruningWorkflow'

export interface DailyRouteSchedule<T = TreeApiRecord> {
  id: string
  treeId: string
  userId?: string | null
  routeOrder?: number
  status: string
  tree: T
  prunings?: RoutePruning[]
  type: string
}

export interface DailyRouteSummary {
  date: string
  pendingCount: number
  completedCount: number
}

export async function getDailyRouteSummary(month: string) {
  const { data } = await apiConnect.get<DailyRouteSummary[]>('/scheduling/daily-route', {
    params: { month },
  })
  return data
}

export async function getDailyRouteSchedules<T = TreeApiRecord>(date: string) {
  const { data } = await apiConnect.get<DailyRouteSchedule<T>[]>('/scheduling', {
    params: { date, mine: 'true' },
  })
  return data.filter((stop) => stop.type === 'PRUNING')
}

export async function setDailyRouteTreeSelected<T = TreeApiRecord>(
  date: string,
  treeId: string,
  selected: boolean,
) {
  const encodedDate = encodeURIComponent(date)
  const encodedTreeId = encodeURIComponent(treeId)
  const { data } = await apiConnect.put<DailyRouteSchedule<T>[]>(
    `/scheduling/daily-route/${encodedDate}/stops/${encodedTreeId}`,
    { selected },
  )
  return data.filter((stop) => stop.type === 'PRUNING')
}

export function getDailyRouteSchedulesByStatus<T>(
  schedules: DailyRouteSchedule<T>[],
  status: 'PENDING' | 'COMPLETED',
): DailyRouteSchedule<T>[] {
  return schedules
    .map((schedule, index) => ({ schedule, originalIndex: index }))
    .filter(({ schedule }) => schedule.status === status)
    .sort(
      (a, b) =>
        (a.schedule.routeOrder ?? a.originalIndex + 1) -
        (b.schedule.routeOrder ?? b.originalIndex + 1),
    )
    .map(({ schedule }) => schedule)
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

export function getPendingMapStops(schedules: DailyRouteSchedule[]): DailyRouteStopSnapshot[] {
  return schedules
    .flatMap((stop, index) => {
      if (stop.status !== 'PENDING') return []
      const point = routeStopSnapshot(stop.tree, stop.routeOrder || index + 1, stop.id)
      return point ? [point] : []
    })
    .sort((a, b) => a.order - b.order)
}
