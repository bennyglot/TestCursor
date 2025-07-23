import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert
} from '@mui/material'
import { Close, TrendingUp } from '@mui/icons-material'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { StockData } from '@/types/stock.interface'
import ApiService from '@/services/api.service'
import { format } from 'date-fns'

interface StockHistoryModalProps {
  open: boolean
  onClose: () => void
  stock: StockData | null
}

const StockHistoryModal: React.FC<StockHistoryModalProps> = ({ open, onClose, stock }) => {
  const [historyData, setHistoryData] = useState<StockData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && stock) {
      fetchStockHistory()
    }
  }, [open, stock])

  const fetchStockHistory = async () => {
    if (!stock) return

    setLoading(true)
    setError(null)
    
    try {
      const history = await ApiService.getStockHistory(stock.symbol, 50)
      setHistoryData(history)
    } catch (error) {
      setError('Failed to load stock history')
      console.error('Error fetching stock history:', error)
    } finally {
      setLoading(false)
    }
  }

  const chartData = historyData.map(item => ({
    time: format(item.timestamp, 'HH:mm'),
    price: item.premarketPrice,
    percentChange: item.percentChange,
    volume: item.premarketVolume,
    rank: item.rank
  })).reverse() // Show chronological order

  const getStats = () => {
    if (historyData.length === 0) return null

    const prices = historyData.map(d => d.premarketPrice)
    const changes = historyData.map(d => d.percentChange)
    const volumes = historyData.map(d => d.premarketVolume)

    return {
      highest: Math.max(...prices),
      lowest: Math.min(...prices),
      avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
      maxChange: Math.max(...changes),
      minChange: Math.min(...changes),
      avgVolume: volumes.reduce((a, b) => a + b, 0) / volumes.length,
      totalEntries: historyData.length
    }
  }

  const stats = getStats()

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TrendingUp sx={{ mr: 1 }} />
          <Typography variant="h6">
            {stock ? `${stock.symbol} - ${stock.companyName}` : 'Stock History'}
          </Typography>
        </Box>
        <Button onClick={onClose} size="small">
          <Close />
        </Button>
      </DialogTitle>

      <DialogContent>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && historyData.length === 0 && (
          <Alert severity="info">
            No historical data available for {stock?.symbol}
          </Alert>
        )}

        {!loading && !error && historyData.length > 0 && (
          <Grid container spacing={3}>
            {/* Current Stats */}
            {stock && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Current Status
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="textSecondary">
                          Rank
                        </Typography>
                        <Typography variant="h6">
                          #{stock.rank}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="textSecondary">
                          Price
                        </Typography>
                        <Typography variant="h6">
                          ${stock.premarketPrice.toFixed(2)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="textSecondary">
                          Change
                        </Typography>
                        <Typography variant="h6" color={stock.percentChange >= 0 ? 'success.main' : 'error.main'}>
                          {stock.percentChange >= 0 ? '+' : ''}{stock.percentChange.toFixed(2)}%
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="textSecondary">
                          Volume
                        </Typography>
                        <Typography variant="h6">
                          {(stock.premarketVolume / 1000000).toFixed(1)}M
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Historical Stats */}
            {stats && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Historical Statistics ({stats.totalEntries} data points)
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6} sm={4}>
                        <Typography variant="body2" color="textSecondary">
                          Highest Price
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                          ${stats.highest.toFixed(2)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={4}>
                        <Typography variant="body2" color="textSecondary">
                          Lowest Price
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                          ${stats.lowest.toFixed(2)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={4}>
                        <Typography variant="body2" color="textSecondary">
                          Average Price
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                          ${stats.avgPrice.toFixed(2)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={4}>
                        <Typography variant="body2" color="textSecondary">
                          Max Change
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                          +{stats.maxChange.toFixed(2)}%
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={4}>
                        <Typography variant="body2" color="textSecondary">
                          Min Change
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 'bold', color: stats.minChange < 0 ? 'error.main' : 'inherit' }}>
                          {stats.minChange.toFixed(2)}%
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={4}>
                        <Typography variant="body2" color="textSecondary">
                          Avg Volume
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                          {(stats.avgVolume / 1000000).toFixed(1)}M
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Price Chart */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Price History
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                        labelFormatter={(label) => `Time: ${label}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="price" 
                        stroke="#1976d2" 
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Percentage Change Chart */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Percentage Change
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number) => [`${value.toFixed(2)}%`, 'Change']}
                        labelFormatter={(label) => `Time: ${label}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="percentChange" 
                        stroke="#4caf50" 
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default StockHistoryModal 