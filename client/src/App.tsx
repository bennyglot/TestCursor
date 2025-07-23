import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Container, Box } from '@mui/material'
import { WebSocketProvider } from '@/hooks/useWebSocket'
import AppHeader from '@/components/layout/AppHeader'
import Dashboard from '@/components/pages/Dashboard'
import AlertsPage from '@/components/pages/AlertsPage'
import StockHistoryPage from '@/components/pages/StockHistoryPage'

function App() {
  return (
    <WebSocketProvider>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AppHeader />
        <Container maxWidth="xl" sx={{ mt: 2, mb: 4, flex: 1 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/stock/:symbol" element={<StockHistoryPage />} />
          </Routes>
        </Container>
      </Box>
    </WebSocketProvider>
  )
}

export default App 