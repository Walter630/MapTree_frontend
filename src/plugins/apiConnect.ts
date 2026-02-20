/**
 * plugins/apiConnect.ts
 *
 * Plugin de conexão com a API — Configuração Axios com refresh automático de token.
 */

import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { App } from 'vue'

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
}

/* ===================================
   TIPOS — Entidades
=================================== */

export interface User {
  id: string
  name: string
  cpf: string
  email: string
  phone: string
  role: UserRole
  organization?: {
    id: string
    name: string
  }
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
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
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

        if (error.response?.status === 401 && !originalRequest._retry) {
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

          originalRequest._retry = true
          this.isRefreshing = true

          try {
            const newToken = await this.refreshAccessToken()
            this.processQueue(null, newToken)
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            return this.axiosInstance(originalRequest)
          } catch (refreshError) {
            this.processQueue(refreshError as AxiosError, null)
            this.clearTokens()
            this.handleAuthenticationError()
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
    const response = await axios.post<RefreshTokenResponse>(
      `${this.axiosInstance.defaults.baseURL}/auth/refresh`,
      {},
      { withCredentials: true, headers: { 'Content-Type': 'application/json' } },
    )
    const { accessToken } = response.data
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

  public post<T = unknown>(url: string, data?: unknown, config = {}) {
    return this.axiosInstance.post<T>(url, data, config)
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

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $api: ApiConnect
  }
}
