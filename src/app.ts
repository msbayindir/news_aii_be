import express from 'express';
import cors from 'cors';
import { config, validateEnv } from './config/env.config';
import { requestLogger } from './middlewares/logger.middleware';
import { errorHandler } from './middlewares/error.middleware';
import articleRoutes from './routes/article.route';
import feedRoutes from './routes/feed.route';
import geminiRoutes from './routes/gemini.route';
import analyticsRoutes from './routes/analytics.route';
import authRoutes from './routes/auth.route';
import { authenticateToken } from './middlewares/auth.middleware';
import { cronService } from './services/cron.service';
import { rssService } from './services/rss.service';
import { logService } from './services/log.service';
import prisma from './config/database.config';

const app = express();

// Validate environment variables
validateEnv();

// Middlewares
app.use(cors({
  origin: ['https://news-ai-fe.vercel.app',"http://localhost:3000","http://localhost:3001","https://www.yerelhaberbulteni.com","https://sehitkamil.yerelhaberbulteni.com","https://gaziantep.yerelhaberbulteni.com","https://yerelhaberbulteni.com"], // Allow all origins for testing
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'News AI Backend is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/articles', authenticateToken, articleRoutes);
app.use('/api/feeds', authenticateToken, feedRoutes);
app.use('/api/gemini', authenticateToken, geminiRoutes);
app.use('/api/analytics', authenticateToken, analyticsRoutes);

// Error handler (must be last)
app.use(errorHandler);

// Initialize application
async function initialize() {
  try {
    // Test database connection
    await prisma.$connect();
    await logService.info('Database connected successfully');

    // Initialize feed sources from config
    if (config.rssFeeds.length > 0) {
      await rssService.initializeFeedSources(config.rssFeeds);
      await logService.info('Feed sources initialized');
      
      // Perform initial feed check
      await rssService.checkAllFeeds();
    }

    // Start cron jobs
    cronService.initialize();

    // Start server
    const PORT = config.port;
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      console.log(`📰 News AI Backend started successfully`);
      console.log(`🔄 RSS feeds will be checked every ${config.feedCheckInterval} minutes`);
    });
  } catch (error) {
    console.error('Failed to initialize application:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n📛 Shutting down gracefully...');
  cronService.stopAll();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n📛 Shutting down gracefully...');
  cronService.stopAll();
  await prisma.$disconnect();
  process.exit(0);
});

// Start the application
initialize();
