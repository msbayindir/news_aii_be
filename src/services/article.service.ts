import prisma from '../config/database.config';

class ArticleService {
  /**
   * Get articles with pagination and filters
   */
  async getArticles(options: {
    page?: number;
    limit?: number;
    sourceId?: string;
    categoryId?: string;
    categoryNames?: string[];
    startDate?: Date;
    endDate?: Date;
    search?: string;
  } = {}) {
    const {
      page = 1,
      limit = 20,
      sourceId,
      categoryId,
      categoryNames,
      startDate,
      endDate,
      search,
    } = options;

    const skip = (page - 1) * limit;

    const where: any = {};

    if (sourceId) where.sourceId = sourceId;
    if (categoryId) {
      where.categories = {
        some: { id: categoryId },
      };
    }
    if (categoryNames && categoryNames.length > 0) {
      where.categories = {
        some: {
          name: {
            in: categoryNames,
          },
        },
      };
    }
    if (startDate || endDate) {
      where.pubDate = {};
      if (startDate) where.pubDate.gte = startDate;
      if (endDate) where.pubDate.lte = endDate;
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { content: { contains: search } },
      ];
    }

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        skip,
        take: limit,
        include: {
          source: true,
          categories: true,
        },
        orderBy: {
          pubDate: 'desc',
        },
      }),
      prisma.article.count({ where }),
    ]);

    return {
      articles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single article by ID
   */
  async getArticleById(id: string) {
    return prisma.article.findUnique({
      where: { id },
      include: {
        source: true,
        categories: true,
        summaries: true,
      },
    });
  }

  /**
   * Get articles by date range
   */
  async getArticlesByDateRange(startDate: Date, endDate: Date) {
    return prisma.article.findMany({
      where: {
        pubDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        source: true,
        categories: true,
      },
      orderBy: {
        pubDate: 'desc',
      },
    });
  }

  /**
   * Get latest articles
   */
  async getLatestArticles(limit: number = 10) {
    return prisma.article.findMany({
      take: limit,
      include: {
        source: true,
        categories: true,
      },
      orderBy: {
        pubDate: 'desc',
      },
    });
  }

  /**
   * Get trending articles (most viewed in last 24 hours)
   */
  async getTrendingArticles(limit: number = 10) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    return prisma.article.findMany({
      where: {
        createdAt: {
          gte: yesterday,
        },
      },
      take: limit,
      include: {
        source: true,
        categories: true,
      },
      orderBy: {
        pubDate: 'desc',
      },
    });
  }

  /**
   * Search articles
   */
  async searchArticles(query: string, limit: number = 20) {
    return prisma.article.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { description: { contains: query } },
          { content: { contains: query } },
        ],
      },
      take: limit,
      include: {
        source: true,
        categories: true,
      },
      orderBy: {
        pubDate: 'desc',
      },
    });
  }

  /**
   * Get article statistics
   */
  async getStatistics() {
    const [totalArticles, totalSources, totalCategories, last24h, last7days] = await Promise.all([
      prisma.article.count(),
      prisma.feedSource.count(),
      prisma.category.count(),
      prisma.article.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.article.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      totalArticles,
      totalSources,
      totalCategories,
      articlesLast24h: last24h,
      articlesLast7days: last7days,
    };
  }
}

export const articleService = new ArticleService();
