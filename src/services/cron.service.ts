import * as cron from 'node-cron';
import { config } from '../config/env.config';
import { rssService } from './rss.service';
import { analyticsService } from './analytics.service';
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
   * Start word frequency analysis job (every 15 minutes)
   */
  startWordFrequencyJob(): void {
    const task = cron.schedule('*/15 * * * *', async () => {
      await logService.info('Starting word frequency analysis');
      try {
        await analyticsService.analyzeWordFrequency(10);
      } catch (error) {
        await logService.error('Word frequency analysis failed', { error });
      }
    });

    task.start();
    this.tasks.set('word-frequency', task);
    
    logService.info('Word frequency analysis job started (every 15 minutes)');
  }

  /**
   * Start daily report generation job (at 23:59)
   */
  startDailyReportJob(): void {
    const task = cron.schedule('59 23 * * *', async () => {
      await logService.info('Starting daily report generation');
      try {
        await analyticsService.generateReport('daily');
      } catch (error) {
        await logService.error('Daily report generation failed', { error });
      }
    });

    task.start();
    this.tasks.set('daily-report', task);
    
    logService.info('Daily report generation job started (at 23:59)');
  }

  /**
   * Start weekly report generation job (Sunday at 23:59)
   */
  startWeeklyReportJob(): void {
    const task = cron.schedule('59 23 * * 0', async () => {
      await logService.info('Starting weekly report generation');
      try {
        await analyticsService.generateReport('weekly');
      } catch (error) {
        await logService.error('Weekly report generation failed', { error });
      }
    });

    task.start();
    this.tasks.set('weekly-report', task);
    
    logService.info('Weekly report generation job started (Sunday at 23:59)');
  }

  /**
   * Start monthly report generation job (last day of month at 23:59)
   */
  startMonthlyReportJob(): void {
    const task = cron.schedule('59 23 28-31 * *', async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Check if tomorrow is the first day of next month
      if (tomorrow.getDate() === 1) {
        await logService.info('Starting monthly report generation');
        try {
          await analyticsService.generateReport('monthly');
        } catch (error) {
          await logService.error('Monthly report generation failed', { error });
        }
      }
    });

    task.start();
    this.tasks.set('monthly-report', task);
    
    logService.info('Monthly report generation job started (last day of month at 23:59)');
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
        console.log(count);

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
    this.startWordFrequencyJob();
    this.startDailyReportJob();
    this.startWeeklyReportJob();
    this.startMonthlyReportJob();
    this.startDailyCleanupJob();
    logService.info('All cron jobs initialized');
  }
}

export const cronService = new CronService();
