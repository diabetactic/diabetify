import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { ProfileService } from '../core/services/profile.service';
import { DEFAULT_USER_PREFERENCES } from '../core/models/user-profile.model';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.page.html',
  styleUrls: ['./welcome.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, TranslateModule],
})
export class WelcomePage implements OnInit {
  constructor(
    private router: Router,
    private profileService: ProfileService
  ) {}

  async ngOnInit(): Promise<void> {
    // Check if user has already completed onboarding
    const profile = await this.profileService.getProfile();
    if (profile?.hasCompletedOnboarding) {
      // Navigate to tabs if already onboarded
      this.router.navigate(['/tabs/dashboard'], { replaceUrl: true });
    }
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
        // Create a new profile with basic info and Spanish as default language
        await this.profileService.createProfile({
          name: 'User',
          age: 10,
          hasCompletedOnboarding: true,
          preferences: {
            ...DEFAULT_USER_PREFERENCES,
            language: 'es',
            themeMode: 'auto',
          },
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
