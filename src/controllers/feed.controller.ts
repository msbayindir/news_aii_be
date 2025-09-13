import { Request, Response } from 'express';
import prisma from '../config/database.config';
import { rssService } from '../services/rss.service';
import { logService } from '../services/log.service';

export class FeedController {
  /**
   * Get all feed sources
   */
  async getFeedSources(req: Request, res: Response) {
    try {
      const sources = await prisma.feedSource.findMany({
        include: {
          _count: {
            select: { articles: true },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });

      res.json({
        success: true,
        data: sources,
      });
    } catch (error) {
      await logService.error('Failed to get feed sources', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get feed sources',
      });
    }
  }

  /**
   * Add new feed source
   */
  async addFeedSource(req: Request, res: Response) {
    try {
      const { name, url } = req.body;

      if (!name || !url) {
        return res.status(400).json({
          success: false,
          error: 'Name and URL are required',
        });
      }

      // Check if URL already exists
      const existing = await prisma.feedSource.findUnique({
        where: { url },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'Feed source with this URL already exists',
        });
      }

      const source = await prisma.feedSource.create({
        data: { name, url, isActive: true },
      });

      // Fetch articles immediately
      await rssService.fetchAndSaveArticles(source.id, source.url);

      res.status(201).json({
        success: true,
        data: source,
      });
    } catch (error) {
      await logService.error('Failed to add feed source', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to add feed source',
      });
    }
  }

  /**
   * Update feed source
   */
  async updateFeedSource(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, url, isActive } = req.body;

      const source = await prisma.feedSource.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(url && { url }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      res.json({
        success: true,
        data: source,
      });
    } catch (error) {
      await logService.error('Failed to update feed source', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to update feed source',
      });
    }
  }

  /**
   * Delete feed source
   */
  async deleteFeedSource(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await prisma.feedSource.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Feed source deleted successfully',
      });
    } catch (error) {
      await logService.error('Failed to delete feed source', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to delete feed source',
      });
    }
  }

  /**
   * Manually trigger feed check
   */
  async checkFeeds(req: Request, res: Response) {
    try {
      await rssService.checkAllFeeds();

      res.json({
        success: true,
        message: 'Feed check initiated',
      });
    } catch (error) {
      await logService.error('Failed to check feeds', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to check feeds',
      });
    }
  }

  /**
   * Check single feed
   */
  async checkSingleFeed(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const source = await prisma.feedSource.findUnique({
        where: { id },
      });

      if (!source) {
        return res.status(404).json({
          success: false,
          error: 'Feed source not found',
        });
      }

      const count = await rssService.fetchAndSaveArticles(source.id, source.url);

      res.json({
        success: true,
        message: `Fetched ${count} new articles`,
        data: { newArticles: count },
      });
    } catch (error) {
      await logService.error('Failed to check single feed', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to check feed',
      });
    }
  }

  /**
   * Fetch all feeds and save new articles
   */
  async fetchAllFeeds(req: Request, res: Response) {
    try {
      const sources = await prisma.feedSource.findMany({
        where: { isActive: true },
      });

      let totalNewArticles = 0;
      const results = [];

      for (const source of sources) {
        try {
          const count = await rssService.fetchAndSaveArticles(source.id, source.url);
          totalNewArticles += count;
          results.push({
            sourceId: source.id,
            sourceName: source.name,
            newArticles: count,
            status: 'success',
          });
        } catch (error) {
          results.push({
            sourceId: source.id,
            sourceName: source.name,
            newArticles: 0,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      res.json({
        success: true,
        message: `Fetched ${totalNewArticles} new articles from ${sources.length} sources`,
        data: {
          totalNewArticles,
          totalSources: sources.length,
          results,
        },
      });
    } catch (error) {
      await logService.error('Failed to fetch all feeds', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch feeds',
      });
    }
  }
}

export const feedController = new FeedController();
