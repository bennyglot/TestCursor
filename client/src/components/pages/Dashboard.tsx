import React, { useState } from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip
} from '@mui/material'
import { Refresh, History } from '@mui/icons-material'
import { useWebSocket } from '@/hooks/useWebSocket'
import StocksDataGrid from '@/components/stocks/StocksDataGrid'
import StockUpdatesCard from '@/components/stocks/StockUpdatesCard'
import StockHistoryModal from '@/components/stocks/StockHistoryModal'
import { StockData } from '@/types/stock.interface'

const Dashboard: React.FC = () => {
  const { stocks, updates, lastUpdate, triggerDataFetch, scrapingStatus } = useWebSocket()
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)

  const handleViewHistory = (stock: StockData) => {
    setSelectedStock(stock)
    setHistoryModalOpen(true)
  }

  const handleCloseHistoryModal = () => {
    setHistoryModalOpen(false)
    setSelectedStock(null)
  }

  const topGainers = stocks
    .filter(stock => stock.percentChange > 0)
    .sort((a, b) => b.percentChange - a.percentChange)
    .slice(0, 3)

  const totalVolume = stocks.reduce((sum, stock) => sum + stock.premarketVolume, 0)
  const averageGain = stocks.length > 0 
    ? stocks.reduce((sum, stock) => sum + stock.percentChange, 0) / stocks.length
    : 0

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Total Stocks
              </Typography>
              <Typography variant="h4" component="div">
                {stocks.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active premarket gainers
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Average Gain
              </Typography>
              <Typography variant="h4" component="div" color="success.main">
                {averageGain.toFixed(2)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Across all stocks
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Total Volume
              </Typography>
              <Typography variant="h4" component="div">
                {(totalVolume / 1000000).toFixed(1)}M
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Premarket trading volume
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Recent Updates
              </Typography>
              <Typography variant="h4" component="div">
                {updates.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Price changes detected
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Top Gainers */}
      {topGainers.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Top Gainers
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {topGainers.map((stock, index) => (
                <Chip
                  key={stock.symbol}
                  label={`#${index + 1} ${stock.symbol}: +${stock.percentChange.toFixed(2)}%`}
                  color={index === 0 ? 'primary' : 'default'}
                  variant="outlined"
                  onClick={() => handleViewHistory(stock)}
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Action Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h1">
          Market Data
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {lastUpdate && (
            <Typography variant="body2" color="text.secondary">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </Typography>
          )}
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={triggerDataFetch}
            disabled={scrapingStatus.status === 'STARTED'}
          >
            Refresh Data
          </Button>
        </Box>
      </Box>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Stocks Table */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent sx={{ p: 0 }}>
              <StocksDataGrid
                stocks={stocks}
                onViewHistory={handleViewHistory}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Updates */}
        <Grid item xs={12} lg={4}>
          <StockUpdatesCard updates={updates} />
        </Grid>
      </Grid>

      {/* Stock History Modal */}
      <StockHistoryModal
        open={historyModalOpen}
        onClose={handleCloseHistoryModal}
        stock={selectedStock}
      />
    </Box>
  )
}

export default Dashboard 