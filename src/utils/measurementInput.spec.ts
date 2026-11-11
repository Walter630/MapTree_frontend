import { describe, expect, it } from 'vitest'
import { parseMeasurementPair, readMeters } from './measurementInput'

describe('readMeters', () => {
  it('aceita vírgula e ponto como separador decimal', () => {
    expect(readMeters('5,2')).toBe(5.2)
    expect(readMeters('5.2')).toBe(5.2)
    expect(readMeters(' 3 ')).toBe(3)
    expect(readMeters('0')).toBe(0)
  })

  it('rejeita vazio, sinais, notação científica e texto', () => {
    for (const input of ['', '   ', '-1', '+1', '1e3', 'abc', '1,2,3', '5 m', ',5']) {
      expect(readMeters(input)).toBeNaN()
    }
    expect(readMeters(null)).toBeNaN()
    expect(readMeters(undefined)).toBeNaN()
  })
})

describe('parseMeasurementPair', () => {
  it('devolve os números quando altura e largura são válidas', () => {
    expect(parseMeasurementPair('5,2', '2,4')).toEqual({
      ok: true,
      value: { height: 5.2, canopyWidth: 2.4 },
    })
  })

  it('aceita largura de copa zero, mas não altura zero', () => {
    expect(parseMeasurementPair('4', '0')).toEqual({
      ok: true,
      value: { height: 4, canopyWidth: 0 },
    })
    expect(parseMeasurementPair('0', '2').ok).toBe(false)
  })

  it('indica o campo com problema', () => {
    const noHeight = parseMeasurementPair('', '2')
    const noWidth = parseMeasurementPair('4', '')
    expect(noHeight.ok === false && noHeight.error).toMatch(/altura/i)
    expect(noWidth.ok === false && noWidth.error).toMatch(/largura/i)
  })
})
