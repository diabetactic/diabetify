import { TestBed } from '@angular/core/testing';
import { RendererFactory2 } from '@angular/core';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let mockRenderer: jasmine.SpyObj<any>;
  let mockRendererFactory: jasmine.SpyObj<RendererFactory2>;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    // Create mock renderer
    mockRenderer = jasmine.createSpyObj('Renderer2', ['addClass', 'removeClass']);

    // Create mock renderer factory
    mockRendererFactory = jasmine.createSpyObj('RendererFactory2', ['createRenderer']);
    mockRendererFactory.createRenderer.and.returnValue(mockRenderer);

    TestBed.configureTestingModule({
      providers: [ThemeService, { provide: RendererFactory2, useValue: mockRendererFactory }],
    });

    service = TestBed.inject(ThemeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with a theme based on system preference or saved setting', () => {
    // Theme can be light or dark depending on system preference
    const currentTheme = service.getCurrentTheme();
    expect(['light', 'dark']).toContain(currentTheme);
    expect(typeof service.isDarkTheme()).toBe('boolean');
  });

  it('should toggle theme', () => {
    const initialTheme = service.isDarkTheme();
    service.toggleTheme();
    expect(service.isDarkTheme()).toBe(!initialTheme);
  });

  it('should set dark theme', () => {
    service.setTheme(true);
    expect(service.isDarkTheme()).toBeTrue();
    expect(service.getCurrentTheme()).toBe('dark');
    expect(mockRenderer.addClass).toHaveBeenCalledWith(document.body, 'dark-theme');
  });

  it('should set light theme', () => {
    service.setTheme(false);
    expect(service.isDarkTheme()).toBeFalse();
    expect(service.getCurrentTheme()).toBe('light');
    expect(mockRenderer.removeClass).toHaveBeenCalledWith(document.body, 'dark-theme');
  });

  it('should persist theme preference to localStorage', () => {
    service.setTheme(true, true);
    expect(localStorage.getItem('diabetify-theme')).toBe('dark');

    service.setTheme(false, true);
    expect(localStorage.getItem('diabetify-theme')).toBe('light');
  });

  it('should not persist theme when persist is false', () => {
    service.setTheme(true, false);
    expect(localStorage.getItem('diabetify-theme')).toBeNull();
  });

  it('should clear theme preference', () => {
    service.setTheme(true, true);
    expect(localStorage.getItem('diabetify-theme')).toBe('dark');

    service.clearThemePreference();
    expect(localStorage.getItem('diabetify-theme')).toBeNull();
  });

  it('should emit theme changes via observable', done => {
    let subscriptionCount = 0;
    service.isDarkTheme$.subscribe(isDark => {
      subscriptionCount++;
      // Skip initial emission and only check the change
      if (subscriptionCount > 1) {
        expect(isDark).toBeTrue();
        done();
      }
    });

    service.setTheme(true);
  });
});
