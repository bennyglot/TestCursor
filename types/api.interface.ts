import { StockData, StockUpdate, ScrapingResult } from './stock.interface';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp: Date;
  error?: string;
}

export interface WebSocketMessage {
  type: 'STOCKS_UPDATE' | 'ALERT' | 'ERROR' | 'CONNECTION' | 'SCRAPING_STATUS' | 'NO_CHANGES';
  payload: any;
  timestamp: Date;
}

export interface StocksUpdateMessage extends WebSocketMessage {
  type: 'STOCKS_UPDATE';
  payload: {
    stocks: StockData[];
    updates: StockUpdate[];
    scrapingResult: ScrapingResult;
    changesSummary?: {
      changedStocks: string[];
      newStocks: string[];
      removedStocks: string[];
      summary: string;
    };
  };
}

export interface AlertMessage extends WebSocketMessage {
  type: 'ALERT';
  payload: {
    stock: StockData;
    update: StockUpdate;
    alertType: string;
    message: string;
  };
}

export interface ScrapingStatusMessage extends WebSocketMessage {
  type: 'SCRAPING_STATUS';
  payload: {
    status: 'STARTED' | 'SUCCESS' | 'ERROR';
    message: string;
    nextRun?: Date;
    hasDataChanges?: boolean;
    changesSummary?: string;
  };
}

export interface NoChangesMessage extends WebSocketMessage {
  type: 'NO_CHANGES';
  payload: {
    message: string;
    stockCount: number;
    lastUpdate: Date;
    nextCheck: Date;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
} 