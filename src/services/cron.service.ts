import * as cron from 'node-cron';
import { config } from '../config/env.config';
import { rssService } from './rss.service';
import { logService } from './log.service';
import prisma from '../config/database.config';

class CronService {
  private tasks: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Start RSS feed check job
   */
  startFeedCheckJob(): void {
    const interval = config.feedCheckInterval;
    const cronExpression = `*/${interval} * * * *`; // Every N minutes

    const task = cron.schedule(cronExpression, async () => {
      await logService.info('Starting scheduled RSS feed check');
      try {
        await rssService.checkAllFeeds();
      } catch (error) {
        await logService.error('RSS feed check failed', { error });
      }
    });

    task.start();
    this.tasks.set('feed-check', task);
    
    logService.info(`RSS feed check job started (every ${interval} minutes)`);
  }

  /**
   * Start daily cleanup job
   */
  startDailyCleanupJob(): void {
    // Run at 3 AM every day
    const task = cron.schedule('0 3 * * *', async () => {
      await logService.info('Starting daily cleanup');
      try {
        // Clean old logs (older than 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { count } = await prisma.systemLog.deleteMany({
          where: {
            createdAt: {
              lt: thirtyDaysAgo,
            },
          },
        });

        await logService.info(`Cleaned up ${count} old log entries`);
      } catch (error) {
        await logService.error('Daily cleanup failed', { error });
      }
    });

    task.start();
    this.tasks.set('daily-cleanup', task);
    
    logService.info('Daily cleanup job started');
  }

  /**
   * Stop all cron jobs
   */
  stopAll(): void {
    this.tasks.forEach((task, name) => {
      task.stop();
      logService.info(`Stopped cron job: ${name}`);
    });
    this.tasks.clear();
  }

  /**
   * Initialize all cron jobs
   */
  initialize(): void {
    this.startFeedCheckJob();
    this.startDailyCleanupJob();
    logService.info('All cron jobs initialized');
  }
}

export const cronService = new CronService();
