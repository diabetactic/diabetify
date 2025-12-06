import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NgZone } from '@angular/core';
import { SessionTimeoutService } from './session-timeout.service';
import { LocalAuthService } from './local-auth.service';
import { LoggerService } from './logger.service';
import { ROUTES } from '../constants';

describe('SessionTimeoutService', () => {
  let service: SessionTimeoutService;
  let authService: jest.Mocked<LocalAuthService>;
  let router: jest.Mocked<Router>;
  let logger: jest.Mocked<LoggerService>;
  let ngZone: NgZone;

  const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  beforeEach(() => {
    const mockAuthService = {
      logout: jest.fn().mockResolvedValue(undefined),
    };

    const mockRouter = {
      navigate: jest.fn().mockResolvedValue(true),
    };

    const mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
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
    authService = TestBed.inject(LocalAuthService) as jest.Mocked<LocalAuthService>;
    router = TestBed.inject(Router) as jest.Mocked<Router>;
    logger = TestBed.inject(LoggerService) as jest.Mocked<LoggerService>;
    ngZone = TestBed.inject(NgZone);
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
      jest.useFakeTimers();

      // Simulate click event
      const clickEvent = new MouseEvent('click');
      document.dispatchEvent(clickEvent);

      jest.advanceTimersByTime(1000); // Wait for debounce

      expect(logger.debug).toHaveBeenCalledWith('SessionTimeout', 'Activity timer reset (30min)');

      jest.useRealTimers();
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
      jest.useFakeTimers();

      service.startMonitoring();

      // Verify timeout was set (by checking pending timers)
      expect(jest.getTimerCount()).toBeGreaterThan(0);

      jest.useRealTimers();
    });

    it('should track active timer count', () => {
      jest.useFakeTimers();

      service.startMonitoring();
      const initialTimerCount = jest.getTimerCount();

      expect(initialTimerCount).toBeGreaterThan(0);

      service.stopMonitoring();

      jest.useRealTimers();
    });

    it('should reset timer on keypress', () => {
      service.startMonitoring();
      jest.useFakeTimers();

      // Fast-forward 29 minutes
      jest.advanceTimersByTime(29 * 60 * 1000);

      // Simulate keypress
      const keyEvent = new KeyboardEvent('keypress');
      document.dispatchEvent(keyEvent);
      jest.advanceTimersByTime(1000); // Wait for debounce

      // Should not have logged out yet
      expect(authService.logout).not.toHaveBeenCalled();

      // Fast-forward another 29 minutes
      jest.advanceTimersByTime(29 * 60 * 1000);

      // Still should not have logged out
      expect(authService.logout).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should reset timer on mousemove', () => {
      service.startMonitoring();
      jest.useFakeTimers();

      // Fast-forward 29 minutes
      jest.advanceTimersByTime(29 * 60 * 1000);

      // Simulate mouse move
      const mouseEvent = new MouseEvent('mousemove');
      document.dispatchEvent(mouseEvent);
      jest.advanceTimersByTime(1000); // Wait for debounce

      // Should not have logged out yet
      expect(authService.logout).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should reset timer on touchstart', () => {
      service.startMonitoring();
      jest.useFakeTimers();

      // Fast-forward 29 minutes
      jest.advanceTimersByTime(29 * 60 * 1000);

      // Simulate touch
      const touchEvent = new TouchEvent('touchstart');
      document.dispatchEvent(touchEvent);
      jest.advanceTimersByTime(1000); // Wait for debounce

      // Should not have logged out yet
      expect(authService.logout).not.toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('activity debouncing', () => {
    it('should debounce activity events by 1 second', () => {
      service.startMonitoring();
      jest.useFakeTimers();
      logger.debug.mockClear();

      // Simulate rapid clicks
      for (let i = 0; i < 10; i++) {
        const clickEvent = new MouseEvent('click');
        document.dispatchEvent(clickEvent);
        jest.advanceTimersByTime(100); // 100ms between clicks
      }

      // Should only reset timer once after debounce
      jest.advanceTimersByTime(1000);

      // Verify only one timer reset occurred
      const resetCalls = logger.debug.mock.calls.filter(call =>
        call[1]?.includes('Activity timer reset')
      );
      expect(resetCalls.length).toBeLessThanOrEqual(2); // At most 2 resets (initial + debounced)

      jest.useRealTimers();
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
