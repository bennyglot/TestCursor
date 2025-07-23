import * as cron from 'node-cron';
import { ScraperService } from './scraper.service';
import { StockService } from './stock.service';
import { WebSocketService } from './websocket.service';
import { AlertService } from './alert.service';

export class CronService {
  private scraperService: ScraperService;
  private stockService: StockService;
  private webSocketService: WebSocketService;
  private alertService: AlertService;
  private isRunning: boolean = false;
  private lastRun?: Date;
  private nextRun?: Date;
  private scrapingTask?: cron.ScheduledTask;

  constructor(
    scraperService: ScraperService,
    stockService: StockService,
    webSocketService: WebSocketService,
    alertService: AlertService
  ) {
    this.scraperService = scraperService;
    this.stockService = stockService;
    this.webSocketService = webSocketService;
    this.alertService = alertService;
  }

  public start(): void {
    const intervalMinutes = parseInt(process.env.SCRAPING_INTERVAL_MINUTES || '1');
    const cronExpression = `*/${intervalMinutes} * * * *`; // Every N minutes
    
    console.log(`Starting cron job with expression: ${cronExpression} (every ${intervalMinutes} minutes)`);

    this.scrapingTask = cron.schedule(cronExpression, async () => {
      await this.runScrapingTask();
    }, {
      scheduled: false,
      timezone: 'America/New_York' // Stock market timezone
    });

    this.scrapingTask.start();
    this.calculateNextRun(intervalMinutes);
    
    console.log(`Cron service started. Next run: ${this.nextRun?.toISOString()}`);
    
    // Run immediately on startup
    setTimeout(() => this.runScrapingTask(), 5000); // Wait 5 seconds for server to fully initialize
  }

  public stop(): void {
    if (this.scrapingTask) {
      this.scrapingTask.stop();
      console.log('Cron service stopped');
    }
  }

  public async runScrapingTask(): Promise<void> {
    if (this.isRunning) {
      console.log('Scraping task already running, skipping...');
      return;
    }

    this.isRunning = true;
    this.lastRun = new Date();
    
    const startTime = Date.now();
    
    try {
      console.log('=== Starting scheduled stock data scraping ===');
      
      // Notify clients that scraping started
      this.webSocketService.sendScrapingStatus('STARTED', 'Starting stock data collection...', this.nextRun);

      // Scrape stock data
      const scrapingResult = await this.scraperService.scrapeStockData();
      const executionTime = Date.now() - startTime;

      if (!scrapingResult.success) {
        console.error('Scraping failed:', scrapingResult.error);
        this.webSocketService.sendScrapingStatus('ERROR', `Scraping failed: ${scrapingResult.error}`);
        return;
      }

      console.log(`Successfully scraped ${scrapingResult.data.length} stocks in ${executionTime}ms`);

      // Always process and broadcast data - no change detection
      console.log(`📊 Processing and broadcasting ${scrapingResult.data.length} stocks...`);

      // Analyze changes compared to previous data
      const stockUpdates = await this.stockService.analyzeStockChanges(scrapingResult.data);
      
      // Save to database
      await this.stockService.saveStockData(scrapingResult.data, {
        ...scrapingResult,
        totalStocks: scrapingResult.data.length
      });

      // Check for alerts
      const alerts = await this.alertService.checkForAlerts(scrapingResult.data, stockUpdates);

      // Always broadcast updates to connected clients
      this.webSocketService.broadcastStockUpdate(scrapingResult.data, stockUpdates, scrapingResult);

      // Send individual alerts
      for (const alert of alerts) {
        this.webSocketService.broadcastAlert(
          alert.stock,
          alert.update,
          alert.alertType,
          alert.message
        );
      }

      // Notify clients of successful completion
      const statusMessage = `Processed ${scrapingResult.data.length} stocks - ${alerts.length} alerts generated`;
      this.webSocketService.sendScrapingStatus('SUCCESS', statusMessage, this.nextRun);

      // Clean old data periodically (once per hour)
      if (this.shouldCleanOldData()) {
        await this.stockService.cleanOldData(30); // Keep 30 days of data
      }

      console.log(`✅ Scraping task completed in ${executionTime}ms - Data changes broadcasted`);

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`❌ Scraping task failed after ${executionTime}ms:`, error);
      
      this.webSocketService.sendScrapingStatus('ERROR', `Task failed: ${errorMessage}`);
      
      // Save failed scraping attempt to database
      await this.stockService.saveStockData([], {
        success: false,
        data: [],
        timestamp: new Date(),
        error: errorMessage,
        totalStocks: 0
      });

    } finally {
      this.isRunning = false;
      this.calculateNextRun(parseInt(process.env.SCRAPING_INTERVAL_MINUTES || '1'));
    }
  }

  private calculateNextRun(intervalMinutes: number): void {
    const now = new Date();
    this.nextRun = new Date(now.getTime() + intervalMinutes * 60 * 1000);
  }

  private shouldCleanOldData(): boolean {
    if (!this.lastRun) return false;
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return this.lastRun < oneHourAgo;
  }

  public getStatus(): {
    isRunning: boolean;
    lastRun?: Date;
    nextRun?: Date;
    intervalMinutes: number;
  } {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      nextRun: this.nextRun,
      intervalMinutes: parseInt(process.env.SCRAPING_INTERVAL_MINUTES || '1')
    };
  }

  public async triggerManualRun(): Promise<void> {
    console.log('🔄 Manual scraping task triggered');
    await this.runScrapingTask();
  }
} 