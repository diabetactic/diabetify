/**
 * Language Switcher Component
 *
 * Provides a UI control for switching between supported languages.
 * Can be displayed as a button, select dropdown, or popover.
 */

import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, OnDestroy, Input } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { PopoverController } from '@ionic/angular';
import {
  IonButton,
  IonSelect,
  IonSelectOption,
  IonList,
  IonListHeader,
  IonLabel,
  IonItem,
  IonIcon,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { AppIconComponent } from '../app-icon/app-icon.component';

import { TranslationService, Language, LanguageConfig } from '@services/translation.service';

@Component({
  selector: 'app-language-switcher',
  templateUrl: './language-switcher.component.html',
  styleUrls: ['./language-switcher.component.scss'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [FormsModule, TranslateModule, AppIconComponent, IonButton, IonSelect, IonSelectOption],
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
   * Toggle between languages (for button mode) - with synchronization fix
   */
  async toggleLanguage() {
    if (this.isLoading) return;
    await this.translationService.toggleLanguage();

    // Force UI update to ensure text synchronization
    // This fixes the language switcher text not updating immediately
    this.currentLanguage =
      this.translationService
        .getAvailableLanguages()
        .find(l => l.code === this.translationService.getCurrentLanguage()) || null;
  }

  /**
   * Change to specific language (with synchronization fix)
   */
  async changeLanguage(language: Language) {
    if (this.isLoading) return;
    await this.translationService.setLanguage(language);

    // Force UI update to ensure text synchronization
    this.currentLanguage =
      this.translationService.getAvailableLanguages().find(l => l.code === language) || null;

    // Close popover if present
    try {
      const popover = await this.popoverController.getTop();
      if (popover) {
        await popover.dismiss();
      }
    } catch {
      // No popover present
    }
  }

  /**
   * Handle select change event
   */
  async onLanguageSelect(event: CustomEvent<{ value: Language }>) {
    const language = event.detail.value;
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
   * Get language code for display
   */
  getLanguageCode(language: Language): string {
    switch (language) {
      case Language.EN:
        return 'EN';
      case Language.ES:
        return 'ES';
      default:
        return '??';
    }
  }

  /**
   * Check if a language is current
   */
  isCurrentLanguage(language: Language): boolean {
    return this.currentLanguage?.code === language;
  }

  // trackBy function for available languages ngFor
  trackByLanguage(_index: number, lang: LanguageConfig): string {
    return lang.code;
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
  imports: [TranslateModule, IonList, IonListHeader, IonLabel, IonItem, IonIcon, IonButton],
  template: `
    <ion-list class="m-0">
      <ion-list-header class="text-xs font-semibold uppercase">
        <ion-label>{{ 'settings.language.title' | translate }}</ion-label>
      </ion-list-header>
      @for (lang of languages; track lang) {
        <ion-item
          button
          (click)="selectLanguage(lang.code)"
          [class.selected]="isSelected(lang.code)"
          class="language-item"
        >
          <ion-label>
            <span class="mr-3 text-xl">{{ getFlagEmoji(lang.code) }}</span>
            <span class="font-medium">{{ lang.nativeName }}</span>
            <span class="ml-2 text-xs text-gray-500 dark:text-gray-400">({{ lang.code }})</span>
          </ion-label>
          @if (isSelected(lang.code)) {
            <ion-icon name="checkmark" slot="end" color="primary"> </ion-icon>
          }
        </ion-item>
      }
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

  getLanguageCode(language: Language): string {
    switch (language) {
      case Language.EN:
        return 'EN';
      case Language.ES:
        return 'ES';
      default:
        return '??';
    }
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
}
