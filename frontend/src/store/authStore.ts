import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface User {
  id: number
  email: string
  full_name: string
  is_superuser: boolean
  is_active: boolean
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setUser: (user: User) => void
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        
        login: async (email: string, password: string) => {
          set({ isLoading: true, error: null })
          try {
            // TODO: Implement actual API call
            // const response = await apiClient.post('/auth/login', { email, password })
            // set({ user: response.data, isAuthenticated: true })
            set({ isLoading: false })
          } catch (error: any) {
            set({ error: error.message, isLoading: false })
            throw error
          }
        },
        
        logout: () => {
          set({ user: null, isAuthenticated: false })
          // TODO: Call logout API
        },
        
        setUser: (user: User) => {
          set({ user, isAuthenticated: true })
        }
      }),
      { 
        name: 'auth-storage',
        partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated })
      }
    )
  )
)
