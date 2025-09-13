import { Request, Response, NextFunction } from 'express';
import { geminiService } from '../services/gemini.service';
import { logService } from '../services/log.service';
import prisma from '../config/database.config';

export class GeminiController {
  /**
   * Summarize articles between dates
   */
  async summarizeArticles(req: Request, res: Response) {
    try {
      const { startDate, endDate, prompt } = req.body;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'Start date and end date are required',
        });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start > end) {
        return res.status(400).json({
          success: false,
          error: 'Start date must be before end date',
        });
      }

      const summary = await geminiService.summarizeArticles(start, end, prompt);

      return res.json({
        success: true,
        data: {
          summary,
          dateRange: {
            start: start.toISOString(),
            end: end.toISOString(),
          },
        },
      });
    } catch (error) {
      await logService.error('Failed to summarize articles', { error });
      return res.status(500).json({
        success: false,
        error: 'Failed to summarize articles',
      });
    }
  }

  /**
   * Search web using Gemini
   */
  async searchWeb(req: Request, res: Response, _next?: NextFunction) {
    try {
      const { query, maxDaysOld = 7 } = req.body;

      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Query is required',
        });
      }

      // Gaziantep/Şehitkamil odaklı arama
      const enhancedQuery = `${query} Gaziantep Şehitkamil`;
      const results = await geminiService.searchWeb(enhancedQuery, maxDaysOld);

      return res.json({
        success: true,
        data: {
          query,
          results,
          count: results.length,
        },
      });
    } catch (error) {
      await logService.error('Failed to search web', { error });
      return res.status(500).json({
        success: false,
        error: 'Failed to search web',
      });
    }
  }

  /**
   * Get past summaries
   */
  async getSummaries(req: Request, res: Response) {
    try {
      const { page = '1', limit = '10' } = req.query;
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const [summaries, total] = await Promise.all([
        prisma.summary.findMany({
          skip,
          take: parseInt(limit as string),
          include: {
            _count: {
              select: { articles: true },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        prisma.summary.count(),
      ]);

      res.json({
        success: true,
        data: {
          summaries,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total,
            totalPages: Math.ceil(total / parseInt(limit as string)),
          },
        },
      });
    } catch (error) {
      await logService.error('Failed to get summaries', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get summaries',
      });
    }
  }

  /**
   * Get search history
   */
  async getSearchHistory(req: Request, res: Response) {
    try {
      const { page = '1', limit = '20' } = req.query;
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const [history, total] = await Promise.all([
        prisma.searchHistory.findMany({
          skip,
          take: parseInt(limit as string),
          orderBy: {
            createdAt: 'desc',
          },
        }),
        prisma.searchHistory.count(),
      ]);

      res.json({
        success: true,
        data: {
          history,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total,
            totalPages: Math.ceil(total / parseInt(limit as string)),
          },
        },
      });
    } catch (error) {
      await logService.error('Failed to get search history', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get search history',
      });
    }
  }
}

export const geminiController = new GeminiController();
