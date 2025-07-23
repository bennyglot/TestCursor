import React from 'react'
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Box,
  Chip,
  Divider
} from '@mui/material'
import {
  NotificationsActive,
  TrendingUp,
  VolumeUp,
  NewReleases,
  Warning
} from '@mui/icons-material'
import { AlertMessage } from '@/types/api.interface'
import { formatDistanceToNow } from 'date-fns'

interface RecentAlertsCardProps {
  alerts: AlertMessage[]
}

const RecentAlertsCard: React.FC<RecentAlertsCardProps> = ({ alerts }) => {
  const getAlertIcon = (alertType: string) => {
    switch (alertType.toLowerCase()) {
      case 'high_gain':
        return <TrendingUp color="success" />
      case 'price_spike':
        return <TrendingUp color="warning" />
      case 'new_top_gainer':
        return <NewReleases color="primary" />
      case 'rank_improvement':
        return <TrendingUp color="info" />
      case 'high_volume':
        return <VolumeUp color="secondary" />
      case 'custom_rule':
        return <NotificationsActive color="primary" />
      default:
        return <Warning color="default" />
    }
  }

  const getAlertColor = (alertType: string) => {
    switch (alertType.toLowerCase()) {
      case 'high_gain':
        return 'success'
      case 'price_spike':
        return 'warning'
      case 'new_top_gainer':
        return 'primary'
      case 'rank_improvement':
        return 'info'
      case 'high_volume':
        return 'secondary'
      case 'custom_rule':
        return 'primary'
      default:
        return 'default'
    }
  }

  const formatAlertType = (alertType: string) => {
    return alertType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  const getAlertPriority = (alertType: string, percentChange: number) => {
    if (alertType === 'HIGH_GAIN' && percentChange > 50) return 'HIGH'
    if (alertType === 'PRICE_SPIKE' && percentChange > 30) return 'HIGH'
    if (alertType === 'NEW_TOP_GAINER') return 'MEDIUM'
    return 'LOW'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'error'
      case 'MEDIUM': return 'warning'
      case 'LOW': return 'info'
      default: return 'default'
    }
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Alerts
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center', 
            py: 4,
            color: 'text.secondary'
          }}>
            <NotificationsActive sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography variant="body2" align="center">
              No alerts yet
            </Typography>
            <Typography variant="caption" align="center" sx={{ mt: 1 }}>
              Create alert rules to start receiving notifications
            </Typography>
          </Box>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">
            Recent Alerts
          </Typography>
          <Chip 
            label={alerts.length} 
            size="small" 
            color="primary" 
            variant="outlined"
          />
        </Box>

        <List dense sx={{ maxHeight: 500, overflow: 'auto' }}>
          {alerts.slice(0, 10).map((alert, index) => {
            const priority = getAlertPriority(alert.payload.alertType, alert.payload.stock.percentChange)
            
            return (
              <React.Fragment key={`${alert.payload.stock.symbol}-${index}`}>
                <ListItem 
                  sx={{ 
                    px: 0,
                    py: 1,
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: 1
                    }
                  }}
                >
                  <ListItemAvatar>
                    <Avatar 
                      sx={{ 
                        width: 36, 
                        height: 36,
                        bgcolor: 'transparent'
                      }}
                    >
                      {getAlertIcon(alert.payload.alertType)}
                    </Avatar>
                  </ListItemAvatar>
                  
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle2" component="span" sx={{ fontWeight: 'bold' }}>
                          {alert.payload.stock.symbol}
                        </Typography>
                        <Chip 
                          label={formatAlertType(alert.payload.alertType)} 
                          size="small" 
                          color={getAlertColor(alert.payload.alertType) as any}
                          variant="outlined"
                        />
                        <Chip 
                          label={priority} 
                          size="small" 
                          color={getPriorityColor(priority) as any}
                          variant="filled"
                          sx={{ minWidth: 45, height: 20 }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                          {alert.payload.message}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" color="text.secondary">
                            {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                          </Typography>
                          <Typography variant="caption" color="success.main" sx={{ fontWeight: 'bold' }}>
                            ${alert.payload.stock.premarketPrice.toFixed(2)} 
                            (+{alert.payload.stock.percentChange.toFixed(2)}%)
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
                
                {index < alerts.length - 1 && index < 9 && (
                  <Divider variant="inset" component="li" />
                )}
              </React.Fragment>
            )
          })}
        </List>

        {alerts.length > 10 && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Showing 10 of {alerts.length} alerts
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default RecentAlertsCard 