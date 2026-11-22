const PUBLIC_HOSTS = new Set(['maptree.com.br', 'www.maptree.com.br'])
const APPLICATION_LOGIN_URL = 'https://app.maptree.com.br/login'
const APPLICATION_REGISTRATION_URL = 'https://app.maptree.com.br/cadastro'

export function getApplicationLoginHref(hostname: string): string {
  return PUBLIC_HOSTS.has(hostname.trim().toLowerCase()) ? APPLICATION_LOGIN_URL : '/login'
}

export function getApplicationRegistrationHref(hostname: string): string {
  return PUBLIC_HOSTS.has(hostname.trim().toLowerCase()) ? APPLICATION_REGISTRATION_URL : '/cadastro'
}
