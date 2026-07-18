import { useAuthStore } from '../store/authStore'

export function useAuth() {
  const { user, isAuthenticated, isLoading, login, logout, setUser } = useAuthStore()
  
  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    setUser
  }
}
