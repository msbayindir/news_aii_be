import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.config';
import { logService } from './log.service';
import { GeminiSearchResult } from '../types';
import prisma from '../config/database.config';

// Grounding metadata interface'leri (resmi dokümantasyona göre)
interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

interface GroundingSupport {
  segment?: {
    startIndex: number;
    endIndex: number;
    text: string;
  };
  groundingChunkIndices?: number[];
}

interface GroundingMetadata {
  webSearchQueries?: string[];
  groundingChunks?: GroundingChunk[];
  groundingSupports?: GroundingSupport[];
  searchEntryPoint?: {
    renderedContent: string;
  };
}

interface SearchResult {
  text: string;
  sources: GroundingChunk[];
  searchQueries: string[];
  textWithCitations?: string;
}

class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
    // Resmi dokümantasyona göre desteklenen modeller
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
      const articlesText = articles.map((article: any) => {
        return `
Başlık: ${article.title}
Kaynak: ${article.source.name}
Tarih: ${article.pubDate?.toLocaleString('tr-TR')}
Kategoriler: ${article.categories.map((c: any) => c.name).join(', ')}
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
            connect: articles.map((a: any) => ({ id: a.id })),
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
   * Search web using Gemini with Google Search Grounding
   * Resmi dokümantasyondaki format kullanılıyor
   */
  async searchWeb(query: string, maxDaysOld: number = 7): Promise<SearchResult> {
    try {
      console.log('Starting web search with query:', query);

      // Daha kapsamlı ve detaylı prompt oluştur
      const enhancedPrompt = `
"${query}" konusunda çok kapsamlı, detaylı ve uzun bir araştırma raporu hazırla. Bu rapor en az 1000-1500 kelime olmalı ve aşağıdaki yapıda olmalı:

## ARAŞTIRMA KRİTERLERİ:
1. SON DAKIKA HABERLERİ: En güncel gelişmeleri öncelikle araştır ve detaylandır
2. DETAYLI ANALİZ: Sadece başlıkları değil, haberlerin tam içeriğini, detaylarını ve analizini yap
3. KAYNAK ÇEŞİTLİLİĞİ: En az 5-10 farklı haber kaynağından bilgi topla
4. BAĞLAM BİLGİSİ: Olayların arka planını, tarihçesini ve önceki gelişmeleri dahil et
5. UZUN FORM İÇERİK: Her konu başlığı altında en az 200-300 kelimelik detaylı açıklama

## KAPSAM:
- Gaziantep
- Siyasi gelişmeler ve açıklamalar (detaylı)
- Ekonomik haberler ve iş dünyası gelişmeleri
- Sosyal ve kültürel etkinlikler
- Spor haberleri (transfer, maç sonuçları, kulüp haberleri)
- Güvenlik, asayiş ve adalet haberleri
- Eğitim, sağlık ve belediye hizmetleri
- Tarım, sanayi ve ticaret haberleri
- Kaza, yangın ve acil durum haberleri

## RAPOR YAPISI:
1. **Ana Haberler** (her haber için 250-300 kelime)


## ÖNEMLİ:
- Her bilgi parçası için kaynak belirt
- Tarih ve saat bilgilerini dahil et
- Sayısal veriler varsa belirt
- Kişi isimleri ve kurumları tam olarak yaz
- Mümkün olduğunca çok detay ver
- Paragraflar arası geçişleri sağla

Arama konusu: "${query}"

Lütfen bu kriterlere göre çok detaylı, kapsamlı ve uzun bir rapor hazırla.`;

      // Resmi dokümantasyondaki format ile gelişmiş prompt
      const response = await this.model.generateContent({
        contents: [{
          parts: [{ text: enhancedPrompt }]
        }],
        tools: [{
          googleSearch: {} // google_search değil, googleSearch (camelCase)
        }],
        generationConfig: {
          maxOutputTokens: 8192, // Daha uzun response için token limiti artır
          temperature: 0.5, // Yaratıcılık için biraz temperature ekle
        }
      });

      console.log('Response received, checking structure...');

      // Response yapısını kontrol et
      if (!response) {
        throw new Error('No response received from API');
      }

      // Log'dan görülen yapıya göre: response.response.candidates[0].content.parts[0].text
      let responseText = '';
      
      if (response.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
        responseText = response.response.candidates[0].content.parts[0].text;
        console.log('✅ Text extracted successfully, length:', responseText.length);
      } else {
        console.log('❌ Failed to extract text, checking structure...');
        console.log('response.response exists:', !!response.response);
        console.log('candidates exists:', !!response.response?.candidates);
        console.log('candidates length:', response.response?.candidates?.length || 0);
        throw new Error('Could not extract text from response');
      }

      // Grounding metadata'yı al - log'dan görülen yapıya göre
      let groundingMetadata: GroundingMetadata = {};
      
      if (response.response?.candidates?.[0]?.groundingMetadata) {
        groundingMetadata = response.response.candidates[0].groundingMetadata;
        console.log('✅ Found grounding metadata with', 
          groundingMetadata.groundingChunks?.length || 0, 'chunks');
      } else {
        console.log('⚠️ No grounding metadata found');
      }

      // Sonuç objesi oluştur
      const result: SearchResult = {
        text: responseText,
        sources: groundingMetadata.groundingChunks || [],
        searchQueries: groundingMetadata.webSearchQueries || []
      };

      // Citation'ları ekle
      if (groundingMetadata.groundingSupports && groundingMetadata.groundingChunks) {
        result.textWithCitations = this.addCitations(responseText, groundingMetadata);
      } else {
        result.textWithCitations = responseText;
      }

      await logService.info('Web search completed successfully', { 
        query, 
        sourcesFound: result.sources.length,
        queriesUsed: result.searchQueries.length,
        hasGrounding: !!groundingMetadata.groundingChunks?.length
      });

      return result;

    } catch (error) {
      console.error('Search failed with error:', error);
      await logService.error('Failed to perform web search', { 
        error: error,
        query,
        maxDaysOld,
        stack: error
      });
      throw error;
    }
  }

  /**
   * Add citations to text based on grounding metadata
   * Resmi dokümantasyondaki JavaScript fonksiyonun aynısı
   */
  private addCitations(responseText: string, groundingMetadata: GroundingMetadata): string {
    let text = responseText;
    const supports = groundingMetadata.groundingSupports;
    const chunks = groundingMetadata.groundingChunks;

    if (!supports || !chunks) return text;

    // Sort supports by end_index in descending order to avoid shifting issues when inserting.
    const sortedSupports = [...supports].sort(
      (a, b) => (b.segment?.endIndex ?? 0) - (a.segment?.endIndex ?? 0),
    );

    for (const support of sortedSupports) {
      const endIndex = support.segment?.endIndex;
      if (endIndex === undefined || !support.groundingChunkIndices?.length) {
        continue;
      }

      const citationLinks = support.groundingChunkIndices
        .map(i => {
          const uri = chunks[i]?.web?.uri;
          if (uri) {
            return `[${i + 1}](${uri})`;
          }
          return null;
        })
        .filter(Boolean);

      if (citationLinks.length > 0) {
        const citationString = citationLinks.join(", ");
        text = text.slice(0, endIndex) + citationString + text.slice(endIndex);
      }
    }

    return text;
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

  /**
   * Search web and return formatted news results
   */
  async searchNews(query: string, maxResults: number = 5): Promise<GeminiSearchResult[]> {
    try {
      const searchResult = await this.searchWeb(`${query} son haberler güncel`);
      
      // Eğer sources varsa, onları format et
      const newsResults: any[] = searchResult.sources
        .slice(0, maxResults)
        .map((source, index) => ({
          title: source.web?.title || `Haber ${index + 1}`,
          url: source.web?.uri || '',
          snippet: searchResult.text.substring(0, 200) + '...',
          source: source.web?.title || 'Bilinmeyen Kaynak',
          publishedDate: new Date() // Gerçek tarih API'den gelmiyor, placeholder
        }));

      return newsResults;
    } catch (error) {
      await logService.error('Failed to search news', { error, query });
      throw error;
    }
  }

  /**
   * Quick debug test to see exact response structure
   */
  async debugResponseStructure(query: string): Promise<any> {
    try {
      const response = await this.model.generateContent({
        contents: [{ parts: [{ text: query }] }],
        tools: [{ googleSearch: {} }]
      });

      console.log('=== COMPLETE RESPONSE ANALYSIS ===');
      console.log('typeof response:', typeof response);
      console.log('response keys:', Object.keys(response || {}));
      console.log('response.text exists:', 'text' in response);
      console.log('response.text type:', typeof response.text);
      console.log('response.text value:', response.text);
      console.log('response.response exists:', 'response' in response);
      
      if (response.response) {
        console.log('response.response keys:', Object.keys(response.response));
        console.log('response.response.candidates exists:', 'candidates' in response.response);
        
        if (response.response.candidates && response.response.candidates[0]) {
          const candidate = response.response.candidates[0];
          console.log('candidate keys:', Object.keys(candidate));
          console.log('candidate.content exists:', 'content' in candidate);
          
          if (candidate.content && candidate.content.parts && candidate.content.parts[0]) {
            console.log('candidate.content.parts[0].text:', candidate.content.parts[0].text?.substring(0, 100));
          }
        }
      }

      return response;
    } catch (error) {
      console.error('Debug test failed:', error);
      throw error;
    }
  }
  async testSimpleSearch(query: string): Promise<string> {
    try {
      console.log('Testing simple search without grounding...');
      
      const response = await this.model.generateContent({
        contents: [{
          parts: [{ text: `"${query}" hakkında kısa bilgi ver` }]
        }]
      });

      console.log('Simple search response structure:', {
        hasResponse: !!response.response,
        responseKeys: Object.keys(response.response || {}),
        hasCandidates: !!response.response?.candidates,
        candidatesLength: response.response?.candidates?.length || 0
      });

      let text = '';
      
      // Log'dan gelen yapıya göre: response.response.candidates[0].content.parts[0].text
      if (response.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
        text = response.response.candidates[0].content.parts[0].text;
        console.log('✅ Simple search successful');
      } else {
        console.log('❌ Simple search failed to extract text');
      }

      return text;
      
    } catch (error) {
      console.error('Simple search failed:', error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();