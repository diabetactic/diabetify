import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { LocalGlucoseReading } from '../../../core/models/glucose-reading.model';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-reading-item',
  templateUrl: './reading-item.component.html',
  styleUrls: ['./reading-item.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class ReadingItemComponent {
  @Input() reading!: LocalGlucoseReading;

  constructor(private translationService: TranslationService) {}

  getStatusEmoji(): string {
    if (!this.reading.status) return '😐';

    switch (this.reading.status) {
      case 'normal':
        return '😊';
      case 'low':
      case 'critical-low':
        return '😟';
      case 'high':
      case 'critical-high':
        return '😰';
      default:
        return '😐';
    }
  }

  getStatusText(): string {
    if (!this.reading.status) {
      return this.translationService.instant('glucose.status.normal');
    }

    switch (this.reading.status) {
      case 'normal':
        return this.translationService.instant('glucose.status.normal');
      case 'low':
        return this.translationService.instant('glucose.status.low');
      case 'critical-low':
        return this.translationService.instant('glucose.status.veryLow');
      case 'high':
        return this.translationService.instant('glucose.status.high');
      case 'critical-high':
        return this.translationService.instant('glucose.status.veryHigh');
      default:
        return this.translationService.instant('glucose.status.normal');
    }
  }

  getStatusClass(): string {
    if (!this.reading.status) return 'normal';

    switch (this.reading.status) {
      case 'normal':
        return 'normal';
      case 'low':
      case 'critical-low':
        return 'low';
      case 'high':
      case 'critical-high':
        return 'high';
      default:
        return 'normal';
    }
  }

  formatTime(timeString: string): string {
    return this.translationService.formatTime(timeString);
  }

  formatDate(timeString: string): string {
    const date = new Date(timeString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return this.translationService.instant('common.today');
    } else if (date.toDateString() === yesterday.toDateString()) {
      return this.translationService.instant('common.yesterday');
    } else {
      const locale = this.translationService.getCurrentLanguage();
      return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
    }
  }
}
