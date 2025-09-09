import { Router } from 'express';
import { articleController } from '../controllers/article.controller';

const router: Router = Router();

// Get all articles with filters
router.get('/', articleController.getArticles);

// Get latest articles
router.get('/latest', articleController.getLatestArticles);

// Get trending articles
router.get('/trending', articleController.getTrendingArticles);

// Search articles
router.get('/search', articleController.searchArticles);

// Get statistics
router.get('/statistics', articleController.getStatistics);

// Get single article
router.get('/:id', articleController.getArticle);

export default router;
