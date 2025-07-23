import { Router } from 'express';
import { StocksController } from '../controllers/stocks.controller';

export function createStocksRoutes(stocksController: StocksController): Router {
  const router = Router();

  // GET /api/stocks - Get latest stocks
  router.get('/', stocksController.getLatestStocks);

  // GET /api/stocks/top-gainers - Get top performing stocks
  router.get('/top-gainers', stocksController.getTopGainers);

  // GET /api/stocks/updates - Get recent stock updates/changes
  router.get('/updates', stocksController.getStockUpdates);

  // GET /api/stocks/search - Search stocks
  router.get('/search', stocksController.searchStocks);

  // GET /api/stocks/scraping/status - Get scraping status
  router.get('/scraping/status', stocksController.getScrapingStatus);

  // POST /api/stocks/scraping/trigger - Trigger manual scraping
  router.post('/scraping/trigger', stocksController.triggerManualScraping);

  // GET /api/stocks/:symbol/history - Get stock history
  router.get('/:symbol/history', stocksController.getStockHistory);

  return router;
} 