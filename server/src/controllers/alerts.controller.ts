import { Request, Response } from 'express';
import { AlertService } from '../services/alert.service';
import { ApiResponse } from '@/types/api.interface';
import { AlertRule } from '@/types/stock.interface';

export class AlertsController {
  private alertService: AlertService;

  constructor(alertService: AlertService) {
    this.alertService = alertService;
  }

  public getAllAlertRules = async (req: Request, res: Response): Promise<void> => {
    try {
      const rules = await this.alertService.getAlertRules();

      const response: ApiResponse<AlertRule[]> = {
        success: true,
        data: rules,
        message: `Retrieved ${rules.length} alert rules`,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve alert rules');
    }
  };

  public getActiveAlertRules = async (req: Request, res: Response): Promise<void> => {
    try {
      const rules = await this.alertService.getActiveAlertRules();

      const response: ApiResponse<AlertRule[]> = {
        success: true,
        data: rules,
        message: `Retrieved ${rules.length} active alert rules`,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve active alert rules');
    }
  };

  public createAlertRule = async (req: Request, res: Response): Promise<void> => {
    try {
      const { symbol, minPercentChange, maxPercentChange, minVolume, enabled = true } = req.body;

      // Validation
      if (!symbol && !minPercentChange && !maxPercentChange && !minVolume) {
        res.status(400).json({
          success: false,
          error: 'At least one alert condition (symbol, minPercentChange, maxPercentChange, or minVolume) is required',
          timestamp: new Date()
        });
        return;
      }

      if (minPercentChange !== undefined && (minPercentChange < 0 || minPercentChange > 1000)) {
        res.status(400).json({
          success: false,
          error: 'minPercentChange must be between 0 and 1000',
          timestamp: new Date()
        });
        return;
      }

      if (maxPercentChange !== undefined && (maxPercentChange < 0 || maxPercentChange > 1000)) {
        res.status(400).json({
          success: false,
          error: 'maxPercentChange must be between 0 and 1000',
          timestamp: new Date()
        });
        return;
      }

      if (minVolume !== undefined && minVolume < 0) {
        res.status(400).json({
          success: false,
          error: 'minVolume must be a positive number',
          timestamp: new Date()
        });
        return;
      }

      const newRule = {
        symbol: symbol?.toUpperCase() || undefined,
        minPercentChange,
        maxPercentChange,
        minVolume,
        enabled
      };

      const ruleId = await this.alertService.createAlertRule(newRule);

      const response: ApiResponse<{ id: number; rule: typeof newRule }> = {
        success: true,
        data: { id: ruleId, rule: newRule },
        message: 'Alert rule created successfully',
        timestamp: new Date()
      };

      res.status(201).json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to create alert rule');
    }
  };

  public updateAlertRule = async (req: Request, res: Response): Promise<void> => {
    try {
      const ruleId = parseInt(req.params.id);
      if (isNaN(ruleId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid alert rule ID',
          timestamp: new Date()
        });
        return;
      }

      const { symbol, minPercentChange, maxPercentChange, minVolume, enabled } = req.body;

      // Validation
      if (minPercentChange !== undefined && (minPercentChange < 0 || minPercentChange > 1000)) {
        res.status(400).json({
          success: false,
          error: 'minPercentChange must be between 0 and 1000',
          timestamp: new Date()
        });
        return;
      }

      if (maxPercentChange !== undefined && (maxPercentChange < 0 || maxPercentChange > 1000)) {
        res.status(400).json({
          success: false,
          error: 'maxPercentChange must be between 0 and 1000',
          timestamp: new Date()
        });
        return;
      }

      if (minVolume !== undefined && minVolume < 0) {
        res.status(400).json({
          success: false,
          error: 'minVolume must be a positive number',
          timestamp: new Date()
        });
        return;
      }

      const updates: Partial<AlertRule> = {};
      if (symbol !== undefined) updates.symbol = symbol.toUpperCase();
      if (minPercentChange !== undefined) updates.minPercentChange = minPercentChange;
      if (maxPercentChange !== undefined) updates.maxPercentChange = maxPercentChange;
      if (minVolume !== undefined) updates.minVolume = minVolume;
      if (enabled !== undefined) updates.enabled = enabled;

      await this.alertService.updateAlertRule(ruleId, updates);

      const response: ApiResponse<{ id: number; updates: typeof updates }> = {
        success: true,
        data: { id: ruleId, updates },
        message: 'Alert rule updated successfully',
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to update alert rule');
    }
  };

  public deleteAlertRule = async (req: Request, res: Response): Promise<void> => {
    try {
      const ruleId = parseInt(req.params.id);
      if (isNaN(ruleId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid alert rule ID',
          timestamp: new Date()
        });
        return;
      }

      await this.alertService.deleteAlertRule(ruleId);

      const response: ApiResponse<{ id: number }> = {
        success: true,
        data: { id: ruleId },
        message: 'Alert rule deleted successfully',
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to delete alert rule');
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