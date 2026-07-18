import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface Leave {
  id: number
  employee_id: number
  leave_type: string
  start_date: string
  end_date: string
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn'
  reason: string
  days: number
  created_at: string
}

interface LeaveState {
  leaves: Leave[]
  selectedLeave: Leave | null
  isLoading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
  }
  filters: {
    status?: string
    leave_type?: string
    start_date?: string
    end_date?: string
  }
  fetchLeaves: () => Promise<void>
  applyLeave: (data: Omit<Leave, 'id' | 'created_at' | 'status'>) => Promise<void>
  approveLeave: (id: number) => Promise<void>
  rejectLeave: (id: number, reason?: string) => Promise<void>
  setPage: (page: number) => void
  setFilters: (filters: Partial<LeaveState['filters']>) => void
}

export const useLeaveStore = create<LeaveState>()(
  devtools(
    (set, get) => ({
      leaves: [],
      selectedLeave: null,
      isLoading: false,
      error: null,
      pagination: { page: 1, limit: 20, total: 0 },
      filters: {},
      
      fetchLeaves: async () => {
        set({ isLoading: true, error: null })
        try {
          // TODO: Implement API call
          // const response = await leaveService.getLeaves({
          //   page: get().pagination.page,
          //   limit: get().pagination.limit,
          //   ...get().filters
          // })
          // set({ 
          //   leaves: response.data,
          //   pagination: { ...get().pagination, total: response.total }
          // })
          set({ isLoading: false })
        } catch (error: any) {
          set({ error: error.message, isLoading: false })
        }
      },
      
      applyLeave: async (data) => {
        set({ isLoading: true, error: null })
        try {
          // TODO: Implement API call
          // const leave = await leaveService.applyLeave(data)
          // set(state => ({ leaves: [leave, ...state.leaves] }))
          set({ isLoading: false })
        } catch (error: any) {
          set({ error: error.message, isLoading: false })
          throw error
        }
      },
      
      approveLeave: async (id: number) => {
        set({ isLoading: true, error: null })
        try {
          // TODO: Implement API call
          // await leaveService.approveLeave(id)
          // set(state => ({
          //   leaves: state.leaves.map(l => 
          //     l.id === id ? { ...l, status: 'approved' } : l
          //   )
          // }))
          set({ isLoading: false })
        } catch (error: any) {
          set({ error: error.message, isLoading: false })
          throw error
        }
      },
      
      rejectLeave: async (id: number, reason?: string) => {
        set({ isLoading: true, error: null })
        try {
          // TODO: Implement API call
          set({ isLoading: false })
        } catch (error: any) {
          set({ error: error.message, isLoading: false })
          throw error
        }
      },
      
      setPage: (page: number) => {
        set(state => ({ pagination: { ...state.pagination, page } }))
        get().fetchLeaves()
      },
      
      setFilters: (filters) => {
        set(state => ({ 
          filters: { ...state.filters, ...filters },
          pagination: { ...state.pagination, page: 1 }
        }))
        get().fetchLeaves()
      }
    })
  )
)
