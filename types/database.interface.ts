export interface DatabaseStock {
  id: number;
  symbol: string;
  company_name: string;
  percent_change: number;
  premarket_price: number;
  premarket_volume: number;
  market_cap: string;
  rank: number;
  timestamp: string;
  created_at: string;
}

export interface DatabaseStockUpdate {
  id: number;
  stock_id: number;
  previous_percent_change?: number;
  current_percent_change: number;
  previous_price?: number;
  current_price: number;
  previous_rank?: number;
  current_rank: number;
  change_type: string;
  change_amount?: number;
  change_percent?: number;
  timestamp: string;
  created_at: string;
}

export interface DatabaseAlertRule {
  id: number;
  symbol?: string;
  min_percent_change?: number;
  max_percent_change?: number;
  min_volume?: number;
  enabled: number; // SQLite boolean as integer
  created_at: string;
  updated_at: string;
}

export interface DatabaseScrapingLog {
  id: number;
  success: number; // SQLite boolean as integer
  total_stocks: number;
  error_message?: string;
  execution_time_ms: number;
  timestamp: string;
} 