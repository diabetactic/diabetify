// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NgZone } from '@angular/core';
import { SessionTimeoutService } from '@services/session-timeout.service';
import { LocalAuthService } from '@services/local-auth.service';
import { LoggerService } from '@services/logger.service';

describe('SessionTimeoutService', () => {
  let service: SessionTimeoutService;
  let authService: Mock<LocalAuthService>;
  let _router: Mock<Router>;
  let logger: Mock<LoggerService>;
  let _ngZone: NgZone;

  beforeEach(() => {
    const mockAuthService = {
      logout: vi.fn().mockResolvedValue(undefined),
    };

    const mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    const mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        SessionTimeoutService,
        { provide: LocalAuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: LoggerService, useValue: mockLogger },
      ],
    });

    service = TestBed.inject(SessionTimeoutService);
    authService = TestBed.inject(LocalAuthService) as Mock<LocalAuthService>;
    _router = TestBed.inject(Router) as Mock<Router>;
    logger = TestBed.inject(LoggerService) as Mock<LoggerService>;
    _ngZone = TestBed.inject(NgZone);
  });

  afterEach(() => {
    service.stopMonitoring();
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  describe('startMonitoring', () => {
    it('should start monitoring user activity', () => {
      service.startMonitoring();

      expect(logger.info).toHaveBeenCalledWith(
        'SessionTimeout',
        'Starting inactivity monitoring (30min timeout)'
      );
    });

    it('should not start monitoring twice', () => {
      service.startMonitoring();
      logger.debug.mockClear();

      service.startMonitoring();

      expect(logger.debug).toHaveBeenCalledWith('SessionTimeout', 'Already monitoring activity');
    });

    it('should setup event listeners for user activity', () => {
      service.startMonitoring();
      vi.useFakeTimers();

      // Simulate click event
      const clickEvent = new MouseEvent('click');
      document.dispatchEvent(clickEvent);

      vi.advanceTimersByTime(1000); // Wait for debounce

      expect(logger.debug).toHaveBeenCalledWith('SessionTimeout', 'Activity timer reset (30min)');

      vi.useRealTimers();
    });
  });

  describe('stopMonitoring', () => {
    it('should stop monitoring user activity', () => {
      service.startMonitoring();
      logger.info.mockClear();

      service.stopMonitoring();

      expect(logger.info).toHaveBeenCalledWith('SessionTimeout', 'Stopping inactivity monitoring');
    });

    it('should do nothing if not monitoring', () => {
      logger.info.mockClear();

      service.stopMonitoring();

      expect(logger.info).not.toHaveBeenCalled();
    });
  });

  describe('session timeout', () => {
    it('should start timeout timer when monitoring starts', () => {
      vi.useFakeTimers();

      service.startMonitoring();

      // Verify timeout was set (by checking pending timers)
      expect(vi.getTimerCount()).toBeGreaterThan(0);

      vi.useRealTimers();
    });

    it('should track active timer count', () => {
      vi.useFakeTimers();

      service.startMonitoring();
      const initialTimerCount = vi.getTimerCount();

      expect(initialTimerCount).toBeGreaterThan(0);

      service.stopMonitoring();

      vi.useRealTimers();
    });

    it('should reset timer on keypress', () => {
      service.startMonitoring();
      vi.useFakeTimers();

      // Fast-forward 29 minutes
      vi.advanceTimersByTime(29 * 60 * 1000);

      // Simulate keypress
      const keyEvent = new KeyboardEvent('keypress');
      document.dispatchEvent(keyEvent);
      vi.advanceTimersByTime(1000); // Wait for debounce

      // Should not have logged out yet
      expect(authService.logout).not.toHaveBeenCalled();

      // Fast-forward another 29 minutes
      vi.advanceTimersByTime(29 * 60 * 1000);

      // Still should not have logged out
      expect(authService.logout).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should reset timer on mousemove', () => {
      service.startMonitoring();
      vi.useFakeTimers();

      // Fast-forward 29 minutes
      vi.advanceTimersByTime(29 * 60 * 1000);

      // Simulate mouse move
      const mouseEvent = new MouseEvent('mousemove');
      document.dispatchEvent(mouseEvent);
      vi.advanceTimersByTime(1000); // Wait for debounce

      // Should not have logged out yet
      expect(authService.logout).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should reset timer on touchstart', () => {
      service.startMonitoring();
      vi.useFakeTimers();

      // Fast-forward 29 minutes
      vi.advanceTimersByTime(29 * 60 * 1000);

      // Simulate touch
      const touchEvent = new TouchEvent('touchstart');
      document.dispatchEvent(touchEvent);
      vi.advanceTimersByTime(1000); // Wait for debounce

      // Should not have logged out yet
      expect(authService.logout).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('activity debouncing', () => {
    it('should debounce activity events by 1 second', () => {
      service.startMonitoring();
      vi.useFakeTimers();
      logger.debug.mockClear();

      // Simulate rapid clicks
      for (let i = 0; i < 10; i++) {
        const clickEvent = new MouseEvent('click');
        document.dispatchEvent(clickEvent);
        vi.advanceTimersByTime(100); // 100ms between clicks
      }

      // Should only reset timer once after debounce
      vi.advanceTimersByTime(1000);

      // Verify only one timer reset occurred
      const resetCalls = logger.debug.mock.calls.filter(call =>
        call[1]?.includes('Activity timer reset')
      );
      expect(resetCalls.length).toBeLessThanOrEqual(2); // At most 2 resets (initial + debounced)

      vi.useRealTimers();
    });
  });

  describe('ngOnDestroy', () => {
    it('should cleanup on destroy', () => {
      service.startMonitoring();

      service.ngOnDestroy();

      // Should have stopped monitoring
      expect(logger.info).toHaveBeenCalledWith('SessionTimeout', 'Stopping inactivity monitoring');
    });
  });
});
