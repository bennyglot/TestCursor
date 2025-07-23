import React from 'react'
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Box,
  Chip,
  Avatar
} from '@mui/material'
import {
  TrendingUp,
  TrendingDown,
  SwapVert,
  Add,
  Remove
} from '@mui/icons-material'
import { StockUpdate } from '@/types/stock.interface'
import { formatDistanceToNow } from 'date-fns'

interface StockUpdatesCardProps {
  updates: StockUpdate[]
}

const StockUpdatesCard: React.FC<StockUpdatesCardProps> = ({ updates }) => {
  const getUpdateIcon = (changeType: StockUpdate['changeType']) => {
    switch (changeType) {
      case 'PRICE_INCREASE':
        return <TrendingUp color="success" />
      case 'PRICE_DECREASE':
        return <TrendingDown color="error" />
      case 'RANK_CHANGE':
        return <SwapVert color="info" />
      case 'NEW':
        return <Add color="primary" />
      case 'REMOVED':
        return <Remove color="error" />
      default:
        return <SwapVert />
    }
  }

  const getUpdateColor = (changeType: StockUpdate['changeType']) => {
    switch (changeType) {
      case 'PRICE_INCREASE':
        return 'success'
      case 'PRICE_DECREASE':
        return 'error'
      case 'RANK_CHANGE':
        return 'info'
      case 'NEW':
        return 'primary'
      case 'REMOVED':
        return 'error'
      default:
        return 'default'
    }
  }

  const formatUpdateDescription = (update: StockUpdate) => {
    const symbol = update.currentData.symbol
    
    switch (update.changeType) {
      case 'PRICE_INCREASE':
        return `${symbol} price increased by $${update.changeAmount?.toFixed(2) || '0.00'} (${update.changePercent?.toFixed(2) || '0.00'}%)`
      
      case 'PRICE_DECREASE':
        return `${symbol} price decreased by $${Math.abs(update.changeAmount || 0).toFixed(2)} (${Math.abs(update.changePercent || 0).toFixed(2)}%)`
      
      case 'RANK_CHANGE':
        const rankDiff = update.previousData.rank - update.currentData.rank
        return `${symbol} ${rankDiff > 0 ? 'moved up' : 'moved down'} ${Math.abs(rankDiff)} positions to rank ${update.currentData.rank}`
      
      case 'NEW':
        return `${symbol} entered the gainers list at rank ${update.currentData.rank} with ${update.currentData.percentChange.toFixed(2)}% gain`
      
      case 'REMOVED':
        return `${symbol} was removed from the gainers list`
      
      default:
        return `${symbol} updated`
    }
  }

  const formatTimeAgo = (timestamp: Date) => {
    return formatDistanceToNow(timestamp, { addSuffix: true })
  }

  if (updates.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Updates
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            py: 4,
            color: 'text.secondary'
          }}>
            <Typography variant="body2">
              No recent updates available
            </Typography>
          </Box>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Recent Updates ({updates.length})
        </Typography>
        
        <List dense sx={{ maxHeight: 500, overflow: 'auto' }}>
          {updates.slice(0, 20).map((update, index) => (
            <ListItem
              key={`${update.id}-${index}`}
              sx={{
                borderRadius: 1,
                mb: 1,
                backgroundColor: 'background.paper',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                }
              }}
            >
              <Avatar
                sx={{ 
                  mr: 2, 
                  width: 32, 
                  height: 32,
                  bgcolor: 'transparent'
                }}
              >
                {getUpdateIcon(update.changeType)}
              </Avatar>
              
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="body2" component="span" sx={{ fontWeight: 'bold' }}>
                      {update.currentData.symbol}
                    </Typography>
                    <Chip 
                      label={update.changeType.replace('_', ' ')} 
                      size="small" 
                      color={getUpdateColor(update.changeType) as any}
                      variant="outlined"
                    />
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {formatUpdateDescription(update)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatTimeAgo(update.timestamp)}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
        
        {updates.length > 20 && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Showing 20 of {updates.length} updates
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default StockUpdatesCard 