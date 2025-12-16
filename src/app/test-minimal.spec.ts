// Initialize TestBed environment for Vitest
import '../test-setup';

import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { Injectable } from '@angular/core';
import { describe, it, expect, beforeEach } from 'vitest';

@Injectable({ providedIn: 'root' })
class SimpleService {
  getValue(): string {
    return 'test';
  }
}

describe('Minimal Angular Test', () => {
  beforeEach(() => {
    // Initialize TestBed directly in the test file
    try {
      TestBed.resetTestEnvironment();
    } catch {
      // Ignore if not initialized
    }
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());

    TestBed.configureTestingModule({
      providers: [SimpleService],
    });
  });

  it('should create service', () => {
    const service = TestBed.inject(SimpleService);
    expect(service).toBeTruthy();
    expect(service.getValue()).toBe('test');
  });
});
