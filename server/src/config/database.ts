import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

export class Database {
  private db: sqlite3.Database;
  private static instance: Database;

  private constructor() {
    const dbPath = process.env.DATABASE_PATH || './data/stocks.db';
    const dbDir = path.dirname(dbPath);
    
    // Ensure database directory exists
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        throw err;
      }
      console.log('Connected to SQLite database');
    });

    this.initializeSchema();
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  private initializeSchema(): void {
    const schema = `
      -- Stocks table for current and historical stock data
      CREATE TABLE IF NOT EXISTS stocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        company_name TEXT NOT NULL,
        percent_change REAL NOT NULL,
        premarket_price REAL NOT NULL,
        premarket_volume INTEGER NOT NULL,
        market_cap TEXT NOT NULL,
        rank INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(symbol, timestamp)
      );

      -- Stock updates table for tracking changes
      CREATE TABLE IF NOT EXISTS stock_updates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stock_id INTEGER NOT NULL,
        previous_percent_change REAL,
        current_percent_change REAL NOT NULL,
        previous_price REAL,
        current_price REAL NOT NULL,
        previous_rank INTEGER,
        current_rank INTEGER NOT NULL,
        change_type TEXT NOT NULL CHECK(change_type IN ('NEW', 'PRICE_INCREASE', 'PRICE_DECREASE', 'RANK_CHANGE', 'REMOVED')),
        change_amount REAL,
        change_percent REAL,
        timestamp TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (stock_id) REFERENCES stocks (id)
      );

      -- Alert rules for notifications
      CREATE TABLE IF NOT EXISTS alert_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT,
        min_percent_change REAL,
        max_percent_change REAL,
        min_volume INTEGER,
        enabled INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      -- Scraping logs for monitoring
      CREATE TABLE IF NOT EXISTS scraping_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        success INTEGER NOT NULL,
        total_stocks INTEGER DEFAULT 0,
        error_message TEXT,
        execution_time_ms INTEGER NOT NULL,
        timestamp TEXT NOT NULL
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_stocks_symbol ON stocks(symbol);
      CREATE INDEX IF NOT EXISTS idx_stocks_timestamp ON stocks(timestamp);
      CREATE INDEX IF NOT EXISTS idx_stocks_symbol_timestamp ON stocks(symbol, timestamp);
      CREATE INDEX IF NOT EXISTS idx_stock_updates_stock_id ON stock_updates(stock_id);
      CREATE INDEX IF NOT EXISTS idx_stock_updates_timestamp ON stock_updates(timestamp);
      CREATE INDEX IF NOT EXISTS idx_scraping_logs_timestamp ON scraping_logs(timestamp);
    `;

    this.db.exec(schema, (err) => {
      if (err) {
        console.error('Error creating database schema:', err.message);
        throw err;
      }
      console.log('Database schema initialized successfully');
    });
  }

  public getDb(): sqlite3.Database {
    return this.db;
  }

  public close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Database connection closed');
          resolve();
        }
      });
    });
  }

  // Utility methods for common operations
  public run(sql: string, params: any[] = []): Promise<sqlite3.RunResult> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this);
        }
      });
    });
  }

  public get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row as T);
        }
      });
    });
  }

  public all<T>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }
} 