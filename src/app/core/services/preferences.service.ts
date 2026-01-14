import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Preferences } from '@capacitor/preferences';
import { LoggerService } from '@services/logger.service';
import { GlucoseUnit } from '@models/glucose-reading.model';

const STORAGE_KEY = 'diabetactic_user_preferences';

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface NotificationPreferences {
  enabled: boolean;
  appointments: boolean;
  readings: boolean;
  reminders: boolean;
  soundEnabled: boolean;
}

export interface TargetRange {
  low: number;
  high: number;
}

export interface SafetySettings {
  maxBolus: number;
  lowGlucoseThreshold: number;
}

export interface UserPreferences {
  glucoseUnit: GlucoseUnit;
  targetRange: TargetRange;
  language: 'en' | 'es';
  theme: ThemeMode;
  notifications: NotificationPreferences;
  safety: SafetySettings;
  dateFormat: '12h' | '24h';
  showTrendArrows: boolean;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  glucoseUnit: 'mg/dL',
  targetRange: { low: 70, high: 180 },
  language: 'es',
  theme: 'auto',
  notifications: {
    enabled: true,
    appointments: true,
    readings: true,
    reminders: true,
    soundEnabled: true,
  },
  safety: {
    maxBolus: 15,
    lowGlucoseThreshold: 70,
  },
  dateFormat: '12h',
  showTrendArrows: true,
};

@Injectable({
  providedIn: 'root',
})
export class PreferencesService {
  private preferences$ = new BehaviorSubject<UserPreferences>(DEFAULT_PREFERENCES);
  private initPromise: Promise<void>;
  private initResolve!: () => void;

  constructor(private logger: LoggerService) {
    this.initPromise = new Promise(resolve => {
      this.initResolve = resolve;
    });
    this.loadFromStorage();
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: STORAGE_KEY });
      if (value) {
        const stored = JSON.parse(value) as Partial<UserPreferences>;
        const merged = this.mergeWithDefaults(stored);
        this.preferences$.next(merged);
        this.logger.info('Preferences', 'Loaded from storage');
      }
    } catch (error) {
      this.logger.error('Preferences', 'Failed to load from storage', error);
    } finally {
      this.initResolve();
    }
  }

  private mergeWithDefaults(partial: Partial<UserPreferences>): UserPreferences {
    return {
      ...DEFAULT_PREFERENCES,
      ...partial,
      targetRange: {
        ...DEFAULT_PREFERENCES.targetRange,
        ...partial.targetRange,
      },
      notifications: {
        ...DEFAULT_PREFERENCES.notifications,
        ...partial.notifications,
      },
      safety: {
        ...DEFAULT_PREFERENCES.safety,
        ...partial.safety,
      },
    };
  }

  async waitForInit(): Promise<void> {
    await this.initPromise;
  }

  getPreferences(): Observable<UserPreferences> {
    return this.preferences$.asObservable();
  }

  getCurrentPreferences(): UserPreferences {
    return this.preferences$.value;
  }

  async updatePreferences(updates: Partial<UserPreferences>): Promise<void> {
    const current = this.preferences$.value;
    const updated = this.mergeWithDefaults({ ...current, ...updates });

    this.preferences$.next(updated);
    await this.saveToStorage(updated);
    this.logger.info('Preferences', 'Updated preferences', { keys: Object.keys(updates) });
  }

  async setGlucoseUnit(unit: GlucoseUnit): Promise<void> {
    await this.updatePreferences({ glucoseUnit: unit });
  }

  async setTargetRange(range: TargetRange): Promise<void> {
    await this.updatePreferences({ targetRange: range });
  }

  async setTheme(theme: ThemeMode): Promise<void> {
    await this.updatePreferences({ theme });
  }

  async setLanguage(language: 'en' | 'es'): Promise<void> {
    await this.updatePreferences({ language });
  }

  async setNotifications(notifications: Partial<NotificationPreferences>): Promise<void> {
    const current = this.preferences$.value.notifications;
    await this.updatePreferences({
      notifications: { ...current, ...notifications },
    });
  }

  async setSafety(safety: Partial<SafetySettings>): Promise<void> {
    const current = this.preferences$.value.safety;
    await this.updatePreferences({
      safety: { ...current, ...safety },
    });
  }

  private async saveToStorage(prefs: UserPreferences): Promise<void> {
    try {
      await Preferences.set({
        key: STORAGE_KEY,
        value: JSON.stringify(prefs),
      });
    } catch (error) {
      this.logger.error('Preferences', 'Failed to save to storage', error);
      throw error;
    }
  }

  async clearPreferences(): Promise<void> {
    this.preferences$.next(DEFAULT_PREFERENCES);
    await Preferences.remove({ key: STORAGE_KEY });
    this.logger.info('Preferences', 'Cleared preferences');
  }
}
