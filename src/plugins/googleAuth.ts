/** Google Identity Services button integration. The backend must validate every ID token. */
const GIS_SRC = 'https://accounts.google.com/gsi/client'

let scriptPromise: Promise<void> | null = null
let initializedClientId: string | null = null
let credentialHandler: ((credential: string) => void) | null = null

const handleCredential = ({ credential }: { credential: string }) => {
  if (credential) credentialHandler?.(credential)
}

export function getGoogleClientId(): string {
  return (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim()
}

export function isGoogleAuthEnabled(): boolean {
  return getGoogleClientId().length > 0
}

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.defer = true
    script.onload = () => {
      if (window.google?.accounts?.id) resolve()
      else {
        scriptPromise = null
        script.remove()
        reject(new Error('Google Identity Services não ficou disponível.'))
      }
    }
    script.onerror = () => {
      scriptPromise = null
      script.remove()
      reject(new Error('Falha ao carregar o botão do Google. Verifique sua conexão.'))
    }
    document.head.appendChild(script)
  })

  return scriptPromise
}

/** Renderiza o botão oficial do Google (não inicia login por um botão customizado). */
export async function renderGoogleButton(
  container: HTMLElement,
  onCredential: (credential: string) => void,
): Promise<() => void> {
  const clientId = getGoogleClientId()
  if (!clientId) throw new Error('Login com Google indisponível: configure VITE_GOOGLE_CLIENT_ID.')

  await loadGisScript()
  const gis = window.google?.accounts?.id
  if (!gis) throw new Error('Google Identity Services não está disponível.')

  const handler = (credential: string) => onCredential(credential)
  credentialHandler = handler
  if (initializedClientId !== clientId) {
    gis.initialize({
      client_id: clientId,
      callback: handleCredential,
      use_fedcm_for_button: true,
    })
    initializedClientId = clientId
  }

  container.replaceChildren()
  gis.renderButton(container, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
    shape: 'rectangular',
    logo_alignment: 'left',
    locale: 'pt-BR',
    width: Math.min(Math.max(container.clientWidth, 240), 400),
  })

  return () => {
    if (credentialHandler === handler) credentialHandler = null
    container.replaceChildren()
  }
}
