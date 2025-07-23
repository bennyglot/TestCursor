import { Database } from '../config/database';
import { StockData, StockUpdate, ScrapingResult } from '@/types/stock.interface';
import { DatabaseStock, DatabaseStockUpdate } from '@/types/database.interface';

export class StockService {
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  public async saveStockData(stocks: StockData[], scrapingResult: ScrapingResult): Promise<void> {
    const timestamp = scrapingResult.timestamp.toISOString();

    try {
      // Begin transaction
      await this.db.run('BEGIN TRANSACTION');

      // Save scraping log
      await this.db.run(
        `INSERT INTO scraping_logs (success, total_stocks, error_message, execution_time_ms, timestamp)
         VALUES (?, ?, ?, ?, ?)`,
        [
          scrapingResult.success ? 1 : 0,
          scrapingResult.totalStocks,
          scrapingResult.error || null,
          0, // This should be calculated by the caller
          timestamp
        ]
      );

      if (scrapingResult.success && stocks.length > 0) {
        // Insert stocks
        for (const stock of stocks) {
          await this.db.run(
            `INSERT OR REPLACE INTO stocks 
             (symbol, company_name, percent_change, premarket_price, premarket_volume, market_cap, rank, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              stock.symbol,
              stock.companyName,
              stock.percentChange,
              stock.premarketPrice,
              stock.premarketVolume,
              stock.marketCap,
              stock.rank,
              timestamp
            ]
          );
        }
      }

      // Commit transaction
      await this.db.run('COMMIT');
      console.log(`Saved ${stocks.length} stocks to database`);

    } catch (error) {
      // Rollback on error
      await this.db.run('ROLLBACK');
      console.error('Error saving stock data:', error);
      throw error;
    }
  }

  public async getLatestStocks(limit: number = 50): Promise<StockData[]> {
    const latestTimestamp = await this.db.get<{ timestamp: string }>(
      'SELECT timestamp FROM stocks ORDER BY timestamp DESC LIMIT 1'
    );

    if (!latestTimestamp) {
      return [];
    }

    const stocks = await this.db.all<DatabaseStock>(
      `SELECT * FROM stocks 
       WHERE timestamp = ? 
       ORDER BY rank ASC 
       LIMIT ?`,
      [latestTimestamp.timestamp, limit]
    );

    return stocks.map(this.mapDatabaseStockToStockData);
  }

  public async getStockHistory(symbol: string, limit: number = 100): Promise<StockData[]> {
    const stocks = await this.db.all<DatabaseStock>(
      `SELECT * FROM stocks 
       WHERE symbol = ? 
       ORDER BY timestamp DESC 
       LIMIT ?`,
      [symbol, limit]
    );

    return stocks.map(this.mapDatabaseStockToStockData);
  }

  public async getStockUpdates(limit: number = 100): Promise<StockUpdate[]> {
    const updates = await this.db.all<any>(
      `SELECT 
         su.*,
         s1.symbol, s1.company_name, s1.market_cap,
         s1.timestamp as current_timestamp,
         s2.timestamp as previous_timestamp
       FROM stock_updates su
       JOIN stocks s1 ON su.stock_id = s1.id
       LEFT JOIN stocks s2 ON s2.symbol = s1.symbol AND s2.timestamp < s1.timestamp
       ORDER BY su.timestamp DESC 
       LIMIT ?`,
      [limit]
    );

    return updates.map(this.mapDatabaseUpdateToStockUpdate);
  }

  public async analyzeStockChanges(currentStocks: StockData[]): Promise<StockUpdate[]> {
    const updates: StockUpdate[] = [];
    
    for (const currentStock of currentStocks) {
      // Get the most recent previous data for this stock
      const previousStock = await this.db.get<DatabaseStock>(
        `SELECT * FROM stocks 
         WHERE symbol = ? AND timestamp < ?
         ORDER BY timestamp DESC 
         LIMIT 1`,
        [currentStock.symbol, currentStock.timestamp.toISOString()]
      );

      if (!previousStock) {
        // New stock
        const stockId = await this.insertStockUpdate(currentStock, null, 'NEW');
        updates.push({
          id: stockId,
          stockId: stockId,
          previousData: currentStock, // No previous data
          currentData: currentStock,
          changeType: 'NEW',
          timestamp: currentStock.timestamp
        });
        continue;
      }

      const prevData = this.mapDatabaseStockToStockData(previousStock);
      const changeType = this.determineChangeType(prevData, currentStock);
      
      if (changeType !== null) {
        const changeAmount = currentStock.premarketPrice - prevData.premarketPrice;
        const changePercent = ((currentStock.premarketPrice - prevData.premarketPrice) / prevData.premarketPrice) * 100;
        
        const stockId = await this.insertStockUpdate(currentStock, prevData, changeType, changeAmount, changePercent);
        
        updates.push({
          id: stockId,
          stockId: stockId,
          previousData: prevData,
          currentData: currentStock,
          changeType,
          changeAmount,
          changePercent,
          timestamp: currentStock.timestamp
        });
      }
    }

    return updates;
  }

  private async insertStockUpdate(
    currentStock: StockData, 
    previousStock: StockData | null, 
    changeType: string,
    changeAmount?: number,
    changePercent?: number
  ): Promise<number> {
    const result = await this.db.run(
      `INSERT INTO stock_updates 
       (stock_id, previous_percent_change, current_percent_change, previous_price, current_price, 
        previous_rank, current_rank, change_type, change_amount, change_percent, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        currentStock.id || 0,
        previousStock?.percentChange || null,
        currentStock.percentChange,
        previousStock?.premarketPrice || null,
        currentStock.premarketPrice,
        previousStock?.rank || null,
        currentStock.rank,
        changeType,
        changeAmount || null,
        changePercent || null,
        currentStock.timestamp.toISOString()
      ]
    );

    return result.lastID!;
  }

  private determineChangeType(previous: StockData, current: StockData): StockUpdate['changeType'] | null {
    if (current.premarketPrice > previous.premarketPrice) {
      return 'PRICE_INCREASE';
    }
    if (current.premarketPrice < previous.premarketPrice) {
      return 'PRICE_DECREASE';
    }
    if (current.rank !== previous.rank) {
      return 'RANK_CHANGE';
    }
    return null; // No significant change
  }

  private mapDatabaseStockToStockData(dbStock: DatabaseStock): StockData {
    return {
      id: dbStock.id,
      symbol: dbStock.symbol,
      companyName: dbStock.company_name,
      percentChange: dbStock.percent_change,
      premarketPrice: dbStock.premarket_price,
      premarketVolume: dbStock.premarket_volume,
      marketCap: dbStock.market_cap,
      rank: dbStock.rank,
      timestamp: new Date(dbStock.timestamp)
    };
  }

  private mapDatabaseUpdateToStockUpdate(dbUpdate: any): StockUpdate {
    return {
      id: dbUpdate.id,
      stockId: dbUpdate.stock_id,
      previousData: {
        symbol: dbUpdate.symbol,
        companyName: dbUpdate.company_name,
        percentChange: dbUpdate.previous_percent_change || 0,
        premarketPrice: dbUpdate.previous_price || 0,
        premarketVolume: 0,
        marketCap: dbUpdate.market_cap,
        rank: dbUpdate.previous_rank || 0,
        timestamp: new Date(dbUpdate.previous_timestamp || dbUpdate.timestamp)
      },
      currentData: {
        symbol: dbUpdate.symbol,
        companyName: dbUpdate.company_name,
        percentChange: dbUpdate.current_percent_change,
        premarketPrice: dbUpdate.current_price,
        premarketVolume: 0,
        marketCap: dbUpdate.market_cap,
        rank: dbUpdate.current_rank,
        timestamp: new Date(dbUpdate.current_timestamp || dbUpdate.timestamp)
      },
      changeType: dbUpdate.change_type,
      changeAmount: dbUpdate.change_amount,
      changePercent: dbUpdate.change_percent,
      timestamp: new Date(dbUpdate.timestamp)
    };
  }

  public async cleanOldData(daysToKeep: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffTimestamp = cutoffDate.toISOString();

    await this.db.run('DELETE FROM stocks WHERE timestamp < ?', [cutoffTimestamp]);
    await this.db.run('DELETE FROM stock_updates WHERE timestamp < ?', [cutoffTimestamp]);
    await this.db.run('DELETE FROM scraping_logs WHERE timestamp < ?', [cutoffTimestamp]);

    console.log(`Cleaned data older than ${daysToKeep} days`);
  }
} 