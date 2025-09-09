export interface RSSFeedItem {
  title: string;
  link: string;
  pubDate?: string;
  creator?: string;
  content?: string;
  contentSnippet?: string;
  guid?: string;
  categories?: string[];
  isoDate?: string;
  enclosure?: {
    url: string;
    type?: string;
  };
}

export interface ParsedArticle {
  title: string;
  description?: string;
  content?: string;
  link: string;
  imageUrl?: string;
  author?: string;
  pubDate?: Date;
  guid?: string;
  categories?: string[];
}

export interface GeminiSearchResult {
  title: string;
  snippet: string;
  link: string;
  displayLink: string;
  imageUrl?: string;
  publishedDate?: Date;
}

export interface ArticleSummaryRequest {
  startDate: Date;
  endDate: Date;
  prompt?: string;
}

export interface WebSearchRequest {
  query: string;
  maxDaysOld?: number;
}
