import prisma from '../config/database.config';
import { geminiService } from './gemini.service';
import { logService } from './log.service';


class AnalyticsService {
  /**
   * Analyze word frequency from articles using Gemini AI
   */
  async analyzeWordFrequency(limit: number = 50): Promise<void> {
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

      // Prepare article content for Gemini
      const articleTexts = articles
        .map(a => `${a.title}\n${a.content || ''}`)
        .join('\n\n---\n\n');

      // Create prompt for Gemini to analyze word frequency
      const prompt = `
        Aşağıdaki Türkçe haber metinlerini analiz ederek en önemli ve anlamlı kelimelerin frekans analizini yap.

        KURALLAR:
        1. Sadece Türkçe kelimeler
        2. En az 3 karakter uzunluğunda
        3. Anlamlı kelimeler (isim, sıfat, fiil kökleri)
        4. Stop words hariç (ve, ile, bu, bir, için, olan, vs.)
        5. Teknik terimler hariç (HTML, CSS, JavaScript, vs.)
        6. Kişi isimleri ve yer isimleri dahil edilebilir
        7. Haber içeriğini yansıtan önemli kelimeler

        ÇIKTI FORMATI:
        Sadece JSON formatında döndür, başka hiçbir metin ekleme:
        {
          "words": [
            {"word": "kelime1", "count": 15},
            {"word": "kelime2", "count": 12},
            ...
          ]
        }

        En fazla 30 kelime döndür, frekansa göre sıralı.

        HABER METİNLERİ:
        ${articleTexts}
      `;

      // Get analysis from Gemini
      const geminiResponse = await geminiService.generateContent(prompt);
      
      // Parse Gemini response
      let wordAnalysis;
      try {
        // Clean the response to extract JSON
        const cleanResponse = geminiResponse
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        
        wordAnalysis = JSON.parse(cleanResponse);
      } catch (parseError) {
        await logService.error('Failed to parse Gemini word analysis response', { 
          error: parseError, 
          response: geminiResponse 
        });
        throw new Error('Invalid response format from Gemini');
      }

      if (!wordAnalysis.words || !Array.isArray(wordAnalysis.words)) {
        throw new Error('Invalid word analysis format from Gemini');
      }

      // Validate and clean the words
      const validWords = wordAnalysis.words
        .filter((item: any) => 
          item.word && 
          typeof item.word === 'string' && 
          item.count && 
          typeof item.count === 'number' &&
          item.word.length >= 3
        )
        .slice(0, 30); // Limit to 30 words

      // Save to database
      await prisma.wordFrequency.create({
        data: {
          words: validWords as any,
          articleIds: articles.map(a => a.id) as any,
          articleCount: articles.length,
        },
      });

      await logService.info(`Gemini word frequency analysis completed for ${articles.length} articles, found ${validWords.length} words`);
    } catch (error) {
      await logService.error('Gemini word frequency analysis failed', { error });
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
  async generateReport(type: 'daily' | 'weekly' | 'monthly', date?: Date, userId?: string): Promise<void> {
    try {
      const targetDate = date || new Date();
      let startDate: Date;
      let endDate: Date;
      let limit: number;
      let orderBy: 'asc' | 'desc';

      // Calculate date range and limits based on requirements
      switch (type) {
        case 'daily':
          // Günlük: İlk 50 haberi al (en yeni haberler)
          limit = 50;
          orderBy = 'desc';
          startDate = new Date(targetDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(targetDate);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'weekly':
          // Haftalık: 7 gün öncesinden bugüne kadar, en eski haberden yeniye doğru 200 tane
          limit = 200;
          orderBy = 'asc';
          startDate = new Date(targetDate);
          startDate.setDate(targetDate.getDate() - 7);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(targetDate);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'monthly':
          // Aylık: 30 gün öncesinden bugüne kadar, en eski haberden yeniye doğru 400 tane
          limit = 400;
          orderBy = 'asc';
          startDate = new Date(targetDate);
          startDate.setDate(targetDate.getDate() - 30);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(targetDate);
          endDate.setHours(23, 59, 59, 999);
          break;
      }

      // Get articles for the specified period that contain "gaziantep"
      const articles = await prisma.article.findMany({
        where: {
          pubDate: {
            gte: startDate,
            lte: endDate,
          },
          OR: [
            {
              title: {
                contains: "gaziantep",
              },
            },
            {
              title: {
                contains: "Gaziantep",
              },
            },
            {
              title: {
                contains: "GAZIANTEP",
              },
            },
            {
              content: {
                contains: "gaziantep",
              },
            },
            {
              content: {
                contains: "Gaziantep",
              },
            },
            {
              content: {
                contains: "GAZIANTEP",
              },
            },
          ],
        },
        take: limit,
        orderBy: { pubDate: orderBy },
        include: {
          source: true,
        },
      });

      if (articles.length === 0) {
        await logService.info(`No articles found for ${type} report`);
        return;
      }

      // Prepare all article content for AI
      const articleContent = articles
        .map(a => `Başlık: ${a.title}\nİçerik: ${a.content || ''}\nKaynak: ${a.source.name}\nTarih: ${a.pubDate ? a.pubDate.toLocaleDateString('tr-TR') : 'Tarih belirtilmemiş'}\n`)
        .join('\n---\n\n');

      // Create comprehensive prompt for AI report generation
      const prompt = `
        Aşağıda ${type === 'daily' ? 'günlük' : type === 'weekly' ? 'haftalık' : 'aylık'} haber raporu için ${articles.length} adet haber metni bulunmaktadır.
        
        Bu haberlerden kapsamlı bir ${type === 'daily' ? 'günlük' : type === 'weekly' ? 'haftalık' : 'aylık'} rapor hazırla 5000 karakterlik.
        
        Rapor şu bölümleri içermelidir:
        1. **Genel Özet**: Dönemin en önemli gelişmelerinin 2-3 paragraflık özeti
        2. **Öne Çıkan Konular**: En çok işlenen haber konuları ve trendler analizini kapsamlı ve uzun şekilde yap.
        3. **Pozitif/Negatif Gelişmeler**: Olumlu ve olumsuz haberlerin analizi
        4. **Trend Analizi**: Dönem boyunca görülen eğilimler ve değişimler
        5. **Önemli Olaylar**: Dönemin en dikkat çeken olayları
        6. Kaç ten olumlu kaç tane olumsuz haber olduğunu analiz et sayısal olarak sonuç döndür. Bu çıktıyı json olarak {
          "positive": 10,
          "negative": 5,
          "nötr": 7
        } olarak dön.
        
        Raporu Türkçe olarak, profesyonel ve anlaşılır bir dille hazırla.
        
        HABER METİNLERİ:
        ${articleContent}
      `;

      // Generate comprehensive AI report
      const aiReport = await geminiService.generateContent(prompt);

      // Save simplified report to database
      await prisma.report.create({
        data: {
          type,
          startDate,
          endDate,
          articleCount: articles.length,
          articleIds: articles.map(a => a.id) as any,
          summary: aiReport,
          analysis: {
            totalArticles: articles.length,
            dateRange: {
              start: startDate.toISOString(),
              end: endDate.toISOString()
            }
          } as any,
          userId: userId || 'system', // Default to system if no user provided
        },
      });

      await logService.info(`${type} report generated successfully for ${articles.length} articles`);
    } catch (error) {
      await logService.error(`Failed to generate ${type} report`, { error });
      throw error;
    }
  }

  /**
   * Get latest report by type
   */
  async getLatestReport(type: 'daily' | 'weekly' | 'monthly', userId?: string) {
    const report = await prisma.report.findFirst({
      where: { 
        type,
        ...(userId && { userId })
      },
      orderBy: { createdAt: 'desc' },
    });

    return report;
  }

  /**
   * Get report history
   */
  async getReportHistory(type: 'daily' | 'weekly' | 'monthly', limit: number = 10, userId?: string) {
    const reports = await prisma.report.findMany({
      where: { 
        type,
        ...(userId && { userId })
      },
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
  async getReportById(id: string, userId?: string) {
    const report = await prisma.report.findUnique({
      where: { 
        id,
        ...(userId && { userId })
      },
    });

    return report;
  }
}

export const analyticsService = new AnalyticsService();
