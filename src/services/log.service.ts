import prisma from '../config/database.config';

class LogService {
  async info(message: string, metadata?: any): Promise<void> {
    console.log(`[INFO] ${message}`, metadata || '');
    await this.saveLog('info', message, metadata);
  }

  async error(message: string, metadata?: any): Promise<void> {
    console.error(`[ERROR] ${message}`, metadata || '');
    await this.saveLog('error', message, metadata);
  }

  async warn(message: string, metadata?: any): Promise<void> {
    console.warn(`[WARN] ${message}`, metadata || '');
    await this.saveLog('warning', message, metadata);
  }

  private async saveLog(type: string, message: string, metadata?: any): Promise<void> {
    try {
      await prisma.systemLog.create({
        data: {
          type,
          message,
          metadata: metadata ? JSON.stringify(metadata) : undefined,
        },
      });
    } catch (error) {
      console.error('Failed to save log to database:', error);
    }
  }
}

export const logService = new LogService();
