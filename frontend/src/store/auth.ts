import { create } from 'zustand'
import { apiClient } from '@/lib/api-client'

export interface User {
  id: number
  email: string
  name: string
  is_active: boolean
  created_at: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean
  isInitialized: boolean
  error: string | null

  // Actions
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  setUser: (user: User | null) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  loadFromStorage: () => void
}

export const useAuthStore = create<AuthState>((set) => {
  return {
    user: null,
    accessToken: null,
    refreshToken: null,
    isLoading: false,
    isInitialized: false,
    error: null,

    login: async (email: string, password: string) => {
      set({ isLoading: true, error: null })
      try {
        const response = await apiClient.login(email, password)
        const { access_token, refresh_token } = response.data

        // Store tokens
        localStorage.setItem('accessToken', access_token)
        localStorage.setItem('refreshToken', refresh_token)
        apiClient.setToken(access_token)

        // Get user details
        const userResponse = await apiClient.getCurrentUser(access_token)
        const user = userResponse.data

        set({
          user,
          accessToken: access_token,
          refreshToken: refresh_token,
          isLoading: false,
        })
      } catch (error: any) {
        set({
          error: error.response?.data?.detail || 'Login failed',
          isLoading: false,
        })
        throw error
      }
    },

    register: async (email: string, password: string, name: string) => {
      set({ isLoading: true, error: null })
      try {
        const response = await apiClient.register(email, password, name)
        const user = response.data
        set({
          user,
          isLoading: false,
        })
      } catch (error: any) {
        set({
          error: error.response?.data?.detail || 'Registration failed',
          isLoading: false,
        })
        throw error
      }
    },

    logout: () => {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        error: null,
      })
    },

    setUser: (user) => {
      set({ user })
    },

    setTokens: (accessToken, refreshToken) => {
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      apiClient.setToken(accessToken)
      set({ accessToken, refreshToken })
    },

    loadFromStorage: () => {
      if (typeof window === 'undefined') return

      const accessToken = localStorage.getItem('accessToken')
      const refreshToken = localStorage.getItem('refreshToken')

      if (accessToken && refreshToken) {
        apiClient.setToken(accessToken)
        set({ accessToken, refreshToken, isInitialized: true })

        // Fetch user data
        apiClient.getCurrentUser(accessToken).then((response) => {
          set({ user: response.data })
        }).catch((err) => {
          console.error('Failed to load user:', err)
        })
      } else {
        set({ isInitialized: true })
      }
    },
  }
})

// Auto-load from storage on app start
if (typeof window !== 'undefined') {
  useAuthStore.getState().loadFromStorage()
}
