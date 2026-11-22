import { describe, expect, it } from 'vitest'
import { buildMonthlyPruningSeries } from './pruningReportSeries'

describe('buildMonthlyPruningSeries', () => {
  it('groups API records into the requested rolling months and scales bars to real counts', () => {
    const series = buildMonthlyPruningSeries(
      [
        { date: '2026-06-30' },
        { date: '2026-11-01' },
        { date: '2026-11-15T12:00:00-03:00' },
        { date: '2025-12-20' },
        { date: 'not-a-date' },
      ],
      6,
      new Date('2026-11-15T12:00:00-03:00'),
    )

    expect(series.map(({ key }) => key)).toEqual([
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
    ])
    expect(series.map(({ count }) => count)).toEqual([1, 0, 0, 0, 0, 2])
    expect(series.map(({ percent }) => percent)).toEqual([50, 0, 0, 0, 0, 100])
  })

  it('returns zero-height months when the API has no pruning records', () => {
    const series = buildMonthlyPruningSeries([], 3, new Date('2026-11-15T12:00:00-03:00'))

    expect(series.map(({ count, percent }) => [count, percent])).toEqual([
      [0, 0],
      [0, 0],
      [0, 0],
    ])
  })

  it('returns no points for an invalid period length', () => {
    expect(buildMonthlyPruningSeries([], 0)).toEqual([])
  })
})
