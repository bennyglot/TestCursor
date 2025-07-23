import { Database } from '../config/database';
import { StockData, StockUpdate, AlertRule } from '@/types/stock.interface';
import { DatabaseAlertRule } from '@/types/database.interface';

interface AlertTrigger {
  stock: StockData;
  update: StockUpdate;
  alertType: string;
  message: string;
}

export class AlertService {
  private db: Database;
  private defaultThresholds: {
    minPercentChange: number;
    minVolumeIncrease: number;
    significantRankChange: number;
  };

  constructor() {
    this.db = Database.getInstance();
    this.defaultThresholds = {
      minPercentChange: parseFloat(process.env.ALERT_THRESHOLDS_PERCENT_CHANGE || '20'),
      minVolumeIncrease: 500000, // 500K volume increase
      significantRankChange: 10   // Rank change of 10 or more positions
    };
  }

  public async checkForAlerts(stocks: StockData[], updates: StockUpdate[]): Promise<AlertTrigger[]> {
    const alerts: AlertTrigger[] = [];

    // Get all active alert rules
    const alertRules = await this.getActiveAlertRules();

    for (const update of updates) {
      const stock = stocks.find(s => s.symbol === update.currentData.symbol);
      if (!stock) continue;

      // Check built-in alert conditions
      const builtInAlerts = this.checkBuiltInAlerts(stock, update);
      alerts.push(...builtInAlerts);

      // Check custom alert rules
      const customAlerts = this.checkCustomAlertRules(stock, update, alertRules);
      alerts.push(...customAlerts);
    }

    // Check for new high performers
    const topPerformers = this.checkTopPerformers(stocks);
    alerts.push(...topPerformers);

    return alerts;
  }

  private checkBuiltInAlerts(stock: StockData, update: StockUpdate): AlertTrigger[] {
    const alerts: AlertTrigger[] = [];

    // High percentage gain alert
    if (stock.percentChange >= this.defaultThresholds.minPercentChange) {
      alerts.push({
        stock,
        update,
        alertType: 'HIGH_GAIN',
        message: `${stock.symbol} has gained ${stock.percentChange.toFixed(2)}% in premarket trading`
      });
    }

    // Significant price movement
    if (update.changeType === 'PRICE_INCREASE' && update.changePercent && update.changePercent > 15) {
      alerts.push({
        stock,
        update,
        alertType: 'PRICE_SPIKE',
        message: `${stock.symbol} price spiked ${update.changePercent.toFixed(2)}% to $${stock.premarketPrice.toFixed(2)}`
      });
    }

    // New entry to top gainers
    if (update.changeType === 'NEW' && stock.rank <= 10) {
      alerts.push({
        stock,
        update,
        alertType: 'NEW_TOP_GAINER',
        message: `${stock.symbol} entered top 10 gainers at rank ${stock.rank} with ${stock.percentChange.toFixed(2)}% gain`
      });
    }

    // Significant rank improvement
    if (update.changeType === 'RANK_CHANGE' && 
        update.previousData.rank - update.currentData.rank >= this.defaultThresholds.significantRankChange) {
      alerts.push({
        stock,
        update,
        alertType: 'RANK_IMPROVEMENT',
        message: `${stock.symbol} jumped from rank ${update.previousData.rank} to ${update.currentData.rank}`
      });
    }

    // High volume trading
    if (stock.premarketVolume > 1000000) { // > 1M volume
      alerts.push({
        stock,
        update,
        alertType: 'HIGH_VOLUME',
        message: `${stock.symbol} trading with high volume: ${this.formatVolume(stock.premarketVolume)}`
      });
    }

    return alerts;
  }

  private checkCustomAlertRules(stock: StockData, update: StockUpdate, rules: AlertRule[]): AlertTrigger[] {
    const alerts: AlertTrigger[] = [];

    for (const rule of rules) {
      // Symbol-specific rules
      if (rule.symbol && rule.symbol !== stock.symbol) {
        continue;
      }

      let triggered = false;
      let message = '';

      // Check percent change thresholds
      if (rule.minPercentChange && stock.percentChange >= rule.minPercentChange) {
        triggered = true;
        message = `${stock.symbol} exceeded minimum gain threshold of ${rule.minPercentChange}%`;
      }

      if (rule.maxPercentChange && stock.percentChange <= rule.maxPercentChange) {
        triggered = true;
        message = `${stock.symbol} below maximum gain threshold of ${rule.maxPercentChange}%`;
      }

      // Check volume thresholds
      if (rule.minVolume && stock.premarketVolume >= rule.minVolume) {
        triggered = true;
        message = `${stock.symbol} exceeded minimum volume threshold of ${this.formatVolume(rule.minVolume)}`;
      }

      if (triggered) {
        alerts.push({
          stock,
          update,
          alertType: 'CUSTOM_RULE',
          message
        });
      }
    }

    return alerts;
  }

