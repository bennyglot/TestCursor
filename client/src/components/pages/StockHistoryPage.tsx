import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Alert,
  CircularProgress,
  Breadcrumbs,
  Link
} from '@mui/material'
import { ArrowBack, Home, TrendingUp } from '@mui/icons-material'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { StockData } from '@/types/stock.interface'
import ApiService from '@/services/api.service'
import { format, parseISO } from 'date-fns'

const StockHistoryPage: React.FC = () => {
  const { symbol } = useParams<{ symbol: string }>()
  const navigate = useNavigate()
  const [stockHistory, setStockHistory] = useState<StockData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (symbol) {
      fetchStockHistory()
    }
  }, [symbol])

  const fetchStockHistory = async () => {
    if (!symbol) return

    setLoading(true)
    setError(null)

    try {
      const history = await ApiService.getStockHistory(symbol.toUpperCase(), 100)
      setStockHistory(history)
    } catch (error) {
      setError(`Failed to load history for ${symbol}`)
      console.error('Error fetching stock history:', error)
    } finally {
      setLoading(false)
    }
  }

  const chartData = stockHistory.map(item => ({
    timestamp: format(parseISO(item.timestamp.toString()), 'MMM dd HH:mm'),
    price: item.premarketPrice,
    percentChange: item.percentChange,
    volume: item.premarketVolume / 1000000, // Convert to millions
    rank: item.rank
  })).reverse() // Show chronological order

  const getStats = () => {
    if (stockHistory.length === 0) return null

    const prices = stockHistory.map(d => d.premarketPrice)
    const changes = stockHistory.map(d => d.percentChange)
    const volumes = stockHistory.map(d => d.premarketVolume)
    const ranks = stockHistory.map(d => d.rank)

    const latest = stockHistory[0]
    const oldest = stockHistory[stockHistory.length - 1]

    return {
      latest,
      oldest,
      highest: Math.max(...prices),
      lowest: Math.min(...prices),
      avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
      maxChange: Math.max(...changes),
      minChange: Math.min(...changes),
      avgChange: changes.reduce((a, b) => a + b, 0) / changes.length,
      totalVolume: volumes.reduce((a, b) => a + b, 0),
      avgVolume: volumes.reduce((a, b) => a + b, 0) / volumes.length,
      bestRank: Math.min(...ranks),
      worstRank: Math.max(...ranks),
      totalEntries: stockHistory.length
    }
  }

  const stats = getStats()

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={60} />
      </Box>
    )
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/')}>
          Back to Dashboard
        </Button>
      </Box>
    )
  }

  if (stockHistory.length === 0) {
    return (
      <Box>
        <Alert severity="info" sx={{ mb: 3 }}>
          No historical data available for {symbol?.toUpperCase()}
        </Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/')}>
          Back to Dashboard
        </Button>
      </Box>
    )
  }

  return (
    <Box>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link 
          underline="hover" 
          color="inherit" 
          onClick={() => navigate('/')}
          sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <Home sx={{ mr: 0.5 }} fontSize="inherit" />
          Dashboard
        </Link>
        <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
          <TrendingUp sx={{ mr: 0.5 }} fontSize="inherit" />
          {symbol?.toUpperCase()}
        </Typography>
      </Breadcrumbs>

      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            {stats?.latest.symbol} - {stats?.latest.companyName}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Historical performance analysis
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/')}
        >
          Back to Dashboard
        </Button>
      </Box>

      {/* Current Status */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Current Price
                </Typography>
                <Typography variant="h4" component="div">
                  ${stats.latest.premarketPrice.toFixed(2)}
                </Typography>
                <Typography variant="body2" color={stats.latest.percentChange >= 0 ? 'success.main' : 'error.main'}>
                  {stats.latest.percentChange >= 0 ? '+' : ''}{stats.latest.percentChange.toFixed(2)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Current Rank
                </Typography>
                <Typography variant="h4" component="div" color="primary.main">
                  #{stats.latest.rank}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Best: #{stats.bestRank}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Volume
                </Typography>
                <Typography variant="h4" component="div">
                  {(stats.latest.premarketVolume / 1000000).toFixed(1)}M
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stats.latest.marketCap}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Data Points
                </Typography>
                <Typography variant="h4" component="div">
                  {stats.totalEntries}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Historical records
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Statistics Summary */}
      {stats && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Performance Summary
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="body2" color="textSecondary">
                  Price Range
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  ${stats.lowest.toFixed(2)} - ${stats.highest.toFixed(2)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="body2" color="textSecondary">
                  Change Range
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  {stats.minChange.toFixed(2)}% - {stats.maxChange.toFixed(2)}%
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="body2" color="textSecondary">
                  Average Change
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold', color: stats.avgChange >= 0 ? 'success.main' : 'error.main' }}>
                  {stats.avgChange >= 0 ? '+' : ''}{stats.avgChange.toFixed(2)}%
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="body2" color="textSecondary">
                  Rank Range
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  #{stats.bestRank} - #{stats.worstRank}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="body2" color="textSecondary">
                  Total Volume
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  {(stats.totalVolume / 1000000).toFixed(1)}M
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="body2" color="textSecondary">
                  Average Volume
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  {(stats.avgVolume / 1000000).toFixed(1)}M
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Price Chart */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Price History
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#1976d2" 
                    fill="#1976d2"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Percentage Change Chart */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Percentage Change
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(2)}%`, 'Change']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="percentChange" 
                    stroke="#4caf50" 
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Volume Chart */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Volume (Millions)
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(1)}M`, 'Volume']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="volume" 
                    stroke="#ff9800" 
                    fill="#ff9800"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Rank Chart */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Rank History (Lower is Better)
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis reversed />
                  <Tooltip 
                    formatter={(value: number) => [`#${value}`, 'Rank']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="rank" 
                    stroke="#9c27b0" 
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

export default StockHistoryPage 