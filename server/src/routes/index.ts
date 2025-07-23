import { Router } from 'express';
import { createStocksRoutes } from './stocks.routes';
import { createAlertsRoutes } from './alerts.routes';
import { StocksController } from '../controllers/stocks.controller';
import { AlertsController } from '../controllers/alerts.controller';

export function createApiRoutes(
  stocksController: StocksController,
  alertsController: AlertsController
): Router {
  const apiRouter = Router();

  // Health check endpoint
  apiRouter.get('/health', (req, res) => {
    res.json({
      status: 'OK',
      message: 'Stock Monitor API is running',
      timestamp: new Date(),
      version: '1.0.0'
    });
  });

  // API routes
  apiRouter.use('/stocks', createStocksRoutes(stocksController));
  apiRouter.use('/alerts', createAlertsRoutes(alertsController));

  // WebSocket info endpoint
  apiRouter.get('/websocket/info', (req, res) => {
    const wsPort = process.env.WEBSOCKET_PORT || 3002;
    res.json({
      success: true,
      data: {
        websocketUrl: `ws://localhost:${wsPort}`,
        port: wsPort,
        protocols: ['ws'],
        features: [
          'real-time stock updates',
          'alert notifications',
          'scraping status updates'
        ]
      },
      message: 'WebSocket connection information',
      timestamp: new Date()
    });
  });

  // 404 handler for API routes
  apiRouter.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: 'API endpoint not found',
      message: `The endpoint ${req.method} ${req.originalUrl} does not exist`,
      timestamp: new Date()
    });
  });

  return apiRouter;
} 