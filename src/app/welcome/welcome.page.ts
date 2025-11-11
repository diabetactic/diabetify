import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { ProfileService } from '../core/services/profile.service';
import { ThemeService } from '../core/services/theme.service';
import { DEFAULT_USER_PREFERENCES } from '../core/models/user-profile.model';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.page.html',
  styleUrls: ['./welcome.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, TranslateModule],
  host: {
    '[class.dark-theme]': 'isDarkMode',
  },
})
export class WelcomePage implements OnInit, OnDestroy {
  isDarkMode = false;
  private themeSubscription?: Subscription;

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
      this.router.navigate(['/tabs/dashboard'], { replaceUrl: true });
    }
  }

  ngOnDestroy(): void {
    this.themeSubscription?.unsubscribe();
  }

  /**
   * Handle "Get Started" button click
   */
  async onGetStarted(): Promise<void> {
    // For now, just mark onboarding as complete and navigate to tabs
    await this.mockLogin();
  }

  /**
   * Handle "Login" button click
   */
  async onLogin(): Promise<void> {
    // For now, use the same mock login
    await this.mockLogin();
  }

  /**
   * Mock login - creates a basic profile and navigates to dashboard
   */
  private async mockLogin(): Promise<void> {
    try {
      // Create or update profile to mark onboarding as complete
      const existingProfile = await this.profileService.getProfile();

      if (!existingProfile) {
        // Create a new profile with basic info and default preferences (Spanish language, light theme)
        await this.profileService.createProfile({
          name: 'User',
          age: 10,
          hasCompletedOnboarding: true,
          preferences: DEFAULT_USER_PREFERENCES,
        });
      } else {
        // Update existing profile to mark onboarding as complete
        await this.profileService.updateProfile({
          hasCompletedOnboarding: true,
        });
      }

      // Navigate to dashboard
      this.router.navigate(['/tabs/dashboard'], { replaceUrl: true });
    } catch (error) {
      console.error('Error during mock login:', error);
    }
  }
}
