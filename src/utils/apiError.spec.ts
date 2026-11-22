import { describe, expect, it } from 'vitest'
import { getApiErrorMessage } from './apiError'

describe('getApiErrorMessage', () => {
  it('exibe a explicação enviada pela API para 403', () => {
    expect(
      getApiErrorMessage({
        response: {
          status: 403,
          data: { message: 'Vincule sua conta a uma empresa antes de cadastrar árvores.' },
        },
      }),
    ).toBe('Vincule sua conta a uma empresa antes de cadastrar árvores.')
  })

  it('mantém mensagem genérica quando a API não explica o 403', () => {
    expect(getApiErrorMessage({ response: { status: 403 } })).toBe(
      'Você não tem permissão para realizar esta ação.',
    )
  })
})
