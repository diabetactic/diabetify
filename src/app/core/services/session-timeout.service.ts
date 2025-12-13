/**
 * SessionTimeoutService - Manages user session timeout and inactivity detection
 * Automatically logs out users after 30 minutes of inactivity
 */

import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { fromEvent, merge, Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { LocalAuthService } from '@services/local-auth.service';
import { LoggerService } from '@services/logger.service';
import { ROUTES } from '@core/constants';

@Injectable({
  providedIn: 'root',
})
export class SessionTimeoutService implements OnDestroy {
  private readonly INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  private readonly ACTIVITY_DEBOUNCE_MS = 1000; // Debounce activity events by 1 second

  private timeoutId: number | null = null;
  private destroy$ = new Subject<void>();
  private isMonitoring = false;

  constructor(
    private authService: LocalAuthService,
    private router: Router,
    private logger: LoggerService,
    private ngZone: NgZone
  ) {}

  /**
   * Start monitoring user activity
   * Should be called after successful login
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      this.logger.debug('SessionTimeout', 'Already monitoring activity');
      return;
    }

    this.logger.info('SessionTimeout', 'Starting inactivity monitoring (30min timeout)');
    this.isMonitoring = true;

    // Listen to user activity events
    // Run outside Angular zone to avoid triggering change detection on every event
    this.ngZone.runOutsideAngular(() => {
      const activity$ = merge(
        fromEvent(document, 'click'),
        fromEvent(document, 'keypress'),
        fromEvent(document, 'mousemove'),
        fromEvent(document, 'touchstart'),
        fromEvent(document, 'scroll'),
        fromEvent(window, 'focus')
      ).pipe(debounceTime(this.ACTIVITY_DEBOUNCE_MS), takeUntil(this.destroy$));

      activity$.subscribe(() => {
        // Reset timer on activity (run in Angular zone for change detection)
        this.ngZone.run(() => {
          this.resetTimer();
        });
      });
    });

    // Start initial timer
    this.resetTimer();
  }

  /**
   * Stop monitoring user activity
   * Should be called after logout
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.logger.info('SessionTimeout', 'Stopping inactivity monitoring');
    this.isMonitoring = false;

    // Clear timeout
    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    // Unsubscribe from events
    this.destroy$.next();
  }

  /**
   * Reset the inactivity timer
   * Called on user activity
   */
  private resetTimer(): void {
    // Clear existing timeout
    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
    }

    // Set new timeout
    this.timeoutId = window.setTimeout(() => {
      this.handleTimeout();
    }, this.INACTIVITY_TIMEOUT_MS);

    this.logger.debug('SessionTimeout', 'Activity timer reset (30min)');
  }

  /**
   * Handle session timeout
   * Logs out user and redirects to welcome page
   */
  private async handleTimeout(): Promise<void> {
    this.logger.warn('SessionTimeout', 'Session timeout - logging out user');

    // Stop monitoring before logout
    this.stopMonitoring();

    // Logout user
    await this.authService.logout();

    // Redirect to welcome page
    await this.router.navigate([ROUTES.WELCOME], {
      queryParams: { sessionTimeout: 'true' },
    });
  }

  /**
   * Cleanup on service destroy
   */
  ngOnDestroy(): void {
    this.stopMonitoring();
    this.destroy$.complete();
  }
}
