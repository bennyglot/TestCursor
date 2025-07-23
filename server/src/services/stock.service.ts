import { Database } from '../config/database';
import { StockData, StockUpdate, ScrapingResult } from '@/types/stock.interface';
import { DatabaseStock, DatabaseStockUpdate } from '@/types/database.interface';

export class StockService {
  private db: Database;
  private lastBroadcastData: StockData[] = [];
  private hasEverBroadcast: boolean = false;

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

  public hasDataChanged(newStocks: StockData[]): boolean {
    // Always broadcast the first time or if we have no previous data
    if (!this.hasEverBroadcast || this.lastBroadcastData.length === 0) {
      console.log(`🎯 First-time data load detected - will broadcast ${newStocks.length} stocks`);
      return true;
    }

    // If the number of stocks changed, it's definitely different
    if (newStocks.length !== this.lastBroadcastData.length) {
      console.log(`📊 Stock count changed: ${this.lastBroadcastData.length} → ${newStocks.length}`);
      return true;
    }

    // Create maps for easier comparison
    const newStocksMap = new Map(newStocks.map(stock => [stock.symbol, stock]));
    const lastStocksMap = new Map(this.lastBroadcastData.map(stock => [stock.symbol, stock]));

    // Check if any stock is new or missing
    for (const symbol of newStocksMap.keys()) {
      if (!lastStocksMap.has(symbol)) {
        console.log(`📈 New stock detected: ${symbol}`);
        return true; // New stock found
      }
    }

    for (const symbol of lastStocksMap.keys()) {
      if (!newStocksMap.has(symbol)) {
        console.log(`📉 Stock removed: ${symbol}`);
        return true; // Stock removed
      }
    }

    // Compare individual stock data for changes
    let changedStocks = 0;
    for (const [symbol, newStock] of newStocksMap) {
      const lastStock = lastStocksMap.get(symbol)!;

      // Check significant changes
      if (this.hasStockChanged(lastStock, newStock)) {
        changedStocks++;
        console.log(`🔄 ${symbol}: Price ${lastStock.premarketPrice} → ${newStock.premarketPrice}, %Change ${lastStock.percentChange} → ${newStock.percentChange}`);
        if (changedStocks <= 3) { // Only log first few to avoid spam
          return true;
        }
      }
    }

    if (changedStocks > 0) {
      console.log(`📊 Total stocks with changes: ${changedStocks}`);
      return true;
    }

    console.log(`✅ No significant changes detected in ${newStocks.length} stocks`);
    return false; // No significant changes detected
  }

  private hasStockChanged(lastStock: StockData, newStock: StockData): boolean {
    // Define thresholds for what constitutes a "change"
    const PRICE_THRESHOLD = 0.01; // $0.01 price change
    const PERCENT_THRESHOLD = 0.01; // 0.01% change
    const VOLUME_THRESHOLD = 1000; // 1000 volume change
    const RANK_THRESHOLD = 0; // Any rank change

    // Check for significant price change
    if (Math.abs(newStock.premarketPrice - lastStock.premarketPrice) > PRICE_THRESHOLD) {
      return true;
    }

    // Check for significant percentage change
    if (Math.abs(newStock.percentChange - lastStock.percentChange) > PERCENT_THRESHOLD) {
      return true;
    }

    // Check for significant volume change
    if (Math.abs(newStock.premarketVolume - lastStock.premarketVolume) > VOLUME_THRESHOLD) {
      return true;
    }

    // Check for rank change
    if (Math.abs(newStock.rank - lastStock.rank) > RANK_THRESHOLD) {
      return true;
    }

    // Check for company name change (rare but possible)
    if (newStock.companyName !== lastStock.companyName) {
      return true;
    }

    return false;
  }

  public updateLastBroadcastData(stocks: StockData[]): void {
    // Deep clone the data to avoid reference issues
    this.lastBroadcastData = stocks.map(stock => ({
      ...stock,
      timestamp: new Date(stock.timestamp)
    }));
    this.hasEverBroadcast = true;
    console.log(`📡 Updated last broadcast data with ${stocks.length} stocks`);
  }

  public getDataChangesSummary(newStocks: StockData[]): {
    hasChanges: boolean;
    summary: string;
    changedStocks: string[];
    newStocks: string[];
    removedStocks: string[];
  } {
    const result = {
      hasChanges: false,
      summary: '',
      changedStocks: [] as string[],
      newStocks: [] as string[],
      removedStocks: [] as string[]
    };

    if (!this.hasEverBroadcast || this.lastBroadcastData.length === 0) {
      result.hasChanges = true;
      result.summary = `Initial data load with ${newStocks.length} stocks`;
      result.newStocks = newStocks.map(s => s.symbol);
      return result;
    }

    const newStocksMap = new Map(newStocks.map(stock => [stock.symbol, stock]));
    const lastStocksMap = new Map(this.lastBroadcastData.map(stock => [stock.symbol, stock]));

    // Find new stocks
    for (const symbol of newStocksMap.keys()) {
      if (!lastStocksMap.has(symbol)) {
        result.newStocks.push(symbol);
        result.hasChanges = true;
      }
    }

    // Find removed stocks
    for (const symbol of lastStocksMap.keys()) {
      if (!newStocksMap.has(symbol)) {
        result.removedStocks.push(symbol);
        result.hasChanges = true;
      }
    }

    // Find changed stocks
    for (const [symbol, newStock] of newStocksMap) {
      const lastStock = lastStocksMap.get(symbol);
      if (lastStock && this.hasStockChanged(lastStock, newStock)) {
        result.changedStocks.push(symbol);
        result.hasChanges = true;
      }
    }

    // Generate summary
    const summaryParts = [];
    if (result.newStocks.length > 0) {
      summaryParts.push(`${result.newStocks.length} new`);
    }
    if (result.changedStocks.length > 0) {
      summaryParts.push(`${result.changedStocks.length} updated`);
    }
    if (result.removedStocks.length > 0) {
      summaryParts.push(`${result.removedStocks.length} removed`);
    }

    result.summary = summaryParts.length > 0 
      ? `Changes detected: ${summaryParts.join(', ')} stocks`
      : 'No significant changes detected';

    return result;
  }

  public forceNextBroadcast(): void {
    console.log(`🔄 Forcing next broadcast by clearing cache`);
    this.lastBroadcastData = [];
    this.hasEverBroadcast = false;
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