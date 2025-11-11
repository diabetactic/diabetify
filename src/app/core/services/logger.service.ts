import { Injectable } from '@angular/core';

/**
 * Logger service for debugging with request tracking
 */
@Injectable({
  providedIn: 'root',
})
export class LoggerService {
  private requestId: string | null = null;

  /**
   * Set current request ID for tracking
   */
  setRequestId(id: string): void {
    this.requestId = id;
  }

  /**
   * Get current request ID
   */
  getRequestId(): string | null {
    return this.requestId;
  }

  /**
   * Log info message
   */
  info(context: string, message: string, data?: any): void {
    const prefix = this.requestId ? `[${this.requestId}] ` : '';
    console.log(`[INFO] ${prefix}[${context}] ${message}`, data || '');
  }

  /**
   * Log warning message
   */
  warn(context: string, message: string, metadata?: any): void {
    const prefix = this.requestId ? `[${this.requestId}] ` : '';
    if (metadata) {
      console.warn(`[WARN] ${prefix}[${context}] ${message}`, metadata);
    } else {
      console.warn(`[WARN] ${prefix}[${context}] ${message}`);
    }
  }

  /**
   * Log error message
   */
  error(context: string, message: string, error?: any, metadata?: any): void {
    const prefix = this.requestId ? `[${this.requestId}] ` : '';
    if (metadata) {
      console.error(`[ERROR] ${prefix}[${context}] ${message}`, error, metadata);
    } else {
      console.error(`[ERROR] ${prefix}[${context}] ${message}`, error);
    }
  }

  /**
   * Log debug message
   */
  debug(context: string, message: string, metadata?: any): void {
    const prefix = this.requestId ? `[${this.requestId}] ` : '';
    if (metadata) {
      console.debug(`[DEBUG] ${prefix}[${context}] ${message}`, metadata);
    } else {
      console.debug(`[DEBUG] ${prefix}[${context}] ${message}`);
    }
  }
}
