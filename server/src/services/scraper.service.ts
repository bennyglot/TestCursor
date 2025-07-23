import axios from 'axios';
import * as cheerio from 'cheerio';
import { StockData, ScrapingResult } from '@/types/stock.interface';

export class ScraperService {
  private readonly baseUrl = process.env.SCRAPING_URL || 'https://stockanalysis.com/markets/premarket/gainers/';
  private readonly maxStocks = parseInt(process.env.MAX_STOCKS_TO_TRACK || '50');
  private readonly userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  public async scrapeStockData(): Promise<ScrapingResult> {
    const startTime = Date.now();
    
    try {
      console.log(`Starting stock data scraping from: ${this.baseUrl}`);
      
      const response = await axios.get(this.baseUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 30000,
        maxRedirects: 5,
      });

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const stocks = this.parseStockData(response.data);
      const executionTime = Date.now() - startTime;

      console.log(`Successfully scraped ${stocks.length} stocks in ${executionTime}ms`);

      return {
        success: true,
        data: stocks,
        timestamp: new Date(),
        totalStocks: stocks.length,
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      console.error(`Scraping failed after ${executionTime}ms:`, errorMessage);

      return {
        success: false,
        data: [],
        timestamp: new Date(),
        error: errorMessage,
        totalStocks: 0,
      };
    }
  }

  private parseStockData(html: string): StockData[] {
    const $ = cheerio.load(html);
    const stocks: StockData[] = [];
    const timestamp = new Date();

    // Target the table containing stock data
    const tableRows = $('table tbody tr');
    
    if (tableRows.length === 0) {
      throw new Error('No stock data table found on the page');
    }

    tableRows.each((index, element) => {
      try {
        if (index >= this.maxStocks) return false; // Limit results

        const row = $(element);
        const cells = row.find('td');
        
        if (cells.length < 6) {
          console.warn(`Skipping row ${index + 1}: insufficient data columns`);
          return;
        }

        // Extract data from table cells based on the structure
        const rank = index + 1;
        const symbolElement = cells.eq(1).find('a');
        const symbol = symbolElement.text().trim();
        
        if (!symbol) {
          console.warn(`Skipping row ${index + 1}: no symbol found`);
          return;
        }

        const companyName = cells.eq(2).text().trim();
        const percentChangeText = cells.eq(3).text().trim().replace('%', '');
        const premarketPriceText = cells.eq(4).text().trim();
        const premarketVolumeText = cells.eq(5).text().trim().replace(/,/g, '');
        const marketCap = cells.eq(6).text().trim();

        // Validate and parse numeric values
        const percentChange = this.parseFloat(percentChangeText);
        const premarketPrice = this.parseFloat(premarketPriceText);
        const premarketVolume = this.parseInt(premarketVolumeText);

        if (isNaN(percentChange) || isNaN(premarketPrice) || isNaN(premarketVolume)) {
          console.warn(`Skipping ${symbol}: invalid numeric data`);
          return;
        }

        const stockData: StockData = {
          symbol,
          companyName,
          percentChange,
          premarketPrice,
          premarketVolume,
          marketCap,
          rank,
          timestamp,
        };

        stocks.push(stockData);

      } catch (rowError) {
        console.error(`Error parsing row ${index + 1}:`, rowError);
      }
    });

    if (stocks.length === 0) {
      throw new Error('No valid stock data could be parsed from the page');
    }

    // Sort by rank to ensure consistency
    stocks.sort((a, b) => a.rank - b.rank);

    return stocks;
  }

  private parseFloat(value: string): number {
    // Handle various number formats including K, M, B suffixes
    const cleanValue = value.replace(/[$,\s]/g, '');
    
    if (cleanValue.endsWith('K')) {
      return parseFloat(cleanValue.slice(0, -1)) * 1000;
    }
    if (cleanValue.endsWith('M')) {
      return parseFloat(cleanValue.slice(0, -1)) * 1000000;
    }
    if (cleanValue.endsWith('B')) {
      return parseFloat(cleanValue.slice(0, -1)) * 1000000000;
    }
    
    return parseFloat(cleanValue);
  }

  private parseInt(value: string): number {
    const cleanValue = value.replace(/[,$\s]/g, '');
    
    if (cleanValue.endsWith('K')) {
      return Math.round(parseFloat(cleanValue.slice(0, -1)) * 1000);
    }
    if (cleanValue.endsWith('M')) {
      return Math.round(parseFloat(cleanValue.slice(0, -1)) * 1000000);
    }
    if (cleanValue.endsWith('B')) {
      return Math.round(parseFloat(cleanValue.slice(0, -1)) * 1000000000);
    }
    
    return parseInt(cleanValue, 10);
  }

  public validateStockData(stock: StockData): boolean {
    return !!(
      stock.symbol &&
      stock.companyName &&
      typeof stock.percentChange === 'number' &&
      typeof stock.premarketPrice === 'number' &&
      typeof stock.premarketVolume === 'number' &&
      stock.marketCap &&
      typeof stock.rank === 'number' &&
      stock.timestamp instanceof Date &&
      !isNaN(stock.percentChange) &&
      !isNaN(stock.premarketPrice) &&
      !isNaN(stock.premarketVolume) &&
      stock.premarketPrice > 0 &&
      stock.premarketVolume >= 0 &&
      stock.rank > 0
    );
  }
} 