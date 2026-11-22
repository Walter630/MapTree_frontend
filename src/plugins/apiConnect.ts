/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * plugins/apiConnect.ts
 *
 * Plugin de conexão com a API — Configuração Axios com refresh automático de token.
 */

import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { App } from 'vue'
import type {
  LandingDocument,
  LandingDraftResponse,
  LandingPublishedResponse,
  LandingRevisionSummary,
} from '@/types/landing'

/* ===================================
   TIPOS — Autenticação
=================================== */

interface TokenData {
  accessToken: string | null
}

interface RefreshTokenResponse {
  accessToken: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  user: User
}

/* ===================================
   TIPOS — Enums
=================================== */

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  USER = 'USER',
}

export enum TreeStatus {
  PRUNED = 'PRUNED',
  TO_PRUNE = 'TO_PRUNE',
  UNDER_OBSERVATION = 'UNDER_OBSERVATION',
  NORMAL = 'NORMAL',
  CRITICAL = 'CRITICAL',
}

export enum Vigor {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  POOR = 'POOR',
  DEAD = 'DEAD',
}

/* ===================================
   TIPOS — Entidades
=================================== */

export type ManagerRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface ManagerRequestHistoryItem {
  revision: number
  version: number
  status: ManagerRequestStatus
  requestedOrganizationName: string
  municipalityName: string
  municipalityUf: string
  municipalityCode?: string | null
  actorUserId?: string | null
  reason?: string | null
  createdAt: string
}

export interface ManagerRequest {
  id: string
  status: ManagerRequestStatus
  version: number
  revision: number
  requestedOrganizationName: string
  municipalityName: string
  municipalityUf: string
  municipalityCode?: string | null
  rejectionReason?: string | null
  reviewerId?: string | null
  organizationId?: string | null
  decidedAt?: string | null
  createdAt: string
  updatedAt: string
  applicant?: { id?: string; name?: string; email?: string; cpf?: string; phone?: string }
  history?: ManagerRequestHistoryItem[]
}

export interface User {
  id: string
  name: string
  cpf: string
  email: string
  phone: string
  role: UserRole
  organizationId?: string | null
  organization?: {
    id: string
    name: string
  }
  managerRequest?: Pick<ManagerRequest, 'id' | 'status' | 'version' | 'requestedOrganizationName' | 'municipalityName' | 'municipalityUf' | 'rejectionReason' | 'createdAt' | 'updatedAt'> | null
  isActive: boolean
}

export interface Manager {
  id: string
  name: string
  email: string
  cpf: string
  phone: string
  isActive: boolean
  organizationId: string | null
}

export interface Company {
  id: string
  name: string
  taxId: string
  isOutsourced: boolean
  managerId?: string
  manager: Manager
  isActive: boolean
  createdAt?: Date
}

export interface Species {
  id: string
  commonName: string
  scientificName: string
  family: string
  description: string
}

export interface Tree {
  id: string
  age: Date
  lat: number
  lng: number
  status: TreeStatus
  speciesId: string
  vigor: Vigor
  lastPruneDate?: string
}

export interface Measurement {
  id: string
  treeId: string
  height: number
  canopyWidth: number
  date: string
}

export interface MaintenanceSchedule {
  id: string
  treeId: string
  type: string
  plannedDate: string
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED'
  notes?: string
}

export interface Pruning {
  idTree: string
  tree: Tree
  idUser: string
  user: User
  date: Date
  observations: string
  type: 'LIGHT' | 'MODERATE' | 'HEAVY'
}

/* ===================================
   TIPOS — IA / Predição
=================================== */

export type RiskStatus = 'NORMAL' | 'MODERATE' | 'CRITICAL'
export type CanopyShape = 'WIDE' | 'NARROW' | 'ROUND' | 'COLUMNAR'
export type SoilQuality = 'GOOD' | 'REGULAR' | 'BAD'

export interface CanopyInfo {
  shape: CanopyShape
  ratio_width_height: number
}

