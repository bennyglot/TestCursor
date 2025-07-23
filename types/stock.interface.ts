export interface StockData {
  id?: number;
  symbol: string;
  companyName: string;
  percentChange: number;
  premarketPrice: number;
  premarketVolume: number;
  marketCap: string;
  timestamp: Date;
  rank: number;
}

export interface StockUpdate {
  id: number;
  stockId: number;
  previousData: StockData;
  currentData: StockData;
  changeType: 'NEW' | 'PRICE_INCREASE' | 'PRICE_DECREASE' | 'RANK_CHANGE' | 'REMOVED';
  changeAmount?: number;
  changePercent?: number;
  timestamp: Date;
}

export interface ScrapingResult {
  success: boolean;
  data: StockData[];
  timestamp: Date;
  error?: string;
  totalStocks: number;
}

export interface AlertRule {
  id: number;
  symbol?: string;
  minPercentChange?: number;
  maxPercentChange?: number;
  minVolume?: number;
  enabled: boolean;
  createdAt: Date;
} 