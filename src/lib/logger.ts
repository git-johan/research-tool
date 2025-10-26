// Structured logging utility for research assistant
// Provides consistent logging format with request IDs, timing, and context

export interface LogContext {
  requestId?: string;
  component?: string;
  action?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

export class Logger {
  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private static formatLog(level: LogLevel, message: string, context: LogContext = {}): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      requestId: context.requestId || 'unknown',
      component: context.component || 'unknown',
      action: context.action || 'unknown',
      ...(context.duration && { duration: `${context.duration}ms` }),
      ...(context.metadata && { metadata: context.metadata })
    };

    // Use appropriate console method based on level
    switch (level) {
      case 'ERROR':
        console.error(JSON.stringify(logEntry));
        break;
      case 'WARN':
        console.warn(JSON.stringify(logEntry));
        break;
      case 'INFO':
        console.info(JSON.stringify(logEntry));
        break;
      case 'DEBUG':
        console.debug(JSON.stringify(logEntry));
        break;
    }
  }

  static error(message: string, context: LogContext = {}): void {
    this.formatLog('ERROR', message, context);
  }

  static warn(message: string, context: LogContext = {}): void {
    this.formatLog('WARN', message, context);
  }

  static info(message: string, context: LogContext = {}): void {
    this.formatLog('INFO', message, context);
  }

  static debug(message: string, context: LogContext = {}): void {
    this.formatLog('DEBUG', message, context);
  }

  // Create a logger instance with persistent context
  static withContext(baseContext: LogContext): ContextLogger {
    return new ContextLogger(baseContext);
  }

  static createRequestId(): string {
    return this.generateRequestId();
  }
}

export class ContextLogger {
  constructor(private baseContext: LogContext) {}

  error(message: string, additionalContext: LogContext = {}): void {
    Logger.error(message, { ...this.baseContext, ...additionalContext });
  }

  warn(message: string, additionalContext: LogContext = {}): void {
    Logger.warn(message, { ...this.baseContext, ...additionalContext });
  }

  info(message: string, additionalContext: LogContext = {}): void {
    Logger.info(message, { ...this.baseContext, ...additionalContext });
  }

  debug(message: string, additionalContext: LogContext = {}): void {
    Logger.debug(message, { ...this.baseContext, ...additionalContext });
  }

  // Create a child logger with additional context
  withAdditionalContext(additionalContext: LogContext): ContextLogger {
    return new ContextLogger({ ...this.baseContext, ...additionalContext });
  }
}

// Utility function to measure execution time
export async function withTiming<T>(
  fn: () => Promise<T>,
  logger: ContextLogger,
  action: string
): Promise<T> {
  const startTime = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    logger.info(`${action} completed successfully`, { duration });
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`${action} failed: ${errorMessage}`, { duration });
    throw error;
  }
}