import { Request, Response } from 'express';
import { StockService } from '../services/stock.service';
import { CronService } from '../services/cron.service';
import { ApiResponse, PaginatedResponse } from '@/types/api.interface';
import { StockData, StockUpdate } from '@/types/stock.interface';

export class StocksController {
  private stockService: StockService;
  private cronService: CronService;

  constructor(stockService: StockService, cronService: CronService) {
    this.stockService = stockService;
    this.cronService = cronService;
  }

  public getLatestStocks = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const stocks = await this.stockService.getLatestStocks(limit);

      const response: ApiResponse<StockData[]> = {
        success: true,
        data: stocks,
        message: `Retrieved ${stocks.length} latest stocks`,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve latest stocks');
    }
  };

  public getStockHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { symbol } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;
      
      if (!symbol) {
        res.status(400).json({
          success: false,
          error: 'Stock symbol is required',
          timestamp: new Date()
        });
        return;
      }

      const history = await this.stockService.getStockHistory(symbol.toUpperCase(), limit);

      const response: ApiResponse<StockData[]> = {
        success: true,
        data: history,
        message: `Retrieved ${history.length} historical records for ${symbol}`,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error, `Failed to retrieve history for ${req.params.symbol}`);
    }
  };

  public getStockUpdates = async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100); // Max 100 per page
      const offset = (page - 1) * limit;

      const updates = await this.stockService.getStockUpdates(limit + 1); // Get one extra to check if there are more
      const hasMore = updates.length > limit;
      const data = hasMore ? updates.slice(0, limit) : updates;

      const response: PaginatedResponse<StockUpdate> = {
        data,
        total: data.length, // This is approximate since we don't count total records
        page,
        limit,
        totalPages: hasMore ? page + 1 : page
      };

      res.json({
        success: true,
        data: response,
        message: `Retrieved ${data.length} stock updates`,
        timestamp: new Date()
      });
    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve stock updates');
    }
  };

  public triggerManualScraping = async (req: Request, res: Response): Promise<void> => {
    try {
      // Check if scraping is already running
      const status = this.cronService.getStatus();
      if (status.isRunning) {
        res.status(409).json({
          success: false,
          error: 'Scraping task is already running',
          timestamp: new Date()
        });
        return;
      }

      // Trigger manual scraping (don't await, return immediately)
      this.cronService.triggerManualRun().catch(error => {
        console.error('Manual scraping failed:', error);
      });

      const response: ApiResponse<{ status: string }> = {
        success: true,
        data: { status: 'triggered' },
        message: 'Manual scraping task triggered successfully',
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to trigger manual scraping');
    }
  };

  public getScrapingStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const status = this.cronService.getStatus();

      const response: ApiResponse<typeof status> = {
        success: true,
        data: status,
        message: 'Retrieved scraping status',
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve scraping status');
    }
  };

  public searchStocks = async (req: Request, res: Response): Promise<void> => {
    try {
      const { query, limit = 20 } = req.query;
      
      if (!query || typeof query !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Search query is required',
          timestamp: new Date()
        });
        return;
      }

      const searchTerm = query.toUpperCase().trim();
      const searchLimit = Math.min(parseInt(limit as string) || 20, 50);

      // This would typically search through cached stock data
      // For now, return empty results
      const stocks: StockData[] = [];

      const response: ApiResponse<StockData[]> = {
        success: true,
        data: stocks,
        message: `Found ${stocks.length} stocks matching "${query}"`,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to search stocks');
    }
  };

  public getTopGainers = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
      const stocks = await this.stockService.getLatestStocks(limit);
      
      // Filter and sort by percentage change
      const topGainers = stocks
        .filter(stock => stock.percentChange > 0)
        .sort((a, b) => b.percentChange - a.percentChange)
        .slice(0, limit);

      const response: ApiResponse<StockData[]> = {
        success: true,
        data: topGainers,
        message: `Retrieved top ${topGainers.length} gainers`,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve top gainers');
    }
  };

  private handleError = (res: Response, error: any, message: string): void => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`${message}:`, error);

    const response: ApiResponse = {
      success: false,
      error: errorMessage,
      message,
      timestamp: new Date()
    };

    res.status(500).json(response);
  };
} 