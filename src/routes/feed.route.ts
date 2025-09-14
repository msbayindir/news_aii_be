import { Router } from 'express';
import { feedController } from '../controllers/feed.controller';

const router: Router = Router();

// Get all feed sources
router.get('/', feedController.getFeedSources);

// Add new feed source
router.post('/', feedController.addFeedSource);

// Manually trigger all feeds check
router.post('/check', feedController.checkFeeds);

// Update feed source
router.put('/:id', feedController.updateFeedSource);

// Delete feed source
router.delete('/:id', feedController.deleteFeedSource);

// Check single feed
router.post('/:id/check', feedController.checkSingleFeed);

// Fetch all feeds and save new articles
router.post('/fetch-all', feedController.fetchAllFeeds);

// Reload feeds from environment config
router.post('/reload', feedController.reloadFeeds);

export default router;
