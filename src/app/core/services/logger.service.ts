import { Injectable } from '@angular/core';

/**
 * Simple logger service for debugging
 */
@Injectable({
  providedIn: 'root',
})
export class LoggerService {
  /**
   * Log info message
   */
  info(context: string, message: string, data?: any): void {
    console.log(`[INFO] [${context}] ${message}`, data || '');
  }

  /**
   * Log warning message
   */
  warn(context: string, message: string): void {
    console.warn(`[WARN] [${context}] ${message}`);
  }

  /**
   * Log error message
   */
  error(context: string, message: string, error?: any): void {
    console.error(`[ERROR] [${context}] ${message}`, error);
  }

  /**
   * Log debug message
   */
  debug(context: string, message: string): void {
    console.debug(`[DEBUG] [${context}] ${message}`);
  }
}
