import { expect, it } from 'vitest'
import { catalogCount, speciesIcon } from './speciesDisplay'

it('distingue as espécies do seed e aceita nomes científicos e variações de grafia', () => {
  expect(speciesIcon('Oiticica')).not.toBe(speciesIcon('Ipê-Amarelo'))
  expect(speciesIcon('Licania rigida')).toBe(speciesIcon('Oiticica'))
  expect(speciesIcon('Handroanthus albus')).toBe(speciesIcon(' IPE amarelo '))
  expect(speciesIcon()).toBe('🌿')
})

it('distingue zero de contagem ausente e exibe a quantidade da API', () => {
  expect(catalogCount({ _count: { Tree: 0 } })).toBe(0)
  expect(catalogCount({ _count: { Tree: 6 } })).toBe(6)
  expect(catalogCount({})).toBeUndefined()
})
