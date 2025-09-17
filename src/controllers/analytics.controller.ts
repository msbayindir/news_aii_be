import { Request, Response } from 'express';
import { analyticsService } from '../services/analytics.service';
import { logService } from '../services/log.service';

class AnalyticsController {
  /**
   * Generate word frequency analysis
   */
  async generateWordFrequency(req: Request, res: Response) {
    try {
      const { limit = 10 } = req.body;
      
      await analyticsService.analyzeWordFrequency(limit);
      
      const wordFrequency = await analyticsService.getLatestWordFrequency();
      
      res.json({
        success: true,
        data: wordFrequency,
      });
    } catch (error) {
      await logService.error('Failed to generate word frequency', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to generate word frequency',
      });
    }
  }

  /**
   * Get latest word frequency
   */
  async getLatestWordFrequency(_req: Request, res: Response) {
    try {
      const wordFrequency = await analyticsService.getLatestWordFrequency();
      
      res.json({
        success: true,
        data: wordFrequency,
      });
    } catch (error) {
      await logService.error('Failed to get word frequency', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get word frequency',
      });
    }
  }

  /**
   * Generate report
   */
  async generateReport(req: Request, res: Response): Promise<void> {
    try {
      const { type, date } = req.body;
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }
      
      if (!['daily', 'weekly', 'monthly'].includes(type)) {
        res.status(400).json({
          success: false,
          error: 'Invalid report type',
        });
        return;
      }
      
      const reportDate = date ? new Date(date) : new Date();
      await analyticsService.generateReport(type, reportDate, userId);
      
      const report = await analyticsService.getLatestReport(type, userId);
      
      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      await logService.error('Failed to generate report', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to generate report',
      });
    }
  }

  /**
   * Get latest report
   */
  async getLatestReport(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.query;
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }
      
      if (!type || !['daily', 'weekly', 'monthly'].includes(type as string)) {
        res.status(400).json({
          success: false,
          error: 'Invalid report type',
        });
        return;
      }
      
      const report = await analyticsService.getLatestReport(type as 'daily' | 'weekly' | 'monthly', userId);
      
      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      await logService.error('Failed to get report', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get report',
      });
    }
  }

  /**
   * Get report history
   */
  async getReportHistory(req: Request, res: Response): Promise<void> {
    try {
      const { type, limit = 10 } = req.query;
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }
      
      if (!type || !['daily', 'weekly', 'monthly'].includes(type as string)) {
        res.status(400).json({
          success: false,
          error: 'Invalid report type',
        });
        return;
      }
      
      const reports = await analyticsService.getReportHistory(
        type as 'daily' | 'weekly' | 'monthly',
        Number(limit),
        userId
      );
      
      res.json({
        success: true,
        data: reports,
      });
    } catch (error) {
      await logService.error('Failed to get report history', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get report history',
      });
    }
  }

  /**
   * Get report by ID
   */
  async getReportById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }
      
      const report = await analyticsService.getReportById(id, userId);
      
      if (!report) {
        res.status(404).json({
          success: false,
          error: 'Report not found',
        });
        return;
      }
      
      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      await logService.error('Failed to get report', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get report',
      });
    }
  }
}

export const analyticsController = new AnalyticsController();
