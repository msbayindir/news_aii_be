import { Router, } from 'express';
import { geminiController } from '../controllers/gemini.controller';

const router: Router = Router();

// Summarize articles between dates
router.post('/summarize', geminiController.summarizeArticles);

// Search web using Gemini
router.post('/search', geminiController.searchWeb);

// Get past summaries
router.get('/summaries', geminiController.getSummaries);

// Get search history
router.get('/search-history', geminiController.getSearchHistory);

export default router;
