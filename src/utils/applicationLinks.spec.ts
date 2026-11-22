import { describe, expect, it } from 'vitest'
import { getApplicationLoginHref, getApplicationRegistrationHref } from './applicationLinks'

describe('getApplicationLoginHref', () => {
  it('abre o login no subdomínio app quando vem da landing pública', () => {
    expect(getApplicationLoginHref('maptree.com.br')).toBe('https://app.maptree.com.br/login')
    expect(getApplicationLoginHref('www.maptree.com.br')).toBe('https://app.maptree.com.br/login')
  })

  it('mantém o mesmo host em desenvolvimento, homologação e na aplicação', () => {
    expect(getApplicationLoginHref('localhost')).toBe('/login')
    expect(getApplicationLoginHref('app.maptree.com.br')).toBe('/login')
    expect(getApplicationLoginHref('preview-maptree.vercel.app')).toBe('/login')
  })
})

describe('getApplicationRegistrationHref', () => {
  it('abre o cadastro no subdomínio app quando vem da landing pública', () => {
    expect(getApplicationRegistrationHref('maptree.com.br')).toBe(
      'https://app.maptree.com.br/cadastro',
    )
    expect(getApplicationRegistrationHref('www.maptree.com.br')).toBe(
      'https://app.maptree.com.br/cadastro',
    )
  })

  it('mantém o mesmo host em desenvolvimento, homologação e na aplicação', () => {
    expect(getApplicationRegistrationHref('localhost')).toBe('/cadastro')
    expect(getApplicationRegistrationHref('app.maptree.com.br')).toBe('/cadastro')
    expect(getApplicationRegistrationHref('preview-maptree.vercel.app')).toBe('/cadastro')
  })
})
