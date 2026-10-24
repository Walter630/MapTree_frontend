export interface DailyRouteStopSnapshot {
  id: string
  order: number
  latitude: number
  longitude: number
  label?: string
  urgency?: string | null
}

export interface DailyRouteSnapshot {
  date: string
  stops: DailyRouteStopSnapshot[]
  updatedAt: string
}

export function dailyRouteStorageKey(date: string): string {
  return `maptree:daily-route:${date}`
}

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function saveDailyRouteSnapshot(snapshot: DailyRouteSnapshot): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(dailyRouteStorageKey(snapshot.date), JSON.stringify(snapshot))
}

export function readDailyRouteSnapshot(date: string): DailyRouteSnapshot | null {
  if (typeof window === 'undefined') return null

  const raw = window.localStorage.getItem(dailyRouteStorageKey(date))
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<DailyRouteSnapshot>
    if (parsed.date !== date || !Array.isArray(parsed.stops)) return null

    const stops = parsed.stops
      .filter((stop): stop is DailyRouteStopSnapshot => (
        Boolean(stop) &&
        typeof stop.id === 'string' &&
        Number.isInteger(stop.order) &&
        isFiniteCoordinate(stop.latitude) &&
        isFiniteCoordinate(stop.longitude) &&
        Math.abs(stop.latitude) <= 90 &&
        Math.abs(stop.longitude) <= 180
      ))
      .sort((a, b) => a.order - b.order)

    return { date, stops, updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '' }
  } catch {
    window.localStorage.removeItem(dailyRouteStorageKey(date))
    return null
  }
}
