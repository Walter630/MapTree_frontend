/**
 * utils/apiError.ts
 *
 * Mapeia erros do Axios para mensagens amigáveis em PT-BR, distinguindo
 * erros de validação (400/422), sessão expirada (401) e falha de conexão.
 */

interface AxiosLikeError {
  response?: {
    status?: number
    data?: {
      message?: string | string[]
    }
  }
  request?: unknown
}

const MESSAGES = {
  validation: 'Confira os dados e tente novamente.',
  session: 'Sua sessão expirou. Entre novamente.',
  network: 'Falha de conexão. Verifique sua internet e tente novamente.',
} as const

/**
 * Retorna uma mensagem de erro em PT-BR adequada para exibição ao usuário.
 *
 * @param error Erro capturado (normalmente de uma chamada Axios).
 * @param fallback Mensagem genérica usada quando não há tratamento específico.
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = 'Não foi possível salvar. Tente novamente.',
): string {
  const apiError = error as AxiosLikeError

  // Sem response mas com request = requisição enviada e sem resposta (rede/offline).
  // Também cobre o caso de erro totalmente desconhecido sem response.
  if (!apiError?.response) {
    return MESSAGES.network
  }

  const status = apiError.response.status

  if (status === 401) {
    return MESSAGES.session
  }

  if (status === 403) return 'Você não tem permissão para realizar esta ação.'

  if (status === 409) {
    const message = apiError.response.data?.message
    return (Array.isArray(message) ? message.join(' ') : message) || fallback
  }

  if (status === 400 || status === 422) {
    return MESSAGES.validation
  }

  return fallback
}
