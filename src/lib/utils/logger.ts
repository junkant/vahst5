// src/lib/utils/logger.ts
// Production-ready logger with environment-based behavior

interface LogLevel {
  DEBUG: 'debug';
  INFO: 'info';
  WARN: 'warn';
  ERROR: 'error';
}

const LOG_LEVELS: LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};

interface LogEntry {
  level: string;
  message: string;
  data?: any;
  timestamp: string;
  context?: string;
}

class Logger {
  private isDev = import.meta.env.DEV;
  private logQueue: LogEntry[] = [];
  private maxQueueSize = 100;
  
  constructor(private context?: string) {}
  
  debug(message: string, data?: any) {
    if (this.isDev) {
      console.log(`[${this.context || 'App'}] ${message}`, data || '');
    }
    this.addToQueue(LOG_LEVELS.DEBUG, message, data);
  }
  
  info(message: string, data?: any) {
    if (this.isDev) {
      console.info(`[${this.context || 'App'}] ${message}`, data || '');
    }
    this.addToQueue(LOG_LEVELS.INFO, message, data);
  }
  
  warn(message: string, data?: any) {
    console.warn(`[${this.context || 'App'}] ${message}`, data || '');
    this.addToQueue(LOG_LEVELS.WARN, message, data);
  }
  
  error(message: string, error?: any) {
    console.error(`[${this.context || 'App'}] ${message}`, error || '');
    this.addToQueue(LOG_LEVELS.ERROR, message, error);
    
    // In production, send to error tracking service
    if (!this.isDev) {
      this.sendToErrorTracking(message, error);
    }
  }
  
  private addToQueue(level: string, message: string, data?: any) {
    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      context: this.context
    };
    
    this.logQueue.push(entry);
    
    // Prevent memory leak
    if (this.logQueue.length > this.maxQueueSize) {
      this.logQueue.shift();
    }
  }
  
  private sendToErrorTracking(message: string, error: any) {
    // Integrate with your error tracking service (Sentry, LogRocket, etc.)
    // Example:
    // if (window.Sentry) {
    //   window.Sentry.captureException(error, {
    //     extra: { message, context: this.context }
    //   });
    // }
  }
  
  // Get recent logs for debugging
  getRecentLogs(count = 20): LogEntry[] {
    return this.logQueue.slice(-count);
  }
  
  // Clear log queue
  clearLogs() {
    this.logQueue = [];
  }
}

// Create loggers for different parts of the app
export const logger = new Logger();
export const authLogger = new Logger('Auth');
export const firebaseLogger = new Logger('Firebase');
export const taskLogger = new Logger('Tasks');
export const offlineLogger = new Logger('Offline');

// Export factory for creating custom loggers
export function createLogger(context: string): Logger {
  return new Logger(context);
}

// Helper to log performance metrics
export function logPerformance(operation: string, startTime: number) {
  const duration = Date.now() - startTime;
  logger.debug(`Performance: ${operation} took ${duration}ms`);
  
  // In production, send to analytics
  if (!import.meta.env.DEV && duration > 1000) {
    logger.warn(`Slow operation: ${operation}`, { duration });
  }
}
