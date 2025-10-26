import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { LocalGlucoseReading, GlucoseStatus } from '../../../core/models/glucose-reading.model';

@Component({
  selector: 'app-reading-item',
  templateUrl: './reading-item.component.html',
  styleUrls: ['./reading-item.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class ReadingItemComponent {
  @Input() reading!: LocalGlucoseReading;

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
    if (!this.reading.status) return 'Normal';

    switch (this.reading.status) {
      case 'normal':
        return 'Normal';
      case 'low':
        return 'Low';
      case 'critical-low':
        return 'Critical Low';
      case 'high':
        return 'High';
      case 'critical-high':
        return 'Critical High';
      default:
        return 'Normal';
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
    const date = new Date(timeString);
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;

    return `${displayHours}:${minutes} ${ampm}`;
  }

  formatDate(timeString: string): string {
    const date = new Date(timeString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }
}
