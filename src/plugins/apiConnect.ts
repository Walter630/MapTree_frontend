/**
 * plugins/apiConnect.ts
 *
 * API Connect Plugin - Axios configuration with automatic token refresh
 */

import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { App } from 'vue'

interface TokenData {
  accessToken: string | null
}

interface RefreshTokenResponse {
  accessToken: string
}

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  USER = 'USER'
}

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

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  user: User
}

export interface Company {
  id: string
  name: string
  taxId: string        // CNPJ ou CPF da empresa
  isOutsourced: boolean     //se é terceirizada
  managerId?: string
  manager: Manager
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


class ApiConnect {
  private axiosInstance: AxiosInstance
  private isRefreshing = false
  private failedRequestsQueue: Array<{
    onSuccess: (token: string) => void
    onFailure: (error: AxiosError) => void
  }> = []

  constructor() {
    // Create axios instance with base configuration
    this.axiosInstance = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
      timeout: 30000,
      withCredentials: true, // Send cookies with requests
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor - Add token to headers
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.getAccessToken()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor - Handle 401 and refresh token
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

        // Check if error is 401 and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // If already refreshing, queue the request
            return new Promise((resolve, reject) => {
              this.failedRequestsQueue.push({
                onSuccess: (token: string) => {
                  originalRequest.headers.Authorization = `Bearer ${token}`
                  resolve(this.axiosInstance(originalRequest))
                },
                onFailure: (err: AxiosError) => {
                  reject(err)
                },
              })
            })
          }

          originalRequest._retry = true
          this.isRefreshing = true

          try {
            const newToken = await this.refreshAccessToken()

            // Process queued requests
            this.processQueue(null, newToken)

            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            return this.axiosInstance(originalRequest)
          } catch (refreshError) {
            // Failed to refresh token
            this.processQueue(refreshError as AxiosError, null)
            this.clearTokens()

            // Redirect to login or emit event
            this.handleAuthenticationError()

            return Promise.reject(refreshError)
          } finally {
            this.isRefreshing = false
          }
        }

        return Promise.reject(error)
      }
    )
  }

  /**
   * Process queued requests after token refresh
   */
  private processQueue(error: AxiosError | null, token: string | null = null): void {
    this.failedRequestsQueue.forEach((promise) => {
      if (error) {
        promise.onFailure(error)
      } else if (token) {
        promise.onSuccess(token)
      }
    })

    this.failedRequestsQueue = []
  }

  /**
   * Refresh the access token using refresh token
   */
  private async refreshAccessToken(): Promise<string> {
    try {
      // The refresh token is automatically sent via httpOnly cookie
      const response = await axios.post<RefreshTokenResponse>(
        `${this.axiosInstance.defaults.baseURL}/auth/refresh`,
        {}, // Empty body - refresh token comes from cookie
        {
          withCredentials: true, // Include cookies in request
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      const { accessToken } = response.data

      // Save new access token (refresh token is managed by cookies)
      this.setAccessToken(accessToken)

      return accessToken
    } catch (error) {
      throw error
    }
  }

  /**
   * Handle authentication error (redirect to login, etc.)
   */
  private handleAuthenticationError(): void {
    // Emit custom event that can be listened to in the app
    window.dispatchEvent(new CustomEvent('auth:unauthorized'))

    // Optional: Redirect to login
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
  }

  /**
   * Get access token from storage
   */
  private getAccessToken(): string | null {
    return localStorage.getItem('accessToken')
  }

  /**
   * Set access token in storage
   */
  private setAccessToken(token: string): void {
    localStorage.setItem('accessToken', token)
  }

  /**
   * Clear all tokens from storage
   */
  private clearTokens(): void {
    localStorage.removeItem('accessToken')
    // Refresh token is cleared by the backend (cookie expiration)
  }

  /**
   * Public API methods
   */

  /**
   * Set access token (refresh token comes from cookie set by backend)
   */
  public setToken(accessToken: string): void {
    this.setAccessToken(accessToken)
  }

  /**
   * Get current access token
   */
  public getToken(): TokenData {
    return {
      accessToken: this.getAccessToken(),
    }
  }

  /**
   * Logout - clear tokens and call backend to clear cookie
   */
  public async logout(): Promise<void> {
    try {
      // Call backend to clear refresh token cookie
      await this.axiosInstance.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Always clear local access token
      this.clearTokens()
    }
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return !!this.getAccessToken()
  }

  /**
   * Get axios instance for making requests
   */
  public get api(): AxiosInstance {
    return this.axiosInstance
  }

  /**
   * Convenience methods for HTTP requests
   */
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

// Create singleton instance
const apiConnect = new ApiConnect()

// Vue plugin
export default {
  install: (app: App) => {
    // Make apiConnect available globally
    app.config.globalProperties.$api = apiConnect
    app.provide('api', apiConnect)
  },
}

// Export instance for use outside Vue components
export { apiConnect }

export type { ApiConnect }

// Type augmentation for Vue
declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $api: ApiConnect
  }
}

