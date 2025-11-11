/**
 * Language Switcher Component
 *
 * Provides a UI control for switching between supported languages.
 * Can be displayed as a button, select dropdown, or popover.
 */

import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, PopoverController } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

import {
  TranslationService,
  Language,
  LanguageConfig,
} from '../../../core/services/translation.service';

@Component({
  selector: 'app-language-switcher',
  templateUrl: './language-switcher.component.html',
  styleUrls: ['./language-switcher.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, TranslateModule],
})
export class LanguageSwitcherComponent implements OnInit, OnDestroy {
  @Input() displayMode: 'button' | 'select' | 'popover' = 'button';
  @Input() showIcon = true;
  @Input() showText = true;
  @Input() showNativeName = false;

  currentLanguage: LanguageConfig | null = null;
  availableLanguages: LanguageConfig[] = [];
  isLoading = false;

  private subscriptions = new Subscription();

  constructor(
    private translationService: TranslationService,
    private popoverController: PopoverController
  ) {}

  ngOnInit() {
    // Get available languages
    this.availableLanguages = this.translationService.getAvailableLanguages();

    // Subscribe to current language changes
    this.subscriptions.add(
      this.translationService.currentConfig$.subscribe(config => {
        this.currentLanguage = config;
      })
    );

    // Subscribe to loading state
    this.subscriptions.add(
      this.translationService.state.subscribe(state => {
        this.isLoading = state.isLoading;
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  /**
   * Toggle between languages (for button mode)
   */
  async toggleLanguage() {
    if (this.isLoading) return;
    await this.translationService.toggleLanguage();
  }

  /**
   * Change to specific language
   */
  async changeLanguage(language: Language) {
    if (this.isLoading) return;
    await this.translationService.setLanguage(language);

    // Close popover if present
    try {
      const popover = await this.popoverController.getTop();
      if (popover) {
        await popover.dismiss();
      }
    } catch (error) {
      // No popover present
    }
  }

  /**
   * Handle select change event
   */
  async onLanguageSelect(event: any) {
    const language = event.detail.value as Language;
    await this.changeLanguage(language);
  }

  /**
   * Get display text for current language
   */
  getDisplayText(): string {
    if (!this.currentLanguage) return '';

    if (this.showNativeName) {
      return this.currentLanguage.nativeName;
    }

    return this.currentLanguage.name;
  }

  /**
   * Get flag emoji for language
   */
  getFlagEmoji(language: Language): string {
    switch (language) {
      case Language.EN:
        return '🇺🇸';
      case Language.ES:
        return '🇪🇸';
      default:
        return '🌐';
    }
  }

  /**
   * Check if a language is current
   */
  isCurrentLanguage(language: Language): boolean {
    return this.currentLanguage?.code === language;
  }

  /**
   * Show language popover
   */
  async showLanguagePopover(event: Event) {
    const popover = await this.popoverController.create({
      component: LanguagePopoverComponent,
      event,
      translucent: true,
      cssClass: 'language-popover',
    });

    await popover.present();
  }
}

/**
 * Language Popover Component
 *
 * Used when displayMode is 'popover'
 */
@Component({
  selector: 'app-language-popover',
  standalone: true,
  imports: [CommonModule, IonicModule, TranslateModule],
  template: `
    <ion-list class="m-0">
      <ion-list-header class="uppercase font-semibold text-xs">
        <ion-label>{{ 'settings.language.title' | translate }}</ion-label>
      </ion-list-header>
      <ion-item
        *ngFor="let lang of languages"
        button
        (click)="selectLanguage(lang.code)"
        [class.selected]="isSelected(lang.code)"
        class="language-item"
      >
        <ion-label>
          <span class="text-xl mr-3">{{ getFlagEmoji(lang.code) }}</span>
          <span class="font-medium">{{ lang.nativeName }}</span>
          <span class="text-gray-500 dark:text-gray-400 ml-2 text-xs">({{ lang.code }})</span>
        </ion-label>
        <ion-icon *ngIf="isSelected(lang.code)" name="checkmark" slot="end" color="primary">
        </ion-icon>
      </ion-item>
      <ion-item lines="none">
        <ion-label class="ion-text-center">
          <ion-button fill="clear" size="small" (click)="resetToDevice()">
            <ion-icon name="phone-portrait" slot="start"></ion-icon>
            {{ 'settings.language.auto' | translate }}
          </ion-button>
        </ion-label>
      </ion-item>
    </ion-list>
  `,
  styles: [
    `
      .language-item.selected {
        --background: var(--ion-color-light);
      }

      @media (prefers-color-scheme: dark) {
        .language-item.selected {
          --background: var(--ion-color-dark-tint);
        }
      }
    `,
  ],
})
export class LanguagePopoverComponent implements OnInit {
  languages: LanguageConfig[] = [];
  currentLanguage: Language | null = null;

  constructor(
    private translationService: TranslationService,
    private popoverController: PopoverController
  ) {}

  ngOnInit() {
    this.languages = this.translationService.getAvailableLanguages();
    this.currentLanguage = this.translationService.getCurrentLanguage();
  }

  async selectLanguage(language: Language) {
    await this.translationService.setLanguage(language);
    await this.popoverController.dismiss();
  }

  async resetToDevice() {
    await this.translationService.resetToDeviceLanguage();
    await this.popoverController.dismiss();
  }

  isSelected(language: Language): boolean {
    return this.currentLanguage === language;
  }

  getFlagEmoji(language: Language): string {
    switch (language) {
      case Language.EN:
        return '🇺🇸';
      case Language.ES:
        return '🇪🇸';
      default:
        return '🌐';
    }
  }
}