  private checkTopPerformers(stocks: StockData[]): AlertTrigger[] {
    const alerts: AlertTrigger[] = [];

    // Top 3 performers
    const topPerformers = stocks
      .filter(s => s.rank <= 3)
      .sort((a, b) => a.rank - b.rank);

    topPerformers.forEach((stock, index) => {
      alerts.push({
        stock,
        update: {
          id: 0,
          stockId: stock.id || 0,
          previousData: stock,
          currentData: stock,
          changeType: 'NEW',
          timestamp: stock.timestamp
        },
        alertType: 'TOP_PERFORMER',
        message: `${stock.symbol} is #${stock.rank} premarket gainer with ${stock.percentChange.toFixed(2)}% gain`
      });
    });

    return alerts;
  }

  public async createAlertRule(rule: Omit<AlertRule, 'id' | 'createdAt'>): Promise<number> {
    const result = await this.db.run(
      `INSERT INTO alert_rules (symbol, min_percent_change, max_percent_change, min_volume, enabled)
       VALUES (?, ?, ?, ?, ?)`,
      [
        rule.symbol || null,
        rule.minPercentChange || null,
        rule.maxPercentChange || null,
        rule.minVolume || null,
        rule.enabled ? 1 : 0
      ]
    );

    return result.lastID!;
  }

  public async updateAlertRule(id: number, updates: Partial<AlertRule>): Promise<void> {
    const setParts: string[] = [];
    const values: any[] = [];

    if (updates.symbol !== undefined) {
      setParts.push('symbol = ?');
      values.push(updates.symbol);
    }
    if (updates.minPercentChange !== undefined) {
      setParts.push('min_percent_change = ?');
      values.push(updates.minPercentChange);
    }
    if (updates.maxPercentChange !== undefined) {
      setParts.push('max_percent_change = ?');
      values.push(updates.maxPercentChange);
    }
    if (updates.minVolume !== undefined) {
      setParts.push('min_volume = ?');
      values.push(updates.minVolume);
    }
    if (updates.enabled !== undefined) {
      setParts.push('enabled = ?');
      values.push(updates.enabled ? 1 : 0);
    }

    if (setParts.length === 0) return;

    setParts.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await this.db.run(
      `UPDATE alert_rules SET ${setParts.join(', ')} WHERE id = ?`,
      values
    );
  }

  public async deleteAlertRule(id: number): Promise<void> {
    await this.db.run('DELETE FROM alert_rules WHERE id = ?', [id]);
  }

  public async getAlertRules(): Promise<AlertRule[]> {
    const rules = await this.db.all<DatabaseAlertRule>('SELECT * FROM alert_rules ORDER BY created_at DESC');
    return rules.map(this.mapDatabaseRuleToAlertRule);
  }

  public async getActiveAlertRules(): Promise<AlertRule[]> {
    const rules = await this.db.all<DatabaseAlertRule>('SELECT * FROM alert_rules WHERE enabled = 1');
    return rules.map(this.mapDatabaseRuleToAlertRule);
  }

  private mapDatabaseRuleToAlertRule(dbRule: DatabaseAlertRule): AlertRule {
    return {
      id: dbRule.id,
      symbol: dbRule.symbol || undefined,
      minPercentChange: dbRule.min_percent_change || undefined,
      maxPercentChange: dbRule.max_percent_change || undefined,
      minVolume: dbRule.min_volume || undefined,
      enabled: dbRule.enabled === 1,
      createdAt: new Date(dbRule.created_at)
    };
  }

  private formatVolume(volume: number): string {
    if (volume >= 1000000000) {
      return (volume / 1000000000).toFixed(1) + 'B';
    }
    if (volume >= 1000000) {
      return (volume / 1000000).toFixed(1) + 'M';
    }
    if (volume >= 1000) {
      return (volume / 1000).toFixed(1) + 'K';
    }
    return volume.toString();
  }
} 