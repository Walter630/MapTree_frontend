export interface PruningDateRecord {
  date?: string | Date | null
}

export interface PruningMonthPoint {
  key: string
  label: string
  count: number
  percent: number
}

const REPORT_TIME_ZONE = 'America/Sao_Paulo'

const reportMonthFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: REPORT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
})

const labelMonthFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'UTC',
  month: 'short',
})

function monthKeyForDate(date: Date): string | null {
  if (Number.isNaN(date.getTime())) return null
  const parts = Object.fromEntries(
    reportMonthFormatter.formatToParts(date).map(({ type, value }) => [type, value]),
  )
  return `${parts.year}-${parts.month}`
}

function monthKeyForRecord(value: string | Date | null | undefined): string | null {
  if (value instanceof Date) return monthKeyForDate(value)
  if (typeof value !== 'string' || !value.trim()) return null

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.000)?Z)?$/.exec(value.trim())
  if (dateOnly) {
    const [, year, month, day] = dateOnly
    const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
    if (
      parsed.getUTCFullYear() !== Number(year) ||
      parsed.getUTCMonth() !== Number(month) - 1 ||
      parsed.getUTCDate() !== Number(day)
    )
      return null
    return `${year}-${month}`
  }

  const parsed = new Date(value)
  return monthKeyForDate(parsed)
}

function monthLabel(date: Date): string {
  const label = labelMonthFormatter.format(date).replace(/\.$/, '')
  return label.charAt(0).toLocaleUpperCase('pt-BR') + label.slice(1)
}

export function buildMonthlyPruningSeries(
  records: readonly PruningDateRecord[],
  monthCount: number,
  now = new Date(),
): PruningMonthPoint[] {
  if (!Number.isInteger(monthCount) || monthCount <= 0) return []

  const currentMonth = monthKeyForDate(now)
  if (!currentMonth) return []
  const [year, month] = currentMonth.split('-').map(Number)
  const months = Array.from({ length: monthCount }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - (monthCount - 1 - index), 1))
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
    return { key, date }
  })
  const counts = new Map(months.map(({ key }) => [key, 0]))

  records.forEach(({ date }) => {
    const key = monthKeyForRecord(date)
    if (key && counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1)
  })

  const maxCount = Math.max(0, ...counts.values())
  return months.map(({ key, date }) => {
    const count = counts.get(key) ?? 0
    return {
      key,
      label: monthLabel(date),
      count,
      percent: maxCount > 0 ? Math.round((count / maxCount) * 100) : 0,
    }
  })
}
