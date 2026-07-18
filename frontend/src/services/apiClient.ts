import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '../store/authStore'

interface ApiErrorResponse {
  error?: {
    code?: string
    message?: string
    details?: any
  }
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

// Request interceptor
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add request timestamp for performance tracking
    config.metadata = { startTime: Date.now() }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Log slow requests
    const duration = Date.now() - (response.config as any).metadata?.startTime
    if (duration > 1000) {
      console.warn(`🐢 Slow API call: ${response.config.url} took ${duration}ms`)
    }
    return response
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as any
    
    // Handle 401 - Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        // Try to refresh token
        await apiClient.post('/auth/refresh')
        return apiClient(originalRequest)
      } catch (refreshError) {
        // Refresh failed - logout
        const { logout } = useAuthStore.getState()
        logout()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }
    
    // Handle 429 - Rate Limiting
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 60
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
      return apiClient(originalRequest)
    }
    
    // Handle 422 - Validation Error
    if (error.response?.status === 422) {
      const errorData = error.response.data as any
      const message = errorData.error?.message || 'Validation error'
      console.error('Validation error:', errorData.error?.details)
      return Promise.reject(new Error(message))
    }
    
    // Handle Network errors with retry
    if (!error.response && !originalRequest._retryCount) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1
      if (originalRequest._retryCount < 3) {
        const delay = Math.pow(2, originalRequest._retryCount) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
        return apiClient(originalRequest)
      }
    }
    
    // Normalize error message
    const errorData = error.response?.data as any
    const message = errorData?.error?.message || error.message || 'An unexpected error occurred'
    
    return Promise.reject(new Error(message))
  }
)

// Type-safe API methods
export const api = {
  get: <T = any>(url: string, params?: any) => 
    apiClient.get<T>(url, { params }).then(res => res.data),
  
  post: <T = any>(url: string, data?: any) => 
    apiClient.post<T>(url, data).then(res => res.data),
  
  put: <T = any>(url: string, data?: any) => 
    apiClient.put<T>(url, data).then(res => res.data),
  
  patch: <T = any>(url: string, data?: any) => 
    apiClient.patch<T>(url, data).then(res => res.data),
  
  delete: <T = any>(url: string) => 
    apiClient.delete<T>(url).then(res => res.data)
}

export default apiClient
