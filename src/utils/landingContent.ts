import type { LandingImage } from '@/types/landing'
import { getApplicationLoginHref, getApplicationRegistrationHref } from '@/utils/applicationLinks'

const basePath = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`

export function resolveLandingImage(image: LandingImage, draft = false): string {
  if (image.assetId) {
    const accessPath = draft ? '/api/admin/landing/media/' : '/api/landing/media/'
    return `${basePath}${accessPath.replace(/^\//, '')}${image.assetId}`
  }
  if (!image.staticPath) return ''
  return `${basePath}${image.staticPath.replace(/^\//, '')}`
}

export function resolveLandingHref(href: string, hostname: string): string {
  if (href === 'login') return getApplicationLoginHref(hostname)
  if (href === 'register') return getApplicationRegistrationHref(hostname)
  return href
}
