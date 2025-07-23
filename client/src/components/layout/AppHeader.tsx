import React from 'react'
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  Chip, 
  IconButton,
  Button,
  useTheme
} from '@mui/material'
import { 
  TrendingUp,
  Circle,
  Notifications,
  PlayArrow,
  Dashboard,
  Warning
} from '@mui/icons-material'
import { Link, useLocation } from 'react-router-dom'
import { useWebSocket } from '@/hooks/useWebSocket'
import { format } from 'date-fns'

const AppHeader: React.FC = () => {
  const theme = useTheme()
  const location = useLocation()
  const { 
    isConnected, 
    stocks, 
    lastUpdate, 
    scrapingStatus, 
    alerts,
    triggerDataFetch
  } = useWebSocket()

  const getConnectionStatus = () => {
    if (isConnected) {
      return (
        <Chip
          icon={<Circle sx={{ color: theme.palette.success.main }} />}
          label="Connected"
          variant="outlined"
          size="small"
          sx={{ 
            color: theme.palette.success.main,
            borderColor: theme.palette.success.main
          }}
        />
      )
    } else {
      return (
        <Chip
          icon={<Circle sx={{ color: theme.palette.error.main }} />}
          label="Disconnected"
          variant="outlined"
          size="small"
          sx={{ 
            color: theme.palette.error.main,
            borderColor: theme.palette.error.main
          }}
        />
      )
    }
  }

  const getScrapingStatusChip = () => {
    const statusColors = {
      STARTED: theme.palette.warning.main,
      SUCCESS: theme.palette.success.main,
      ERROR: theme.palette.error.main,
      IDLE: theme.palette.grey[500]
    }

    return (
      <Chip
        label={scrapingStatus.status}
        size="small"
        sx={{ 
          color: statusColors[scrapingStatus.status],
          borderColor: statusColors[scrapingStatus.status]
        }}
        variant="outlined"
      />
    )
  }

  return (
    <AppBar position="static" elevation={1}>
      <Toolbar>
        <TrendingUp sx={{ mr: 2 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Stock Monitor
        </Typography>

        {/* Navigation Links */}
        <Box sx={{ display: 'flex', gap: 2, mr: 3 }}>
          <Button
            component={Link}
            to="/"
            color="inherit"
            startIcon={<Dashboard />}
            variant={location.pathname === '/' ? 'outlined' : 'text'}
          >
            Dashboard
          </Button>
          <Button
            component={Link}
            to="/alerts"
            color="inherit"
            startIcon={<Notifications />}
            variant={location.pathname === '/alerts' ? 'outlined' : 'text'}
          >
            Alerts
            {alerts.length > 0 && (
              <Chip
                label={alerts.length}
                size="small"
                color="error"
                sx={{ ml: 1, height: 20, minWidth: 20 }}
              />
            )}
          </Button>
        </Box>

        {/* Status Information */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Stock Count */}
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            {stocks.length} stocks
          </Typography>

          {/* Last Update */}
          {lastUpdate && (
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Updated: {format(lastUpdate, 'HH:mm:ss')}
            </Typography>
          )}

          {/* Scraping Status */}
          {getScrapingStatusChip()}

          {/* Manual Trigger Button */}
          <IconButton
            color="inherit"
            onClick={triggerDataFetch}
            disabled={!isConnected || scrapingStatus.status === 'STARTED'}
            title="Trigger manual data fetch"
          >
            <PlayArrow />
          </IconButton>

          {/* Connection Status */}
          {getConnectionStatus()}
        </Box>
      </Toolbar>

      {/* Status Bar */}
      {scrapingStatus.message && (
        <Box 
          sx={{ 
            px: 2, 
            py: 0.5, 
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            borderTop: '1px solid rgba(255, 255, 255, 0.12)'
          }}
        >
          <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center' }}>
            <Warning sx={{ mr: 1, fontSize: 16 }} />
            {scrapingStatus.message}
            {scrapingStatus.nextRun && (
              <span style={{ marginLeft: 8 }}>
                Next run: {format(scrapingStatus.nextRun, 'HH:mm:ss')}
              </span>
            )}
          </Typography>
        </Box>
      )}
    </AppBar>
  )
}

export default AppHeader 