import { Router } from 'express';
import { AlertsController } from '../controllers/alerts.controller';

export function createAlertsRoutes(alertsController: AlertsController): Router {
  const router = Router();

  // GET /api/alerts - Get all alert rules
  router.get('/', alertsController.getAllAlertRules);

  // GET /api/alerts/active - Get active alert rules
  router.get('/active', alertsController.getActiveAlertRules);

  // POST /api/alerts - Create new alert rule
  router.post('/', alertsController.createAlertRule);

  // PUT /api/alerts/:id - Update alert rule
  router.put('/:id', alertsController.updateAlertRule);

  // DELETE /api/alerts/:id - Delete alert rule
  router.delete('/:id', alertsController.deleteAlertRule);

  return router;
} 