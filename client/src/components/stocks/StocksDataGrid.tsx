import React from 'react'
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid'
import { Box, Chip, IconButton } from '@mui/material'
import { History, TrendingUp, TrendingDown } from '@mui/icons-material'
import { StockData } from '@/types/stock.interface'
import { format } from 'date-fns'

interface StocksDataGridProps {
  stocks: StockData[]
  onViewHistory: (stock: StockData) => void
}

const StocksDataGrid: React.FC<StocksDataGridProps> = ({ stocks, onViewHistory }) => {
  const columns: GridColDef[] = [
    {
      field: 'rank',
      headerName: 'Rank',
      width: 80,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          size="small" 
          color={params.value <= 3 ? 'primary' : 'default'}
          variant={params.value <= 3 ? 'filled' : 'outlined'}
        />
      )
    },
    {
      field: 'symbol',
      headerName: 'Symbol',
      width: 120,
      fontWeight: 'bold',
      renderCell: (params) => (
        <Box sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          {params.value}
        </Box>
      )
    },
    {
      field: 'companyName',
      headerName: 'Company',
      width: 200,
      flex: 1
    },
    {
      field: 'percentChange',
      headerName: 'Change %',
      width: 120,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const value = params.value as number
        const isPositive = value >= 0
        return (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            color: isPositive ? 'success.main' : 'error.main'
          }}>
            {isPositive ? <TrendingUp /> : <TrendingDown />}
            <span style={{ marginLeft: 4 }}>
              {isPositive ? '+' : ''}{value.toFixed(2)}%
            </span>
          </Box>
        )
      }
    },
    {
      field: 'premarketPrice',
      headerName: 'Price',
      width: 120,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params) => `$${(params.value as number).toFixed(2)}`
    },
    {
      field: 'premarketVolume',
      headerName: 'Volume',
      width: 120,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params) => {
        const volume = params.value as number
        if (volume >= 1000000) {
          return `${(volume / 1000000).toFixed(1)}M`
        } else if (volume >= 1000) {
          return `${(volume / 1000).toFixed(1)}K`
        }
        return volume.toLocaleString()
      }
    },
    {
      field: 'marketCap',
      headerName: 'Market Cap',
      width: 120,
      align: 'center',
      headerAlign: 'center'
    },
    {
      field: 'timestamp',
      headerName: 'Updated',
      width: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const date = new Date(params.value as string)
        return format(date, 'HH:mm:ss')
      }
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 100,
      getActions: (params) => [
        <GridActionsCellItem
          key="history"
          icon={<History />}
          label="View History"
          onClick={() => onViewHistory(params.row as StockData)}
        />
      ]
    }
  ]

  const rows = stocks.map((stock, index) => ({
    id: stock.symbol,
    ...stock,
    rank: stock.rank || index + 1
  }))

  return (
    <Box sx={{ height: 600, width: '100%' }}>
      <DataGrid
        rows={rows}
        columns={columns}
        pageSize={25}
        rowsPerPageOptions={[10, 25, 50]}
        disableSelectionOnClick
        autoHeight
        density="compact"
        getRowClassName={(params) => {
          const percentChange = params.row.percentChange
          if (percentChange >= 20) return 'high-gain-row'
          if (percentChange >= 10) return 'medium-gain-row'
          return ''
        }}
        sx={{
          '& .high-gain-row': {
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            '&:hover': {
              backgroundColor: 'rgba(76, 175, 80, 0.2)',
            }
          },
          '& .medium-gain-row': {
            backgroundColor: 'rgba(255, 152, 0, 0.1)',
            '&:hover': {
              backgroundColor: 'rgba(255, 152, 0, 0.2)',
            }
          },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          }
        }}
      />
    </Box>
  )
}

export default StocksDataGrid 