export interface FibonacciInfo {
  growth_modifier: number
}

export interface AiPrediction {
  estimated_height_m: number
  wire_height_m: number
  will_reach_wire: boolean
  days_to_wire: number
  months_to_wire: number
  risk_status: RiskStatus
  alert: string | null
  canopy: CanopyInfo
  fibonacci_info: FibonacciInfo
}

export interface Soil {
  id: string
  idTree: string
  depth: number
  inclination: number
  quality: SoilQuality
  soilType?: string // Adicionado para suportar novos tipos científicos
  coverage: number
  clay?: number | null
  sand?: number | null
  ph?: number | null
  createdAt: string
  updatedAt: string
}

export interface TreeWithAi {
  id: string
  commonName: string
  status: TreeStatus
  effectiveStatus?: TreeStatus | string
  lastPruneDate?: string | null
  aiPrediction: AiPrediction | null
  soil?: Soil
  vigor?: Vigor
  measurements?: Measurement[]
  maintenanceSchedule?: MaintenanceSchedule[]
}

/* ===================================
   CLASSE — ApiConnect
=================================== */

class ApiConnect {
  private axiosInstance: AxiosInstance
  private isRefreshing = false
  private failedRequestsQueue: Array<{
    onSuccess: (token: string) => void
    onFailure: (error: AxiosError) => void
  }> = []

  constructor() {
    this.axiosInstance = axios.create({
      baseURL:
        import.meta.env.VITE_API_BASE_URL ||
        (import.meta.env.PROD ? '/api' : 'http://localhost:4000/api'),
      timeout: 30000,
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' },
    })

    this.setupInterceptors()
  }

  /* ---------- Interceptors ---------- */

