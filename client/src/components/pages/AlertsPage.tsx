import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Alert,
  Fab
} from '@mui/material'
import { Add, Notifications } from '@mui/icons-material'
import { useWebSocket } from '@/hooks/useWebSocket'
import AlertRulesList from '@/components/alerts/AlertRulesList'
import CreateAlertRuleDialog from '@/components/alerts/CreateAlertRuleDialog'
import RecentAlertsCard from '@/components/alerts/RecentAlertsCard'
import { AlertRule } from '@/types/stock.interface'
import ApiService from '@/services/api.service'

const AlertsPage: React.FC = () => {
  const { alerts } = useWebSocket()
  const [alertRules, setAlertRules] = useState<AlertRule[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAlertRules()
  }, [])

  const fetchAlertRules = async () => {
    try {
      setError(null)
      const rules = await ApiService.getAlertRules()
      setAlertRules(rules)
    } catch (error) {
      setError('Failed to load alert rules')
      console.error('Error fetching alert rules:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRule = async (rule: Omit<AlertRule, 'id' | 'createdAt'>) => {
    try {
      await ApiService.createAlertRule(rule)
      await fetchAlertRules() // Refresh the list
      setCreateDialogOpen(false)
    } catch (error) {
      console.error('Error creating alert rule:', error)
      throw error
    }
  }

  const handleUpdateRule = async (id: number, updates: Partial<AlertRule>) => {
    try {
      await ApiService.updateAlertRule(id, updates)
      await fetchAlertRules() // Refresh the list
    } catch (error) {
      console.error('Error updating alert rule:', error)
      throw error
    }
  }

  const handleDeleteRule = async (id: number) => {
    try {
      await ApiService.deleteAlertRule(id)
      await fetchAlertRules() // Refresh the list
    } catch (error) {
      console.error('Error deleting alert rule:', error)
      throw error
    }
  }

  const activeRulesCount = alertRules.filter(rule => rule.enabled).length
  const totalRulesCount = alertRules.length

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Alert Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configure custom alert rules and monitor notifications
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Alert Rule
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Active Rules
              </Typography>
              <Typography variant="h4" component="div" color="primary.main">
                {activeRulesCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Currently monitoring
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Total Rules
              </Typography>
              <Typography variant="h4" component="div">
                {totalRulesCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Rules configured
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Recent Alerts
              </Typography>
              <Typography variant="h4" component="div" color="warning.main">
                {alerts.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                In current session
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Coverage
              </Typography>
              <Typography variant="h4" component="div" color="success.main">
                {totalRulesCount > 0 ? Math.round((activeRulesCount / totalRulesCount) * 100) : 0}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Rules active
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Alert Rules */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Alert Rules ({alertRules.length})
                </Typography>
                <Button
                  size="small"
                  onClick={fetchAlertRules}
                  disabled={loading}
                >
                  Refresh
                </Button>
              </Box>
              
              <AlertRulesList
                rules={alertRules}
                loading={loading}
                onUpdate={handleUpdateRule}
                onDelete={handleDeleteRule}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Alerts */}
        <Grid item xs={12} lg={4}>
          <RecentAlertsCard alerts={alerts} />
        </Grid>
      </Grid>

      {/* Create Rule Dialog */}
      <CreateAlertRuleDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={handleCreateRule}
      />

      {/* Floating Action Button for Mobile */}
      <Fab
        color="primary"
        aria-label="add alert rule"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', sm: 'none' }
        }}
        onClick={() => setCreateDialogOpen(true)}
      >
        <Add />
      </Fab>
    </Box>
  )
}

export default AlertsPage 