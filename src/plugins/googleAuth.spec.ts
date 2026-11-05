import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getGoogleClientId, isGoogleAuthEnabled, renderGoogleButton } from './googleAuth'

describe('Google Identity Services button', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'web-client-id')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    delete window.google
  })

  it('renderiza o botão oficial e encaminha a credencial recebida', async () => {
    const initialize = vi.fn()
    const renderButton = vi.fn()
    window.google = { accounts: { id: { initialize, renderButton } } }
    const container = document.createElement('div')
    const onCredential = vi.fn()

    const cleanup = await renderGoogleButton(container, onCredential)

    expect(getGoogleClientId()).toBe('web-client-id')
    expect(isGoogleAuthEnabled()).toBe(true)
    expect(initialize).toHaveBeenCalledOnce()
    expect(initialize).toHaveBeenCalledWith(expect.objectContaining({ client_id: 'web-client-id' }))
    expect(renderButton).toHaveBeenCalledWith(
      container,
      expect.objectContaining({
        type: 'standard',
        text: 'continue_with',
        locale: 'pt-BR',
      }),
    )

    const config = initialize.mock.calls[0]?.[0] as {
      callback: (response: { credential: string }) => void
    }
    config.callback({ credential: 'signed-google-id-token' })
    expect(onCredential).toHaveBeenCalledWith('signed-google-id-token')

    cleanup()
    expect(container.childElementCount).toBe(0)
  })

  it('recusa inicialização sem Client ID', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '')
    const container = document.createElement('div')
    await expect(renderGoogleButton(container, vi.fn())).rejects.toThrow(
      'configure VITE_GOOGLE_CLIENT_ID',
    )
  })
})