  private setupInterceptors(): void {
    // Request — adiciona token ao header
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.getAccessToken()
        if (token) config.headers.Authorization = `Bearer ${token}`
        return config
      },
      (error) => Promise.reject(error),
    )

    // Response — trata 401 e faz refresh automático
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

        const url = originalRequest.url ?? ''

        const isAuthRequest =
          url.includes('/auth/login') ||
          url.includes('/auth/google') ||
          url.includes('/auth/refresh')

        if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
          // A chamada em fila também será repetida após o refresh. Marque-a
          // antes de enfileirar para impedir uma segunda renovação em caso de 401.
          originalRequest._retry = true
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedRequestsQueue.push({
                onSuccess: (token: string) => {
                  originalRequest.headers.Authorization = `Bearer ${token}`
                  resolve(this.axiosInstance(originalRequest))
                },
                onFailure: (err: AxiosError) => reject(err),
              })
            })
          }

          this.isRefreshing = true

          try {
            const newToken = await this.refreshAccessToken()
            this.processQueue(null, newToken)
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            return this.axiosInstance(originalRequest)
          } catch (refreshError) {
            this.processQueue(refreshError as AxiosError, null)
            const status = (refreshError as AxiosError).response?.status
            if (status === 401 || status === 403) {
              this.clearTokens()
              this.handleAuthenticationError()
            }
            return Promise.reject(refreshError)
          } finally {
            this.isRefreshing = false
          }
        }

        return Promise.reject(error)
      },
    )
  }

  /* ---------- Fila de Requisições ---------- */

  private processQueue(error: AxiosError | null, token: string | null = null): void {
    this.failedRequestsQueue.forEach((promise) => {
      if (error) promise.onFailure(error)
      else if (token) promise.onSuccess(token)
    })
    this.failedRequestsQueue = []
  }

  /* ---------- Refresh Token ---------- */

  private async refreshAccessToken(): Promise<string> {
    const response = await axios.post<RefreshTokenResponse | string>(
      `${this.axiosInstance.defaults.baseURL}/auth/refresh`,
      {},
      {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      },
    )

    const accessToken =
      typeof response.data === 'string' ? response.data : response.data.accessToken

    this.setAccessToken(accessToken)

    return accessToken
  }

  /* ---------- Tratamento de Erro de Auth ---------- */

  private handleAuthenticationError(): void {
    window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
  }

  /* ---------- Gerenciamento de Token ---------- */

  private getAccessToken(): string | null {
    return localStorage.getItem('accessToken')
  }

  private setAccessToken(token: string): void {
    localStorage.setItem('accessToken', token)
  }

  private clearTokens(): void {
    localStorage.removeItem('accessToken')
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('maptree:daily-route:')) localStorage.removeItem(key)
    }
  }

  /* ---------- API Pública ---------- */

  public setToken(accessToken: string): void {
    this.setAccessToken(accessToken)
  }

  public getToken(): TokenData {
    return { accessToken: this.getAccessToken() }
  }

  public async logout(): Promise<void> {
    try {
      await this.axiosInstance.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      this.clearTokens()
    }
  }

  public isAuthenticated(): boolean {
    return !!this.getAccessToken()
  }

  public get api(): AxiosInstance {
    return this.axiosInstance
  }

  /* ---------- Métodos HTTP ---------- */

  public get<T = unknown>(url: string, config = {}) {
    return this.axiosInstance.get<T>(url, config)
  }

  public getTreesMap() {
    return this.axiosInstance.get<
      Array<{ id: string; latitude: number; longitude: number; status: string }>
    >('/trees/map/risk')
  }

  /**
   * Busca árvores dentro de uma área geográfica (bounding box)
   * Útil para carregar apenas árvores visíveis no mapa
   */
  public getTreesInBounds(
    north: number,
    south: number,
    east: number,
    west: number,
    limit = 500,
    signal?: AbortSignal,
  ) {
    return this.axiosInstance.get<any[]>('/trees/bounds', {
      params: { north, south, east, west, limit },
      signal,
    })
  }

  /**
   * Busca árvores próximas a uma coordenada (raio em km)
   * Útil para carregar árvores da localização do usuário
   */
  public getTreesNearby(lat: number, lng: number, radiusKm = 5, limit = 5000, compact = false) {
    return this.axiosInstance.get<any[]>('/trees/nearby', {
      params: { lat, lng, radius: radiusKm, limit, ...(compact ? { compact: 'true' } : {}) },
    })
  }

  /**
   * Busca árvores por cidade/região pré-definida
   * Mais eficiente que bounds para regiões conhecidas
   */
  public getTreesByCity(cityId: string, limit = 10000) {
    return this.axiosInstance.get<{ cityId: string; bounds: any; count: number; trees: any[] }>(
      `/trees/city/${cityId}`,
      {
        params: { limit },
      },
    )
  }

  /**
   * Busca estatísticas de uma cidade (contadores rápidos)
   * Útil para mostrar preview antes de carregar árvores
   */
  public getCityStats(cityId: string) {
    return this.axiosInstance.get<{
      cityId: string
      name: string
      total: number
      withRisk: number
      byStatus: Record<string, number>
    }>(`/trees/city/${cityId}/stats`)
  }

  /**
   * Lista todas as cidades/regiões disponíveis (endpoint legado)
   */
  public getAvailableCities() {
    return this.axiosInstance.get<{ cities: Array<{ id: string; name: string; type: string }> }>(
      '/trees/cities',
    )
  }

  /**
   * Lista todas as regiões/cidades do banco (novo endpoint)
   * Mais completo - inclui bounds e metadados
   */
  public getRegions() {
    return this.axiosInstance.get<
      Array<{
        id: string
        slug: string
        name: string
        type: string
        north: number
        south: number
        east: number
        west: number
        isActive: boolean
      }>
    >('/regions')
  }

  /**
   * Busca uma região específica pelo slug
   */
  public getRegionBySlug(slug: string) {
    return this.axiosInstance.get<{
      id: string
      slug: string
      name: string
      type: string
      north: number
      south: number
      east: number
      west: number
    }>(`/regions/${slug}`)
  }

  public post<T = unknown>(url: string, data?: unknown, config = {}) {
    return this.axiosInstance.post<T>(url, data, config)
  }

  public createTree<T = unknown>(data: unknown, idempotencyKey: string) {
    return this.axiosInstance.post<T>('/trees', data, {
      headers: { 'Idempotency-Key': idempotencyKey },
    })
  }

  public put<T = unknown>(url: string, data?: unknown, config = {}) {
    return this.axiosInstance.put<T>(url, data, config)
  }

  public patch<T = unknown>(url: string, data?: unknown, config = {}) {
    return this.axiosInstance.patch<T>(url, data, config)
  }

  public delete<T = unknown>(url: string, config = {}) {
    return this.axiosInstance.delete<T>(url, config)
  }

  public getPublishedLanding() {
    return this.axiosInstance.get<LandingPublishedResponse>('/landing/published')
  }

  public getLandingDraft() {
    return this.axiosInstance.get<LandingDraftResponse>('/admin/landing/draft')
  }

  public saveLandingDraft(expectedVersion: number, content: LandingDocument) {
    return this.axiosInstance.put<LandingDraftResponse>('/admin/landing/draft', {
      expectedVersion,
      content,
    })
  }

  public getLandingPreview() {
    return this.axiosInstance.get<{ version: number; content: LandingDocument }>(
      '/admin/landing/preview',
    )
  }

  public getLandingRevisions() {
    return this.axiosInstance.get<LandingRevisionSummary[]>('/admin/landing/revisions')
  }

  public publishLanding(
    expectedDraftVersion: number,
    expectedPublishedVersion: number,
    idempotencyKey: string,
  ) {
    return this.axiosInstance.post('/admin/landing/publish', {
      expectedDraftVersion,
      expectedPublishedVersion,
      idempotencyKey,
    })
  }

  public restoreLandingRevision(
    revisionId: string,
    expectedDraftVersion: number,
    expectedPublishedVersion: number,
    idempotencyKey: string,
  ) {
    return this.axiosInstance.post(`/admin/landing/revisions/${revisionId}/restore`, {
      expectedDraftVersion,
      expectedPublishedVersion,
      idempotencyKey,
    })
  }

  public uploadLandingMedia(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    return this.axiosInstance.post<{
      id: string
      mimeType: string
      width: number
      height: number
      byteSize: number
    }>('/admin/landing/media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }

  public getAdminLandingMedia(assetId: string) {
    return this.axiosInstance.get<Blob>(`/admin/landing/media/${assetId}`, {
      responseType: 'blob',
    })
  }

  public getAiPrediction(treeId: string, referenceWireHeightM?: number) {
    const params =
      Number.isFinite(referenceWireHeightM) && Number(referenceWireHeightM) > 0
        ? { referenceWireHeightM }
        : undefined
    return this.axiosInstance.get(`/trees/${treeId}/ai-prediction`, { params })
  }

  /* ---------- Novas Importações IA ---------- */
  public importExternalData() {
    return this.axiosInstance.post('/trees/import-external')
  }

  public importMapTreeCsv(filePath: string) {
    return this.axiosInstance.post('/trees/import-maptree-csv', { filePath })
  }
}

/* ===================================
   INSTÂNCIA SINGLETON & PLUGIN VUE
=================================== */

const apiConnect = new ApiConnect()

export default {
  install: (app: App) => {
    app.config.globalProperties.$api = apiConnect
    app.provide('$api', apiConnect)
  },
}

export { apiConnect }
export type { ApiConnect }

/* ===================================
   TYPE AUGMENTATION
=================================== */

declare module 'vue' {
  interface ComponentCustomProperties {
    $api: ApiConnect
    axios: AxiosInstance
    $router: import('vue-router').Router
    $route: import('vue-router').RouteLocationNormalizedLoaded
    $store: ReturnType<typeof import('@/stores/app').useAppStore>
    $isMobile: () => boolean
  }
}
