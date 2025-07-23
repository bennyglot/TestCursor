import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { StockData, StockUpdate } from '@/types/stock.interface'
import { WebSocketMessage, StocksUpdateMessage, AlertMessage, ScrapingStatusMessage } from '@/types/api.interface'

interface WebSocketContextType {
  isConnected: boolean
  stocks: StockData[]
  updates: StockUpdate[]
  lastUpdate: Date | null
  scrapingStatus: {
    status: 'STARTED' | 'SUCCESS' | 'ERROR' | 'IDLE'
    message: string
    nextRun?: Date
  }
  alerts: AlertMessage[]
  connect: () => void
  disconnect: () => void
  triggerDataFetch: () => void
}

const WebSocketContext = createContext<WebSocketContextType | null>(null)

export const useWebSocket = () => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}

interface WebSocketProviderProps {
  children: ReactNode
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [stocks, setStocks] = useState<StockData[]>([])
  const [updates, setUpdates] = useState<StockUpdate[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [scrapingStatus, setScrapingStatus] = useState({
    status: 'IDLE' as const,
    message: 'Ready to fetch data',
    nextRun: undefined as Date | undefined
  })
  const [alerts, setAlerts] = useState<AlertMessage[]>([])

  const connect = useCallback(() => {
    if (ws?.readyState === WebSocket.OPEN) {
      return
    }

    const wsUrl = `ws://localhost:3002`
    console.log('Connecting to WebSocket:', wsUrl)
    
    const newWs = new WebSocket(wsUrl)

    newWs.onopen = () => {
      console.log('WebSocket connected')
      setIsConnected(true)
    }

    newWs.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason)
      setIsConnected(false)
      
      // Reconnect after 3 seconds unless it was a manual close
      if (event.code !== 1000) {
        setTimeout(() => {
          console.log('Attempting to reconnect...')
          connect()
        }, 3000)
      }
    }

    newWs.onerror = (error) => {
      console.error('WebSocket error:', error)
      setIsConnected(false)
    }

    newWs.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data)
        handleMessage(message)
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    setWs(newWs)
  }, [ws])

  const disconnect = useCallback(() => {
    if (ws) {
      ws.close(1000, 'Manual disconnect')
      setWs(null)
      setIsConnected(false)
    }
  }, [ws])

  const triggerDataFetch = useCallback(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'REQUEST_LATEST_DATA',
        timestamp: new Date()
      }))
    }
  }, [ws])

  const handleMessage = useCallback((message: WebSocketMessage) => {
    console.log('Received WebSocket message:', message.type)

    switch (message.type) {
      case 'CONNECTION':
        console.log('Connection confirmed:', message.payload)
        break

      case 'STOCKS_UPDATE':
        const stocksMessage = message as StocksUpdateMessage
        setStocks(stocksMessage.payload.stocks)
        setUpdates(prev => [
          ...stocksMessage.payload.updates,
          ...prev.slice(0, 99) // Keep last 100 updates
        ])
        setLastUpdate(new Date(message.timestamp))
        console.log(`Updated ${stocksMessage.payload.stocks.length} stocks`)
        break

      case 'ALERT':
        const alertMessage = message as AlertMessage
        setAlerts(prev => [alertMessage, ...prev.slice(0, 49)]) // Keep last 50 alerts
        
        // Show browser notification if permission granted
        if (Notification.permission === 'granted') {
          new Notification(`Stock Alert: ${alertMessage.payload.stock.symbol}`, {
            body: alertMessage.payload.message,
            icon: '/favicon.ico',
            tag: alertMessage.payload.stock.symbol
          })
        }
        break

      case 'SCRAPING_STATUS':
        const statusMessage = message as ScrapingStatusMessage
        setScrapingStatus({
          status: statusMessage.payload.status,
          message: statusMessage.payload.message,
          nextRun: statusMessage.payload.nextRun ? new Date(statusMessage.payload.nextRun) : undefined
        })
        break

      case 'ERROR':
        console.error('WebSocket error message:', message.payload)
        break

      default:
        console.warn('Unknown message type:', message.type)
    }
  }, [])

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission)
      })
    }
  }, [])

  // Auto-connect on mount
  useEffect(() => {
    connect()
    
    return () => {
      disconnect()
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (ws) {
        ws.close()
      }
    }
  }, [ws])

  const value: WebSocketContextType = {
    isConnected,
    stocks,
    updates,
    lastUpdate,
    scrapingStatus,
    alerts,
    connect,
    disconnect,
    triggerDataFetch
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
} 