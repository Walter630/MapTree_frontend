/**
 * Composable for Authentication
 *
 * Provides methods for login, logout, and auth state management
 * Uses the ApiConnect plugin for HTTP requests
 */

import { ref, computed } from 'vue'
import { apiConnect } from '@/plugins/apiConnect'
import { useRouter } from 'vue-router'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface LoginCredentials {
  email: string
  password: string
}

interface LoginResponse {
  accessToken: string
  user: User
}

export function useAuth() {
  const router = useRouter()

  // State
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const isAuthenticated = computed(() => apiConnect.isAuthenticated())
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isGestor = computed(() => user.value?.role === 'gestor')

  /**
   * Login user
   */
  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    loading.value = true
    error.value = null

    try {
      const response = await apiConnect.post<LoginResponse>('/auth/login', credentials)

      if (response.data) {
        // Save access token (refresh token comes via HTTP-only cookie)
        apiConnect.setToken(response.data.accessToken)

        // Save user data
        user.value = response.data.user

        return true
      }

      return false
    } catch (err: unknown) {
      console.error('Login error:', err)

      const errorData = err as { response?: { status?: number }; code?: string }

      if (errorData.response?.status === 401) {
        error.value = 'Email ou senha incorretos'
      } else if (errorData.response?.status === 400) {
        error.value = 'Dados inválidos'
      } else if (errorData.code === 'ERR_NETWORK') {
        error.value = 'Erro de conexão'
      } else {
        error.value = 'Erro ao fazer login'
      }

      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Logout user
   */
  const logout = async (): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      // Call backend to clear refresh token cookie
      await apiConnect.logout()

      // Clear user data
      user.value = null

      // Redirect to login
      router.push('/login')
    } catch (err: unknown) {
      console.error('Logout error:', err)

      // Clear local data anyway
      user.value = null
      router.push('/login')
    } finally {
      loading.value = false
    }
  }

  /**
   * Get current user data
   */
  const getCurrentUser = async (): Promise<User | null> => {
    if (!isAuthenticated.value) {
      return null
    }

    loading.value = true
    error.value = null

    try {
      const response = await apiConnect.get<User>('/users/me')

      if (response.data) {
        user.value = response.data
        return response.data
      }

      return null
    } catch (err: unknown) {
      console.error('Get current user error:', err)

      const error_data = err as { response?: { status?: number } }

      if (error_data.response?.status === 401) {
        // Token expired, logout
        await logout()
      }

      error.value = 'Erro ao buscar dados do usuário'
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Check if user has a specific role
   */
  const hasRole = (role: string): boolean => {
    return user.value?.role === role
  }

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = (roles: string[]): boolean => {
    return roles.some(role => user.value?.role === role)
  }

  /**
   * Clear error message
   */
  const clearError = (): void => {
    error.value = null
  }

  return {
    // State
    user,
    loading,
    error,

    // Computed
    isAuthenticated,
    isAdmin,
    isGestor,

    // Methods
    login,
    logout,
    getCurrentUser,
    hasRole,
    hasAnyRole,
    clearError,
  }
}

