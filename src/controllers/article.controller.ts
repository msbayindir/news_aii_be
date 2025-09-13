import { Request, Response } from 'express';
import { articleService } from '../services/article.service';
import { logService } from '../services/log.service';

export class ArticleController {
  /**
   * Get articles with pagination and filters
   */
  async getArticles(req: Request, res: Response) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        sourceId, 
        categoryId,
        categoryNames,
        search,
        startDate,
        endDate 
      } = req.query;

      // Parse category names if provided
      const categoryNamesArray = categoryNames 
        ? (categoryNames as string).split(',').map(name => name.trim())
        : undefined;

      const result = await articleService.getArticles({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sourceId: sourceId as string,
        categoryId: categoryId as string,
        categoryNames: categoryNamesArray,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        search: search as string,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      await logService.error('Failed to get articles', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get articles',
      });
    }
  }

  /**
   * Get single article
   */
  async getArticle(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const article = await articleService.getArticleById(id);

      if (!article) {
        return res.status(404).json({
          success: false,
          error: 'Article not found',
        });
      }

      res.json({
        success: true,
        data: article,
      });
    } catch (error) {
      await logService.error('Failed to get article', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get article',
      });
    }
  }

  /**
   * Get latest articles
   */
  async getLatestArticles(req: Request, res: Response) {
    try {
      const { limit = '10' } = req.query;
      const articles = await articleService.getLatestArticles(parseInt(limit as string));

      res.json({
        success: true,
        data: articles,
      });
    } catch (error) {
      await logService.error('Failed to get latest articles', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get latest articles',
      });
    }
  }

  /**
   * Get trending articles
   */
  async getTrendingArticles(req: Request, res: Response) {
    try {
      const { limit = '10' } = req.query;
      const articles = await articleService.getTrendingArticles(parseInt(limit as string));

      res.json({
        success: true,
        data: articles,
      });
    } catch (error) {
      await logService.error('Failed to get trending articles', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get trending articles',
      });
    }
  }

  /**
   * Search articles
   */
  async searchArticles(req: Request, res: Response) {
    try {
      const { q, limit = '20' } = req.query;

      if (!q) {
        return res.status(400).json({
          success: false,
          error: 'Search query is required',
        });
      }

      const articles = await articleService.searchArticles(
        q as string,
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: articles,
      });
    } catch (error) {
      await logService.error('Failed to search articles', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to search articles',
      });
    }
  }

  /**
   * Get statistics
   */
  async getStatistics(req: Request, res: Response) {
    try {
      const stats = await articleService.getStatistics();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      await logService.error('Failed to get statistics', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get statistics',
      });
    }
  }
}

export const articleController = new ArticleController();
