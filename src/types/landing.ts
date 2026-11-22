export type LandingSectionId =
  | 'prevention'
  | 'productDemo'
  | 'workflow'
  | 'features'
  | 'audience'
  | 'about'
  | 'analytics'
  | 'faq'
  | 'finalCta'

export type LandingFieldValue =
  | string
  | number
  | boolean
  | null
  | LandingFieldValue[]
  | { [key: string]: LandingFieldValue }

export interface LandingImage {
  staticPath: string | null
  assetId: string | null
  alt: string
}

export interface LandingDocument {
  schemaVersion: 1
  order: LandingSectionId[]
  visibility: Record<LandingSectionId | 'footer', boolean>
  fields: {
    header: {
      logo: LandingImage
      navigation: Array<{ label: string; href: string }>
      loginLabel: string
      accessLabel: string
    }
    hero: {
      desktopImage: LandingImage
      mobileImage: LandingImage
      title: string
      description: string
      primaryActionLabel: string
      secondaryActionLabel: string
      secondaryActionHref: string
      capabilities: string[]
      previewImage: LandingImage
      previewCaption: string
    }
    prevention: { title: string; description: string }
    productDemo: { title: string; description: string; caption: string }
    workflow: {
      title: string
      description: string
      steps: Array<{
        id: string
        number: string
        image: LandingImage
        title: string
        description: string
      }>
    }
    features: {
      title: string
      description: string
      items: Array<{ id: string; title: string; description: string; icon: string }>
    }
    audience: {
      title: string
      description: string
      cards: Array<{ id: string; title: string; description: string; icon: string }>
    }
    about: {
      mainImage: LandingImage
      insetImage: LandingImage
      mainCaption: string
      insetCaption: string
      title: string
      paragraphs: string[]
      actionLabel: string
    }
    analytics: { badge: string; title: string; paragraphs: string[] }
    faq: { title: string; items: Array<{ id: string; question: string; answer: string }> }
    finalCta: { title: string; description: string; buttonLabel: string }
    footer: {
      tagline: string
      links: Array<{ label: string; href: string }>
      loginLabel: string
      accessLabel: string
      pendingLinks: string
      backToTopLabel: string
    }
  }
}

export interface LandingPublishedResponse {
  version: number
  revisionId: string
  content: LandingDocument
}

export interface LandingDraftResponse {
  version: number
  publishedVersion: number
  content: LandingDocument
  updatedAt: string | null
  updatedById: string | null
}

export interface LandingRevisionSummary {
  id: string
  version: number
  action: 'INITIAL' | 'PUBLISH' | 'RESTORE'
  actorId: string | null
  createdAt: string | null
  sourceRevisionId: string | null
}
