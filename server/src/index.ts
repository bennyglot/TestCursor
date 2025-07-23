import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { corsMiddleware } from './middleware/cors.middleware';
import { createApiRoutes } from './routes';
import { Database } from './config/database';
import { ScraperService } from './services/scraper.service';
import { StockService } from './services/stock.service';
import { WebSocketService } from './services/websocket.service';
import { AlertService } from './services/alert.service';
import { CronService } from './services/cron.service';
import { StocksController } from './controllers/stocks.controller';
import { AlertsController } from './controllers/alerts.controller';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = parseInt(process.env.PORT || '3001');
const WS_PORT = parseInt(process.env.WEBSOCKET_PORT || '3002');

// Security and performance middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for development
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy for deployment behind reverse proxy
app.set('trust proxy', 1);

// Initialize services
const database = Database.getInstance();
const scraperService = new ScraperService();
const stockService = new StockService();
const alertService = new AlertService();
const webSocketService = new WebSocketService(WS_PORT);
const cronService = new CronService(
  scraperService,
  stockService,
  webSocketService,
  alertService
);

// Initialize controllers
const stocksController = new StocksController(stockService, cronService);
const alertsController = new AlertsController(alertService);

// API routes
app.use('/api', createApiRoutes(stocksController, alertsController));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Stock Monitor API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date(),
    endpoints: {
      health: '/api/health',
      stocks: '/api/stocks',
      alerts: '/api/alerts',
      websocket: '/api/websocket/info'
    },
    websocket: {
      url: `ws://localhost:${WS_PORT}`,
      port: WS_PORT
    }
  });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `The route ${req.method} ${req.originalUrl} does not exist`,
    timestamp: new Date()
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log('===========================================');
  console.log('🚀 Stock Monitor Server Started');
  console.log('===========================================');
  console.log(`📡 HTTP Server: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket Server: ws://localhost:${WS_PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: ${process.env.DATABASE_PATH || './data/stocks.db'}`);
  console.log('===========================================');
  
  // Start cron service after server is running
  cronService.start();
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received, starting graceful shutdown...`);
  
  try {
    // Stop cron service
    cronService.stop();
    
    // Close WebSocket server
    await webSocketService.close();
    
    // Close HTTP server
    server.close(() => {
      console.log('HTTP server closed');
    });
    
    // Close database connection
    await database.close();
    
    console.log('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon restart

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

export default app; 