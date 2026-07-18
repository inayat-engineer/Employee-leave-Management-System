import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '../services/apiClient'

interface UseApiOptions {
  immediate?: boolean
  onSuccess?: (data: any) => void
  onError?: (error: Error) => void
}

export function useApi<T = any>(url: string, options: UseApiOptions = {}) {
  const { immediate = true, onSuccess, onError } = options
  
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const execute = useCallback(async (params?: any) => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.get<T>(url, { params })
      setData(response.data)
      onSuccess?.(response.data)
      return response.data
    } catch (err) {
      const error = err as Error
      setError(error)
      onError?.(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [url, onSuccess, onError])

  useEffect(() => {
    if (immediate) {
      execute()
    }
  }, [immediate, execute])

  return { data, loading, error, execute, refetch: execute }
}
