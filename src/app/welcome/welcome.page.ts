import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationStart } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ProfileService } from '../core/services/profile.service';
import { ThemeService } from '../core/services/theme.service';
import { ROUTES, ROUTE_SEGMENTS } from '../core/constants';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.page.html',
  styleUrls: ['./welcome.page.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, IonContent],
  host: {
    '[class.dark-theme]': 'isDarkMode',
  },
})
export class WelcomePage implements OnInit, OnDestroy {
  isDarkMode = false;
  private themeSubscription?: Subscription;
  private navigationSubscription?: Subscription;

  // MOCK QUOTES - Set to false to remove quotes display
  showMockQuotes = false;
  currentQuote = '';
  private mockQuotes: string[] = [];
  // END MOCK QUOTES

  constructor(
    private router: Router,
    private profileService: ProfileService,
    private themeService: ThemeService,
    private translate: TranslateService
  ) {}

  async ngOnInit(): Promise<void> {
    // Subscribe to theme changes
    this.themeSubscription = this.themeService.isDark$.subscribe(isDark => {
      this.isDarkMode = isDark;
    });

    // CRITICAL: Listen for navigation away from welcome page to ensure cleanup
    this.navigationSubscription = this.router.events
      .pipe(
        filter(event => event instanceof NavigationStart),
        filter((event: NavigationStart) => !event.url.includes(ROUTE_SEGMENTS.WELCOME))
      )
      .subscribe(() => {
        // Force cleanup when navigating away
        this.cleanup();
      });

    // MOCK QUOTES - Load translated quotes and set random quote
    if (this.showMockQuotes) {
      this.mockQuotes = this.translate.instant('welcome.quotes') as string[];
      if (this.mockQuotes && this.mockQuotes.length > 0) {
        this.currentQuote = this.mockQuotes[Math.floor(Math.random() * this.mockQuotes.length)];
      }
    }
    // END MOCK QUOTES

    // Check if user has already completed onboarding
    const profile = await this.profileService.getProfile();
    if (profile?.hasCompletedOnboarding) {
      // Navigate to tabs if already onboarded
      this.router.navigate([ROUTES.TABS_DASHBOARD], { replaceUrl: true });
    }
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  /**
   * Cleanup method to properly dispose subscriptions and resources
   */
  private cleanup(): void {
    this.themeSubscription?.unsubscribe();
    this.navigationSubscription?.unsubscribe();
    this.themeSubscription = undefined;
    this.navigationSubscription = undefined;
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
