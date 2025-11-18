/**
 * Example usage of ApiConnect plugin
 * This file demonstrates how to use the API plugin in different scenarios
 */

import { apiConnect } from '@/plugins/apiConnect'

// ===== INTERFACES =====

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface LoginRequest {
  email: string
  password: string
}

interface LoginResponse {
  accessToken: string
  user: User
}

interface Company {
  id: string
  name: string
  cnpj: string
}

// ===== AUTHENTICATION =====

/**
 * Login example
 */
export async function loginUser(email: string, password: string): Promise<User | null> {
  try {
    const response = await apiConnect.post<LoginResponse>('/auth/login', {
      email,
      password,
    } as LoginRequest)

    if (response.data) {
      // Save access token (refresh token comes via HTTP-only cookie)
      apiConnect.setToken(response.data.accessToken)
      return response.data.user
    }

    return null
  } catch (error) {
    console.error('Login failed:', error)
    throw error
  }
}

/**
 * Logout example
 */
export async function logoutUser(): Promise<void> {
  await apiConnect.logout()
}

/**
 * Check if user is authenticated
 */
export function isUserAuthenticated(): boolean {
  return apiConnect.isAuthenticated()
}

// ===== USER OPERATIONS =====

/**
 * Get current user profile
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await apiConnect.get<User>('/users/me')
    return response.data
  } catch (error) {
    console.error('Failed to fetch current user:', error)
    return null
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(userId: string, data: Partial<User>): Promise<User | null> {
  try {
    const response = await apiConnect.put<User>(`/users/${userId}`, data)
    return response.data
  } catch (error) {
    console.error('Failed to update user:', error)
    throw error
  }
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers(): Promise<User[]> {
  try {
    const response = await apiConnect.get<User[]>('/users')
    return response.data
  } catch (error) {
    console.error('Failed to fetch users:', error)
    return []
  }
}

// ===== COMPANY OPERATIONS =====

/**
 * Get all companies
 */
export async function getCompanies(): Promise<Company[]> {
  try {
    const response = await apiConnect.get<Company[]>('/companies')
    return response.data
  } catch (error) {
    console.error('Failed to fetch companies:', error)
    return []
  }
}

/**
 * Create a new company
 */
export async function createCompany(companyData: Omit<Company, 'id'>): Promise<Company | null> {
  try {
    const response = await apiConnect.post<Company>('/companies', companyData)
    return response.data
  } catch (error) {
    console.error('Failed to create company:', error)
    throw error
  }
}

/**
 * Update company
 */
export async function updateCompany(
  companyId: string,
  data: Partial<Company>
): Promise<Company | null> {
  try {
    const response = await apiConnect.patch<Company>(`/companies/${companyId}`, data)
    return response.data
  } catch (error) {
    console.error('Failed to update company:', error)
    throw error
  }
}

/**
 * Delete company
 */
export async function deleteCompany(companyId: string): Promise<boolean> {
  try {
    await apiConnect.delete(`/companies/${companyId}`)
    return true
  } catch (error) {
    console.error('Failed to delete company:', error)
    return false
  }
}

// ===== ADVANCED USAGE =====

/**
 * Upload file with progress tracking
 */
export async function uploadFile(file: File, onProgress?: (progress: number) => void) {
  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await apiConnect.api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      },
    })

    return response.data
  } catch (error) {
    console.error('Failed to upload file:', error)
    throw error
  }
}

/**
 * Download file
 */
export async function downloadFile(fileId: string, filename: string): Promise<void> {
  try {
    const response = await apiConnect.api.get(`/files/${fileId}/download`, {
      responseType: 'blob',
    })

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Failed to download file:', error)
    throw error
  }
}

// ===== USAGE IN VUE COMPOSABLES =====

/**
 * Example composable for user management
 */
export function useUser() {
  const login = async (email: string, password: string) => {
    return await loginUser(email, password)
  }

  const logout = async () => {
    await logoutUser()
  }

  const isAuthenticated = () => {
    return isUserAuthenticated()
  }

  const getCurrentUserData = async () => {
    return await getCurrentUser()
  }

  return {
    login,
    logout,
    isAuthenticated,
    getCurrentUserData,
  }
}

/**
 * Example composable for company management
 */
export function useCompany() {
  const fetchCompanies = async () => {
    return await getCompanies()
  }

  const addCompany = async (companyData: Omit<Company, 'id'>) => {
    return await createCompany(companyData)
  }

  const editCompany = async (companyId: string, data: Partial<Company>) => {
    return await updateCompany(companyId, data)
  }

  const removeCompany = async (companyId: string) => {
    return await deleteCompany(companyId)
  }

  return {
    fetchCompanies,
    addCompany,
    editCompany,
    removeCompany,
  }
}

