import Parser from 'rss-parser';
import prisma from '../config/database.config';
import { RSSFeedItem, ParsedArticle } from '../types';
import { logService } from './log.service';

class RSSService {
  private parser: Parser;

  constructor() {
    this.parser = new Parser({
      customFields: {
        item: [
          ['media:content', 'mediaContent', { keepArray: true }],
          ['media:thumbnail', 'mediaThumbnail'],
          ['enclosure', 'enclosure'],
          ['content:encoded', 'contentEncoded'],
          ['description', 'description'],
        ],
      },
    });
  }

  /**
   * Parse RSS feed from URL
   */
  async parseFeed(url: string): Promise<RSSFeedItem[]> {
    try {
      const feed = await this.parser.parseURL(url);
      return feed.items as RSSFeedItem[];
    } catch (error) {
      await logService.error(`Failed to parse RSS feed: ${url}`, { error });
      throw error;
    }
  }

  /**
   * Extract image URL from RSS item
   */
  private extractImageUrl(item: any): string | undefined {
    // Try different possible image sources
    if (item.enclosure?.url) return item.enclosure.url;
    if (item.mediaThumbnail?.url) return item.mediaThumbnail.url;
    if (item.mediaContent?.[0]?.url) return item.mediaContent[0].url;
    
    // Try to extract from content
    const imgRegex = /<img[^>]+src="([^">]+)"/;
    const match = item.content?.match(imgRegex) || item['content:encoded']?.match(imgRegex);
    if (match) return match[1];
    
    return undefined;
  }

  /**
   * Strip HTML tags from content
   */
  private stripHtml(html: string): string {
    if (!html) return '';
    // Remove HTML tags but keep the text content
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Convert RSS item to ParsedArticle
   */
  private parseArticle(item: any): ParsedArticle {
    // Get full content from content:encoded or fallback to content/description
    const fullContent = item.contentEncoded || item['content:encoded'] || item.content || item.description || '';
    
    // Get description - prefer plain description, otherwise strip HTML from content
    const description = item.description 
      ? this.stripHtml(item.description) 
      : this.stripHtml(fullContent).substring(0, 500);

    return {
      title: item.title || '',
      description: description,
      content: fullContent, // Store full HTML content
      link: item.link || '',
      imageUrl: this.extractImageUrl(item),
      author: item.creator || item['dc:creator'],
      pubDate: item.isoDate ? new Date(item.isoDate) : (item.pubDate ? new Date(item.pubDate) : undefined),
      guid: item.guid || item.link,
      categories: item.categories || (item.category ? [item.category] : []),
    };
  }

  /**
   * Fetch and save articles from a feed source
   */
  async fetchAndSaveArticles(sourceId: string, feedUrl: string): Promise<number> {
    try {
      const items = await this.parseFeed(feedUrl);
      let savedCount = 0;

      for (const item of items) {
        try {
          const article = this.parseArticle(item);
          
          // Check if article already exists
          const existingArticle = await prisma.article.findUnique({
            where: { link: article.link },
          });

          if (!existingArticle) {
            // Save article with categories
            await prisma.article.create({
              data: {
                title: article.title,
                description: article.description,
                content: article.content,
                link: article.link,
                imageUrl: article.imageUrl,
                author: article.author,
                pubDate: article.pubDate,
                guid: article.guid,
                sourceId,
                categories: article.categories ? {
                  connectOrCreate: article.categories.map(cat => ({
                    where: { name: cat },
                    create: { name: cat },
                  })),
                } : undefined,
              },
            });
            savedCount++;
          }
        } catch (error) {
          await logService.error(`Failed to save article: ${item.link}`, { error });
        }
      }

      // Update last check time
      await prisma.feedSource.update({
        where: { id: sourceId },
        data: { lastCheck: new Date() },
      });

      await logService.info(`Fetched and saved ${savedCount} new articles from ${feedUrl}`);
      return savedCount;
    } catch (error) {
      await logService.error(`Failed to fetch articles from ${feedUrl}`, { error });
      throw error;
    }
  }

  /**
   * Check all active feeds for new articles
   */
  async checkAllFeeds(): Promise<void> {
    const sources = await prisma.feedSource.findMany({
      where: { isActive: true },
    });

    await logService.info(`Checking ${sources.length} RSS feeds for new articles`);

    for (const source of sources) {
      try {
        await this.fetchAndSaveArticles(source.id, source.url);
      } catch (error) {
        await logService.error(`Failed to check feed: ${source.name}`, { error });
      }
    }
  }

  /**
   * Initialize feed sources from config
   */
  async initializeFeedSources(feedUrls: string[]): Promise<void> {
    for (const url of feedUrls) {
      try {
        const existingSource = await prisma.feedSource.findUnique({
          where: { url },
        });

        if (!existingSource) {
          // Extract domain name for source name
          const urlObj = new URL(url);
          const name = urlObj.hostname.replace('www.', '');

          await prisma.feedSource.create({
            data: {
              name,
              url,
              isActive: true,
            },
          });

          await logService.info(`Added new feed source: ${name}`);
        }
      } catch (error) {
        await logService.error(`Failed to initialize feed source: ${url}`, { error });
      }
    }
  }
}

export const rssService = new RSSService();
