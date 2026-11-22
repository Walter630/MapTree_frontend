import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearTreeCreateAttemptKey,
  getTreeCreateAttemptKey,
  type TreeCreatePayload,
} from './treeCreateAttempt'

const payload: TreeCreatePayload = {
  idSpecies: 'species-1',
  latitude: -3.73,
  longitude: -38.52,
  status: 'NORMAL',
  vigor: 'GOOD',
}

describe('treeCreateAttempt', () => {
  beforeEach(() => localStorage.clear())

  it('reusa a mesma chave para repetir o mesmo payload após falha de rede', async () => {
    expect(await getTreeCreateAttemptKey(payload)).toBe(await getTreeCreateAttemptKey(payload))
  })

  it('gera outra chave quando ponto ou espécie muda', async () => {
    const first = await getTreeCreateAttemptKey(payload)
    const second = await getTreeCreateAttemptKey({ ...payload, latitude: -3.74 })
    expect(second).not.toBe(first)
  })

  it('limpa apenas a chave da tentativa confirmada', async () => {
    const first = await getTreeCreateAttemptKey(payload)
    const second = await getTreeCreateAttemptKey({ ...payload, latitude: -3.74 })
    clearTreeCreateAttemptKey(first)
    expect(await getTreeCreateAttemptKey({ ...payload, latitude: -3.74 })).toBe(second)
  })

  it('guarda apenas o hash do payload junto à chave', async () => {
    await getTreeCreateAttemptKey(payload)
    const stored = localStorage.getItem('maptree:tree-create-attempt') || ''
    expect(stored).not.toContain(String(payload.latitude))
    expect(stored).not.toContain(payload.idSpecies)
  })
})
