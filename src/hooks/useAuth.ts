/**
 * hooks/useAuth.ts
 *
 * Composable de autenticação — login, logout e gerenciamento de estado do usuário.
 */

import { ref, computed } from 'vue'
import { apiConnect } from '@/plugins/apiConnect'
import { useRouter } from 'vue-router'

/* ===================================
   TIPOS
=================================== */

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

/* ===================================
   COMPOSABLE
=================================== */

export function useAuth() {
  const router = useRouter()

  /* ---------- Estado ---------- */

  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  /* ---------- Computed ---------- */

  const isAuthenticated = computed(() => apiConnect.isAuthenticated())
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isGestor = computed(() => user.value?.role === 'gestor')

  /* ---------- Login ---------- */

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    loading.value = true
    error.value = null

    try {
      const response = await apiConnect.post<LoginResponse>('/auth/login', credentials)

      if (response.data) {
        apiConnect.setToken(response.data.accessToken)
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

  /* ---------- Logout ---------- */

  const logout = async (): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      await apiConnect.logout()
      user.value = null
      router.push('/login')
    } catch (err: unknown) {
      console.error('Logout error:', err)
      user.value = null
      router.push('/login')
    } finally {
      loading.value = false
    }
  }

  /* ---------- Buscar Usuário Atual ---------- */

  const getCurrentUser = async (): Promise<User | null> => {
    if (!isAuthenticated.value) return null

    loading.value = true
    error.value = null

    try {
      const response = await apiConnect.get<User>('/users/me/profile')

      if (response.data) {
        user.value = response.data
        return response.data
      }

      return null
    } catch (err: unknown) {
      console.error('Get current user error:', err)

      const errorData = err as { response?: { status?: number } }

      if (errorData.response?.status === 401) {
        await logout()
      }

      error.value = 'Erro ao buscar dados do usuário'
      return null
    } finally {
      loading.value = false
    }
  }

  /* ---------- Helpers de Role ---------- */

  const hasRole = (role: string): boolean => user.value?.role === role

  const hasAnyRole = (roles: string[]): boolean => roles.some((role) => user.value?.role === role)

  /* ---------- Limpar Erro ---------- */

  const clearError = (): void => {
    error.value = null
  }

  /* ---------- Retorno ---------- */

  return {
    // Estado
    user,
    loading,
    error,

    // Computed
    isAuthenticated,
    isAdmin,
    isGestor,

    // Métodos
    login,
    logout,
    getCurrentUser,
    hasRole,
    hasAnyRole,
    clearError,
  }
}
