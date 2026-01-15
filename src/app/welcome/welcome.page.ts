import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';

import { Router, RouterModule, NavigationStart } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, firstValueFrom } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { ProfileService } from '@services/profile.service';
import { ThemeService } from '@services/theme.service';
import { LocalAuthService } from '@services/local-auth.service';
import { ROUTES, ROUTE_SEGMENTS } from '@core/constants';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.page.html',
  styleUrls: ['./welcome.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [RouterModule, TranslateModule, IonContent],
  host: {
    '[class.dark-theme]': 'isDarkMode',
  },
})
export class WelcomePage implements OnInit, OnDestroy {
  isDarkMode = false;
  private readonly destroy$ = new Subject<void>();

  // MOCK QUOTES - Set to false to remove quotes display
  showMockQuotes = false;
  currentQuote = '';
  private mockQuotes: string[] = [];
  // END MOCK QUOTES

  constructor(
    private router: Router,
    private profileService: ProfileService,
    private themeService: ThemeService,
    private translate: TranslateService,
    private authService: LocalAuthService
  ) {}

  async ngOnInit(): Promise<void> {
    // Subscribe to theme changes with automatic cleanup
    this.themeService.isDark$.pipe(takeUntil(this.destroy$)).subscribe(isDark => {
      this.isDarkMode = isDark;
    });

    // CRITICAL: Listen for navigation away from welcome page to ensure cleanup
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationStart),
        filter((event: NavigationStart) => !event.url.includes(ROUTE_SEGMENTS.WELCOME)),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        // Complete destroy$ on navigation away for immediate cleanup
        this.destroy$.next();
        this.destroy$.complete();
      });

    // MOCK QUOTES - Load translated quotes and set random quote
    if (this.showMockQuotes) {
      this.mockQuotes = this.translate.instant('welcome.quotes') as string[];
      if (this.mockQuotes?.length > 0) {
        this.currentQuote = this.mockQuotes[Math.floor(Math.random() * this.mockQuotes.length)];
      }
    }
    // END MOCK QUOTES

    // Check if user has already completed onboarding AND is authenticated
    // Both conditions must be true to auto-redirect to dashboard
    // This prevents navigation loops when user has logged out but profile persists
    const profile = await this.profileService.getProfile();
    await this.authService.waitForInitialization();
    const isAuthenticated = await firstValueFrom(this.authService.isAuthenticated());

    if (profile?.hasCompletedOnboarding && isAuthenticated) {
      // Navigate to tabs if already onboarded and authenticated
      this.router.navigate([ROUTES.TABS_DASHBOARD], { replaceUrl: true });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handle "Login" button click
   */
  async onLogin(): Promise<void> {
    // Remove focus from button before navigation to prevent aria-hidden accessibility warning
    // Ionic adds aria-hidden to hidden pages, which conflicts with focused elements
    (document.activeElement as HTMLElement)?.blur();

    await this.router.navigate([ROUTES.LOGIN]);
  }
}
