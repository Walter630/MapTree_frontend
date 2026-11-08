import { describe, expect, it } from 'vitest'
import { getLoginErrorMessage } from './loginError'

describe('erros do login Google', () => {
  it.each([
    { message: 'Cannot POST /api/auth/google', error: 'Not Found', statusCode: 404 },
    '<html><body>Not Found</body></html>',
    undefined,
  ])('trata 404 de rota indisponível sem afirmar que o e-mail não existe: %j', (data) => {
    const message = getLoginErrorMessage({ response: { status: 404, data } }, 'google')
    expect(message).toContain('Login com Google indisponível no servidor')
    expect(message).not.toContain('E-mail não cadastrado')
  })

  it('preserva a resposta explícita de conta inexistente do backend Java', () => {
    expect(
      getLoginErrorMessage(
        { response: { status: 404, data: { detail: 'User not found' } } },
        'google',
      ),
    ).toBe('E-mail não cadastrado.')
  })

  it('preserva o comportamento do login por senha', () => {
    expect(getLoginErrorMessage({ response: { status: 404 } })).toBe('E-mail não cadastrado.')
    expect(
      getLoginErrorMessage({ response: { status: 403, data: { message: 'Conta inativa' } } }),
    ).toBe('Conta inativa')
  })
})
