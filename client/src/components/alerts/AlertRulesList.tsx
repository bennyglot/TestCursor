import React, { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Switch,
  IconButton,
  Chip,
  Typography,
  Box,
  Tooltip,
  CircularProgress,
  Alert
} from '@mui/material'
import {
  Edit,
  Delete,
  TrendingUp,
  VolumeUp,
  Timeline
} from '@mui/icons-material'
import { AlertRule } from '@/types/stock.interface'
import { format } from 'date-fns'

interface AlertRulesListProps {
  rules: AlertRule[]
  loading: boolean
  onUpdate: (id: number, updates: Partial<AlertRule>) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

const AlertRulesList: React.FC<AlertRulesListProps> = ({ 
  rules, 
  loading, 
  onUpdate, 
  onDelete 
}) => {
  const [updating, setUpdating] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)

  const handleToggleEnabled = async (rule: AlertRule) => {
    setUpdating(rule.id)
    try {
      await onUpdate(rule.id, { enabled: !rule.enabled })
    } catch (error) {
      console.error('Failed to toggle rule:', error)
    } finally {
      setUpdating(null)
    }
  }

  const handleDelete = async (ruleId: number) => {
    if (window.confirm('Are you sure you want to delete this alert rule?')) {
      setDeleting(ruleId)
      try {
        await onDelete(ruleId)
      } catch (error) {
        console.error('Failed to delete rule:', error)
      } finally {
        setDeleting(null)
      }
    }
  }

  const getRuleTypeIcon = (rule: AlertRule) => {
    if (rule.symbol) return <Timeline />
    if (rule.minPercentChange || rule.maxPercentChange) return <TrendingUp />
    if (rule.minVolume) return <VolumeUp />
    return <Timeline />
  }

  const formatRuleDescription = (rule: AlertRule) => {
    const conditions = []
    
    if (rule.symbol) {
      conditions.push(`Symbol: ${rule.symbol}`)
    }
    if (rule.minPercentChange) {
      conditions.push(`Min Change: ${rule.minPercentChange}%`)
    }
    if (rule.maxPercentChange) {
      conditions.push(`Max Change: ${rule.maxPercentChange}%`)
    }
    if (rule.minVolume) {
      conditions.push(`Min Volume: ${rule.minVolume.toLocaleString()}`)
    }

    return conditions.join(', ') || 'No conditions set'
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (rules.length === 0) {
    return (
      <Alert severity="info">
        No alert rules configured yet. Create your first rule to start monitoring stocks!
      </Alert>
    )
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Type</TableCell>
            <TableCell>Conditions</TableCell>
            <TableCell align="center">Status</TableCell>
            <TableCell align="center">Created</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rules.map((rule) => (
            <TableRow key={rule.id} hover>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getRuleTypeIcon(rule)}
                  <Typography variant="body2">
                    {rule.symbol ? 'Symbol' : rule.minVolume ? 'Volume' : 'Change'}
                  </Typography>
                </Box>
              </TableCell>
              
              <TableCell>
                <Typography variant="body2" sx={{ maxWidth: 300 }}>
                  {formatRuleDescription(rule)}
                </Typography>
              </TableCell>
              
              <TableCell align="center">
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <Switch
                    checked={rule.enabled}
                    onChange={() => handleToggleEnabled(rule)}
                    disabled={updating === rule.id}
                    size="small"
                  />
                  {updating === rule.id && <CircularProgress size={16} />}
                  <Chip
                    label={rule.enabled ? 'Active' : 'Inactive'}
                    color={rule.enabled ? 'success' : 'default'}
                    size="small"
                    variant="outlined"
                  />
                </Box>
              </TableCell>
              
              <TableCell align="center">
                <Typography variant="caption" color="textSecondary">
                  {format(new Date(rule.createdAt), 'MMM dd, yyyy')}
                </Typography>
              </TableCell>
              
              <TableCell align="center">
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                  <Tooltip title="Edit rule">
                    <IconButton 
                      size="small" 
                      disabled={updating === rule.id || deleting === rule.id}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Delete rule">
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => handleDelete(rule.id)}
                      disabled={updating === rule.id || deleting === rule.id}
                    >
                      {deleting === rule.id ? (
                        <CircularProgress size={16} />
                      ) : (
                        <Delete fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default AlertRulesList 