import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';

const router: Router = Router();

// Word frequency routes
router.post('/wordfrequency/generate', analyticsController.generateWordFrequency);
router.get('/wordfrequency/latest', analyticsController.getLatestWordFrequency);

// Report routes
router.post('/report/generate', analyticsController.generateReport);
router.get('/report/latest', analyticsController.getLatestReport);
router.get('/report/history', analyticsController.getReportHistory);
router.get('/report/:id', analyticsController.getReportById);

export default router;
