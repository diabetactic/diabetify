import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton } from '@ionic/angular/standalone';
import { Subscription } from 'rxjs';
import { ThemeService } from '@services/theme.service';
import { AppIconComponent } from '../app-icon/app-icon.component';

@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, IonButton, AppIconComponent],
  host: {
    '[class.dark-theme]': 'isDarkMode',
  },
})
export class EmptyStateComponent implements OnInit, OnDestroy {
  @Input() illustration = 'inbox';
  @Input() heading = 'No data yet';
  @Input() message = 'Get started by adding your first item.';
  @Input() ctaText = '';
  @Output() readonly ctaClick = new EventEmitter<void>();

  isDarkMode = false;
  private themeSubscription?: Subscription;
  private cdr = inject(ChangeDetectorRef);

  constructor(private themeService: ThemeService) {}

  ngOnInit(): void {
    this.themeSubscription = this.themeService.isDark$.subscribe(isDark => {
      this.isDarkMode = isDark;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.themeSubscription?.unsubscribe();
  }

  onCtaClick(): void {
    this.ctaClick.emit();
  }
}
