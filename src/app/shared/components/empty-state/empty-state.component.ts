import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton } from '@ionic/angular/standalone';
import { Subscription } from 'rxjs';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.scss'],
  standalone: true,
  imports: [CommonModule, IonButton],
  host: {
    '[class.dark-theme]': 'isDarkMode',
  },
})
export class EmptyStateComponent implements OnInit, OnDestroy {
  @Input() illustration: string = 'inbox';
  @Input() heading: string = 'No data yet';
  @Input() message: string = 'Get started by adding your first item.';
  @Input() ctaText: string = '';
  @Output() ctaClick = new EventEmitter<void>();

  isDarkMode = false;
  private themeSubscription?: Subscription;

  constructor(private themeService: ThemeService) {}

  ngOnInit(): void {
    this.themeSubscription = this.themeService.isDark$.subscribe(isDark => {
      this.isDarkMode = isDark;
    });
  }

  ngOnDestroy(): void {
    this.themeSubscription?.unsubscribe();
  }

  get iconClass(): string {
    // Use filled icons in dark mode for better visibility
    return this.isDarkMode ? 'material-symbols-outlined filled' : 'material-symbols-outlined';
  }

  onCtaClick(): void {
    this.ctaClick.emit();
  }
}
