import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  FormLabel,
  FormControlLabel,
  Switch,
  Box,
  Grid,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material'
import { Close, Save } from '@mui/icons-material'
import { AlertRule } from '@/types/stock.interface'

interface CreateAlertRuleDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (rule: Omit<AlertRule, 'id' | 'createdAt'>) => Promise<void>
}

const CreateAlertRuleDialog: React.FC<CreateAlertRuleDialogProps> = ({
  open,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState({
    symbol: '',
    minPercentChange: '',
    maxPercentChange: '',
    minVolume: '',
    enabled: true
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }))
    setError(null)
  }

  const handleSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      enabled: event.target.checked
    }))
  }

  const validateForm = () => {
    const { symbol, minPercentChange, maxPercentChange, minVolume } = formData

    // At least one condition must be specified
    if (!symbol && !minPercentChange && !maxPercentChange && !minVolume) {
      return 'Please specify at least one alert condition'
    }

    // Validate numeric fields
    if (minPercentChange && (isNaN(Number(minPercentChange)) || Number(minPercentChange) < 0)) {
      return 'Minimum percentage change must be a positive number'
    }

    if (maxPercentChange && (isNaN(Number(maxPercentChange)) || Number(maxPercentChange) < 0)) {
      return 'Maximum percentage change must be a positive number'
    }

    if (minVolume && (isNaN(Number(minVolume)) || Number(minVolume) < 0)) {
      return 'Minimum volume must be a positive number'
    }

    // Validate percentage range
    if (minPercentChange && maxPercentChange && Number(minPercentChange) > Number(maxPercentChange)) {
      return 'Minimum percentage change cannot be greater than maximum'
    }

    return null
  }

  const handleSubmit = async () => {
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const rule: Omit<AlertRule, 'id' | 'createdAt'> = {
        symbol: formData.symbol.toUpperCase().trim() || undefined,
        minPercentChange: formData.minPercentChange ? Number(formData.minPercentChange) : undefined,
        maxPercentChange: formData.maxPercentChange ? Number(formData.maxPercentChange) : undefined,
        minVolume: formData.minVolume ? Number(formData.minVolume) : undefined,
        enabled: formData.enabled
      }

      await onSubmit(rule)
      handleClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create alert rule')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      symbol: '',
      minPercentChange: '',
      maxPercentChange: '',
      minVolume: '',
      enabled: true
    })
    setError(null)
    onClose()
  }

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '400px' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Create Alert Rule</Typography>
        <Button onClick={handleClose} size="small">
          <Close />
        </Button>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Symbol Filter */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <FormLabel sx={{ mb: 1 }}>Stock Symbol (Optional)</FormLabel>
                <TextField
                  placeholder="e.g., AAPL, TSLA"
                  value={formData.symbol}
                  onChange={handleInputChange('symbol')}
                  helperText="Leave empty to monitor all stocks"
                  size="small"
                />
              </FormControl>
            </Grid>

            {/* Percentage Change Filters */}
            <Grid item xs={12}>
              <FormLabel sx={{ mb: 2, display: 'block' }}>Percentage Change Conditions</FormLabel>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Minimum Change %"
                    type="number"
                    placeholder="e.g., 10"
                    value={formData.minPercentChange}
                    onChange={handleInputChange('minPercentChange')}
                    helperText="Alert when gain exceeds this"
                    size="small"
                    fullWidth
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Maximum Change %"
                    type="number"
                    placeholder="e.g., 50"
                    value={formData.maxPercentChange}
                    onChange={handleInputChange('maxPercentChange')}
                    helperText="Alert when gain is below this"
                    size="small"
                    fullWidth
                  />
                </Grid>
              </Grid>
            </Grid>

            {/* Volume Filter */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <FormLabel sx={{ mb: 1 }}>Volume Condition</FormLabel>
                <TextField
                  label="Minimum Volume"
                  type="number"
                  placeholder="e.g., 1000000"
                  value={formData.minVolume}
                  onChange={handleInputChange('minVolume')}
                  helperText="Alert when trading volume exceeds this amount"
                  size="small"
                />
              </FormControl>
            </Grid>

            {/* Enable Rule */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.enabled}
                    onChange={handleSwitchChange}
                  />
                }
                label="Enable this rule immediately"
              />
            </Grid>
          </Grid>

          {/* Examples */}
          <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Example Rules:
            </Typography>
            <Typography variant="body2" color="textSecondary" component="div">
              • <strong>Symbol:</strong> "AAPL" + Min Change: 5% → Alert when Apple gains 5%+
              <br />
              • <strong>Min Volume:</strong> 1,000,000 → Alert for high-volume stocks
              <br />
              • <strong>Min Change:</strong> 20% → Alert for any stock gaining 20%+
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} /> : <Save />}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Rule'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CreateAlertRuleDialog 