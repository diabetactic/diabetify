// Initialize TestBed environment for Vitest
import '../../test-setup';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { WelcomePage } from './welcome.page';
import { ProfileService } from '@core/services/profile.service';
import { ThemeService } from '@core/services/theme.service';

describe('WelcomePage', () => {
  let component: WelcomePage;
  let fixture: ComponentFixture<WelcomePage>;

  beforeEach(async () => {
    const mockRouter = {
      navigate: jest.fn().mockResolvedValue(true),
      events: { pipe: jest.fn().mockReturnValue({ subscribe: jest.fn() }) },
    };
    const mockProfileService = { getProfile: jest.fn().mockResolvedValue(null) };
    const mockThemeService = { isDark$: { subscribe: jest.fn() } };

    await TestBed.configureTestingModule({
      imports: [WelcomePage, TranslateModule.forRoot()],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ProfileService, useValue: mockProfileService },
        { provide: ThemeService, useValue: mockThemeService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WelcomePage);
    component = fixture.componentInstance;
  });

  describe('Basic Functionality', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have isDarkMode property', () => {
      expect(component.isDarkMode).toBeDefined();
    });

    it('should have showMockQuotes property', () => {
      expect(component.showMockQuotes).toBeDefined();
    });

    it('should have currentQuote property', () => {
      expect(component.currentQuote).toBeDefined();
      expect(component.currentQuote).toBe('');
    });

    it('should have onLogin method', () => {
      expect(typeof component.onLogin).toBe('function');
    });

    it('should have ngOnInit method', () => {
      expect(typeof component.ngOnInit).toBe('function');
    });

    it('should have ngOnDestroy method', () => {
      expect(typeof component.ngOnDestroy).toBe('function');
    });
  });

  describe('Component Metadata', () => {
    it('should be a standalone component', () => {
      const componentMetadata = (WelcomePage as any).ɵcmp;
      expect(componentMetadata.standalone).toBe(true);
    });

    it('should have correct selector', () => {
      const componentMetadata = (WelcomePage as any).ɵcmp;
      expect(componentMetadata.selectors).toEqual([['app-welcome']]);
    });
  });
});
