import {
  Component,
  Input,
  HostBinding,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-stat-card',
  templateUrl: './stat-card.component.html',
  styleUrls: ['./stat-card.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
  providers: [DecimalPipe],
})
export class StatCardComponent implements OnChanges {
  @Input() title: string = '';
  @Input() value: number | string = 0;
  @Input() unit: string = '';
  @Input() icon: string = 'analytics';
  @Input() gradientColors: [string, string] = ['#3b82f6', '#60a5fa'];
  @Input() color: string = '';
  @Input() trend: 'up' | 'down' | 'stable' | undefined = undefined;
  @Input() trendValue?: number;
  @Input() loading: boolean = false;
  @Input() error: boolean = false;
  @Input() clickable: boolean = false;

  @Output() cardClick = new EventEmitter<void>();

  valueUpdating = false;
  private previousValue: number | string = 0;

  constructor(private decimalPipe: DecimalPipe) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && !changes['value'].firstChange) {
      this.valueUpdating = true;
      setTimeout(() => {
        this.valueUpdating = false;
      }, 300);
    }
  }

  @HostBinding('attr.aria-busy') get isBusy() {
    return this.loading ? 'true' : 'false';
  }

  @HostBinding('class') get hostClasses(): string {
    const classes = [];
    if (this.color) {
      classes.push(`stat-card-${this.color}`);
    }
    if (this.clickable) {
      classes.push('stat-card-clickable');
    }
    if (this.error) {
      classes.push('stat-card-error-state');
    }
    if (this.shouldPulse()) {
      classes.push('stat-card-pulse');
    }
    return classes.join(' ');
  }

  get formattedValue(): string {
    if (typeof this.value === 'number') {
      return this.decimalPipe.transform(this.value) || '';
    }
    return this.value;
  }

  shouldPulse(): boolean {
    // Pulse animation for high glucose values (danger state)
    if (this.color === 'danger' && typeof this.value === 'number') {
      return this.value > 200;
    }
    return false;
  }

  onCardClicked() {
    if (this.clickable) {
      this.cardClick.emit();
    }
  }
}
