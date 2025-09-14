import prisma from '../config/database.config';
import { geminiService } from './gemini.service';
import { logService } from './log.service';

interface WordCount {
  word: string;
  count: number;
}

class AnalyticsService {
  /**
   * Analyze word frequency from articles
   */
  async analyzeWordFrequency(limit: number = 10): Promise<void> {
    try {
      // Get latest articles
      const articles = await prisma.article.findMany({
        take: limit,
        orderBy: { pubDate: 'desc' },
        select: {
          id: true,
          title: true,
          content: true,
        },
      });

      if (articles.length === 0) {
        await logService.info('No articles found for word frequency analysis');
        return;
      }

      // Combine all text
      const allText = articles
        .map(a => `${a.title} ${a.content || ''}`)
        .join(' ')
        .toLowerCase();

      // Turkish stop words
      const stopWords = new Set([
        've', 'ile', 'de', 'da', 'bu', 'bir', 'için', 'olan', 'olarak',
        'daha', 'çok', 'en', 'gibi', 'kadar', 'sonra', 'önce', 'her',
        'bazı', 'tüm', 'ki', 'ne', 'ya', 'veya', 'ama', 'ancak', 'fakat',
        'yani', 'eğer', 'değil', 'mi', 'mu', 'mı', 'mü', 'var', 'yok',
        'den', 'dan', 'ten', 'tan', 'e', 'a', 'ye', 'ya', 'i', 'ı', 'u',
        'ü', 'o', 'ö', 'nin', 'nın', 'nun', 'nün', 'in', 'ın', 'un', 'ün'
      ]);

      // Count words
      const wordCounts = new Map<string, number>();
      const words = allText.match(/[a-züğıöşç]+/gi) || [];

      for (const word of words) {
        if (word.length > 2 && !stopWords.has(word)) {
          wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
        }
      }

      // Sort by frequency and take top 50
      const sortedWords: WordCount[] = Array.from(wordCounts.entries())
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 50);
  
      // Save to database
      await prisma.wordFrequency.create({
        data: {
          words: sortedWords as any,
          articleIds: articles.map(a => a.id) as any,
          articleCount: articles.length,
        },
      });

      await logService.info(`Word frequency analysis completed for ${articles.length} articles`);
    } catch (error) {
      await logService.error('Word frequency analysis failed', { error });
      throw error;
    }
  }

  /**
   * Get latest word frequency data
   */
  async getLatestWordFrequency() {
    const latest = await prisma.wordFrequency.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    return latest;
  }

  /**
   * Generate AI report for a specific period
   */
  async generateReport(type: 'daily' | 'weekly' | 'monthly', date?: Date): Promise<void> {
    try {
      const targetDate = date || new Date();
      let startDate: Date;
      let endDate: Date;
      let limit: number;

      // Calculate date range and limits
      switch (type) {
        case 'daily':
          startDate = new Date(targetDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(targetDate);
          endDate.setHours(23, 59, 59, 999);
          limit = 100; // Max 100 articles for daily
          break;
        case 'weekly':
          startDate = new Date(targetDate);
          startDate.setDate(targetDate.getDate() - targetDate.getDay()); // Start of week
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 6); // End of week
          endDate.setHours(23, 59, 59, 999);
          limit = 100; // Max 100 articles for weekly
          break;
        case 'monthly':
          startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
          endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
          endDate.setHours(23, 59, 59, 999);
          limit = 200; // Max 200 articles for monthly
          break;
      }

      // Get articles for the period
      const articles = await prisma.article.findMany({
        where: {
          pubDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        take: limit,
        orderBy: { pubDate: 'desc' },
        select: {
          id: true,
          title: true,
          content: true,
          sourceId: true,
          source: {
            select: {
              name: true,
            },
          },
        },
      });

      if (articles.length === 0) {
        await logService.info(`No articles found for ${type} report`);
        return;
      }

      // Prepare content for AI analysis
      const articleSummary = articles
        .slice(0, 20) // Use first 20 articles for AI summary
        .map(a => `${a.title}: ${(a.content || '').substring(0, 200)}`)
        .join('\n');

      // Generate AI summary
      const prompt = `
        Aşağıdaki haber başlıkları ve özetleri ${type === 'daily' ? 'bugünün' : type === 'weekly' ? 'bu haftanın' : 'bu ayın'} haberlerinden alınmıştır.
        
        ${articleSummary}
        
        Lütfen bu haberlere dayanarak:
        1. Genel bir özet hazırla (2-3 paragraf)
        2. Öne çıkan konuları listele
        3. Pozitif ve negatif gelişmeleri belirt
        4. Trend analizi yap
        
        Yanıtını Türkçe olarak ver.
      `;

      const aiSummary = await geminiService.generateContent(prompt);

      // Category distribution by source name (since we don't have category field)
      const categoryCount = articles.reduce((acc, article) => {
        const sourceName = article.source.name;
        acc[sourceName] = (acc[sourceName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Source distribution
      const sourceCount = articles.reduce((acc, article) => {
        const sourceName = article.source.name;
        acc[sourceName] = (acc[sourceName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Generate word cloud for this period
      const allText = articles
        .map(a => `${a.title} ${a.content || ''}`)
        .join(' ')
        .toLowerCase();

      const stopWords = new Set([
        've', 'ile', 'de', 'da', 'bu', 'bir', 'için', 'olan', 'olarak',
        'daha', 'çok', 'en', 'gibi', 'kadar', 'sonra', 'önce', 'her',
        'bazı', 'tüm', 'ki', 'ne', 'ya', 'veya', 'ama', 'ancak', 'fakat'
      ]);

      const wordCounts = new Map<string, number>();
      const words = allText.match(/[a-züğıöşç]+/gi) || [];

      for (const word of words) {
        if (word.length > 2 && !stopWords.has(word)) {
          wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
        }
      }

      const topWords = Array.from(wordCounts.entries())
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 30);

      // Save report to database
      await prisma.report.create({
        data: {
          type,
          startDate,
          endDate,
          articleCount: articles.length,
          articleIds: articles.map(a => a.id) as any,
          summary: aiSummary,
          analysis: {
            categoryDistribution: categoryCount,
            sourceDistribution: sourceCount,
            totalArticles: articles.length,
          } as any,
          wordCloud: topWords as any,
        },
      });

      await logService.info(`${type} report generated for ${articles.length} articles`);
    } catch (error) {
      await logService.error(`Failed to generate ${type} report`, { error });
      throw error;
    }
  }

  /**
   * Get latest report by type
   */
  async getLatestReport(type: 'daily' | 'weekly' | 'monthly') {
    const report = await prisma.report.findFirst({
      where: { type },
      orderBy: { createdAt: 'desc' },
    });

    return report;
  }

  /**
   * Get report history
   */
  async getReportHistory(type: 'daily' | 'weekly' | 'monthly', limit: number = 10) {
    const reports = await prisma.report.findMany({
      where: { type },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        type: true,
        startDate: true,
        endDate: true,
        articleCount: true,
        createdAt: true,
      },
    });

    return reports;
  }

  /**
   * Get specific report by ID
   */
  async getReportById(id: string) {
    const report = await prisma.report.findUnique({
      where: { id },
    });

    return report;
  }
}

export const analyticsService = new AnalyticsService();
