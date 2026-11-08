export function getLoginErrorMessage(
  error: unknown,
  provider: 'password' | 'google' = 'password',
): string {
  const err = error as {
    response?: { status?: number; data?: { message?: string | string[]; detail?: string } }
    code?: string
    isAxiosError?: boolean
  }

  // Erros do fluxo do Google (sem resposta HTTP): indisponível/cancelado.
  if (!err.response && !err.isAxiosError && error instanceof Error) {
    return error.message
  }

  // Sem resposta do servidor (offline / API fora do ar)
  if (!err.response) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
  }

  const status = err.response.status
  const backendMsg = err.response.data?.message
  const msgText = Array.isArray(backendMsg) ? backendMsg.join(', ') : backendMsg

  // Mensagens mais amigáveis para os casos comuns
  if (status === 401 || status === 400) {
    return (
      msgText ||
      'Credenciais rejeitadas. E-mail ou senha incorretos — verifique seus dados e tente novamente.'
    )
  }
  if (status === 404) {
    if (provider === 'google') {
      if (err.response.data?.detail === 'User not found') return 'E-mail não cadastrado.'
      return 'Login com Google indisponível no servidor. Entre com e-mail e senha ou contate o suporte.'
    }
    return 'E-mail não cadastrado.'
  }
  if (status === 403) {
    return msgText || 'Sua conta está inativa ou sem permissão de acesso.'
  }
  if (status && status >= 500) {
    return 'Erro no servidor. Tente novamente em instantes.'
  }

  return msgText || 'Não foi possível fazer login. Tente novamente.'
}
