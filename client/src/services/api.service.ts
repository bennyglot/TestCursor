import axios from 'axios'
import { StockData, StockUpdate, AlertRule } from '@/types/stock.interface'
import { ApiResponse, PaginatedResponse } from '@/types/api.interface'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for debugging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    console.error('API Request Error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export class ApiService {
  // Stock-related endpoints
  static async getLatestStocks(limit = 50): Promise<StockData[]> {
    const response = await apiClient.get<ApiResponse<StockData[]>>('/stocks', {
      params: { limit }
    })
    return response.data.data || []
  }

  static async getTopGainers(limit = 10): Promise<StockData[]> {
    const response = await apiClient.get<ApiResponse<StockData[]>>('/stocks/top-gainers', {
      params: { limit }
    })
    return response.data.data || []
  }

  static async getStockHistory(symbol: string, limit = 100): Promise<StockData[]> {
    const response = await apiClient.get<ApiResponse<StockData[]>>(`/stocks/${symbol}/history`, {
      params: { limit }
    })
    return response.data.data || []
  }

  static async getStockUpdates(page = 1, limit = 50): Promise<PaginatedResponse<StockUpdate>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<StockUpdate>>>('/stocks/updates', {
      params: { page, limit }
    })
    return response.data.data || { data: [], total: 0, page: 1, limit: 50, totalPages: 1 }
  }

  static async searchStocks(query: string, limit = 20): Promise<StockData[]> {
    const response = await apiClient.get<ApiResponse<StockData[]>>('/stocks/search', {
      params: { query, limit }
    })
    return response.data.data || []
  }

  static async triggerManualScraping(): Promise<{ status: string }> {
    const response = await apiClient.post<ApiResponse<{ status: string }>>('/stocks/scraping/trigger')
    return response.data.data || { status: 'unknown' }
  }

  static async getScrapingStatus(): Promise<{
    isRunning: boolean
    lastRun?: Date
    nextRun?: Date
    intervalMinutes: number
  }> {
    const response = await apiClient.get<ApiResponse<{
      isRunning: boolean
      lastRun?: string
      nextRun?: string
      intervalMinutes: number
    }>>('/stocks/scraping/status')
    
    const data = response.data.data
    return {
      isRunning: data?.isRunning || false,
      lastRun: data?.lastRun ? new Date(data.lastRun) : undefined,
      nextRun: data?.nextRun ? new Date(data.nextRun) : undefined,
      intervalMinutes: data?.intervalMinutes || 1
    }
  }

  // Alert-related endpoints
  static async getAlertRules(): Promise<AlertRule[]> {
    const response = await apiClient.get<ApiResponse<AlertRule[]>>('/alerts')
    return response.data.data || []
  }

  static async getActiveAlertRules(): Promise<AlertRule[]> {
    const response = await apiClient.get<ApiResponse<AlertRule[]>>('/alerts/active')
    return response.data.data || []
  }

  static async createAlertRule(rule: Omit<AlertRule, 'id' | 'createdAt'>): Promise<{ id: number; rule: typeof rule }> {
    const response = await apiClient.post<ApiResponse<{ id: number; rule: typeof rule }>>('/alerts', rule)
    return response.data.data || { id: 0, rule }
  }

  static async updateAlertRule(id: number, updates: Partial<AlertRule>): Promise<{ id: number; updates: typeof updates }> {
    const response = await apiClient.put<ApiResponse<{ id: number; updates: typeof updates }>>(`/alerts/${id}`, updates)
    return response.data.data || { id, updates }
  }

  static async deleteAlertRule(id: number): Promise<{ id: number }> {
    const response = await apiClient.delete<ApiResponse<{ id: number }>>(`/alerts/${id}`)
    return response.data.data || { id }
  }

  // Health check
  static async getHealth(): Promise<{
    status: string
    message: string
    timestamp: Date
    version: string
  }> {
    const response = await apiClient.get<{
      status: string
      message: string
      timestamp: string
      version: string
    }>('/health')
    
    return {
      status: response.data.status,
      message: response.data.message,
      timestamp: new Date(response.data.timestamp),
      version: response.data.version
    }
  }

  // WebSocket info
  static async getWebSocketInfo(): Promise<{
    websocketUrl: string
    port: number
    protocols: string[]
    features: string[]
  }> {
    const response = await apiClient.get<ApiResponse<{
      websocketUrl: string
      port: number
      protocols: string[]
      features: string[]
    }>>('/websocket/info')
    
    return response.data.data || {
      websocketUrl: 'ws://localhost:3002',
      port: 3002,
      protocols: ['ws'],
      features: []
    }
  }
}

export default ApiService 