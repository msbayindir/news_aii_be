import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.config';
import { logService } from './log.service';
import { GeminiSearchResult } from '../types';
import prisma from '../config/database.config';

class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  /**
   * Summarize articles between dates
   */
  async summarizeArticles(startDate: Date, endDate: Date, customPrompt?: string): Promise<string> {
    try {
      // Fetch articles in date range
      const articles = await prisma.article.findMany({
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

      if (articles.length === 0) {
        return 'Belirtilen tarih aralığında haber bulunamadı.';
      }

      // Prepare articles text for summarization
      const articlesText = articles.map(article => {
        return `
Başlık: ${article.title}
Kaynak: ${article.source.name}
Tarih: ${article.pubDate?.toLocaleString('tr-TR')}
Kategoriler: ${article.categories.map(c => c.name).join(', ')}
İçerik: ${article.description || article.content || 'İçerik yok'}
---`;
      }).join('\n');

      const prompt = customPrompt || 
        `Aşağıdaki haberleri Türkçe olarak özetle. Ana temaları, önemli olayları ve trendleri vurgula. 
        Özet net, anlaşılır ve bilgilendirici olmalı:`;

      const fullPrompt = `${prompt}\n\n${articlesText}`;

      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      const summary = response.text();

      // Save summary to database
      await prisma.summary.create({
        data: {
          content: summary,
          startDate,
          endDate,
          prompt: customPrompt,
          articles: {
            connect: articles.map(a => ({ id: a.id })),
          },
        },
      });

      await logService.info(`Generated summary for ${articles.length} articles`);
      return summary;
    } catch (error) {
      await logService.error('Failed to generate summary', { error });
      throw error;
    }
  }

  /**
   * Search web using Gemini with grounding
   */
  async searchWeb(query: string, maxDaysOld: number = 2): Promise<GeminiSearchResult[]> {
    try {
      // Calculate date filter
      const dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - maxDaysOld);

      const prompt = `
Web'de arama yap: "${query}"
Sadece son ${maxDaysOld} gün içindeki Türkçe haber ve içerikleri getir Ayrıca sadece gaziantep ile alakalı olan haberleri getireceksin.
Her sonuç için şu bilgileri JSON formatında ver:
- title: Başlık
- snippet: Kısa özet (max 200 karakter)
- link: URL
- displayLink: Site adı
- imageUrl: Varsa resim URL'i
- publishedDate: Yayın tarihi (ISO format)

Sonuçları JSON array olarak döndür. Sadece JSON döndür, başka açıklama ekleme.
`;

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_NONE',
          },
        ],
      });

      const response = await result.response;
      const text = response.text();

      // Parse JSON response
      let searchResults: GeminiSearchResult[] = [];
      try {
        // Extract JSON from response
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          searchResults = JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        await logService.error('Failed to parse Gemini search results', { parseError, text });
        return [];
      }

      // Save search history
      await prisma.searchHistory.create({
        data: {
          query,
          results: JSON.stringify(searchResults),
          resultCount: searchResults.length,
        },
      });

      await logService.info(`Web search completed: ${query} - ${searchResults.length} results`);
      return searchResults;
    } catch (error) {
      await logService.error('Failed to perform web search', { error });
      throw error;
    }
  }

  /**
   * Generate content with custom prompt
   */
  async generateContent(prompt: string): Promise<string> {
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      await logService.error('Failed to generate content', { error });
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
