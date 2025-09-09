import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  rssFeeds: process.env.RSS_FEEDS?.split(',').map(url => url.trim()) || [],
  feedCheckInterval: parseInt(process.env.FEED_CHECK_INTERVAL || '15'),
};

export const validateEnv = () => {
  if (!config.geminiApiKey) {
    console.warn('⚠️  GEMINI_API_KEY is not set in .env file');
  }
  
  if (config.rssFeeds.length === 0) {
    console.warn('⚠️  No RSS feeds configured in .env file');
  }
};
