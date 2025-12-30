import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  Input,
  HostBinding,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AppIconComponent } from '../app-icon/app-icon.component';

/**
 * UI Badge Component - Reusable Badge with Tailwind CSS
 *
 * Features:
 * - Five variants: success, warning, danger, info, neutral
 * - Three sizes: sm, md, lg
 * - Three styles: solid, outlined, subtle
 * - Full dark mode support
 * - Icon support
 * - Dismissible option
 *
 * @example
 * ```html
 * <!-- Success badge -->
 * <app-ui-badge variant="success">
 *   Active
 * </app-ui-badge>
 *
 * <!-- Warning badge with icon -->
 * <app-ui-badge variant="warning" icon="warning" size="lg">
 *   Pending Review
 * </app-ui-badge>
 *
 * <!-- Outlined style -->
 * <app-ui-badge variant="info" style="outlined">
 *   New Feature
 * </app-ui-badge>
 *
 * <!-- Subtle style -->
 * <app-ui-badge variant="danger" style="subtle">
 *   Error
 * </app-ui-badge>
 *
 * <!-- Dismissible badge -->
 * <app-ui-badge variant="info" [dismissible]="true" (dismiss)="handleDismiss()">
 *   Notification
 * </app-ui-badge>
 * ```
 */
@Component({
  selector: 'app-ui-badge',
  templateUrl: './ui-badge.component.html',
  styleUrls: ['./ui-badge.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule, AppIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class UiBadgeComponent {
  /** Badge variant (color scheme) */
  @Input() variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' = 'neutral';

  /** Badge size */
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  /** Badge style (visual treatment) */
  @Input() badgeStyle: 'solid' | 'outlined' | 'subtle' = 'solid';

  /** Icon name (Ionicons) */
  @Input() icon?: string;

  /** Dismissible badge (shows close button) */
  @Input() dismissible = false;

  /** Rounded badge (pill shape) */
  @Input() rounded = false;

  @HostBinding('class') get hostClasses(): string {
    return 'ui-badge-host inline-block';
  }

  /** Internal state for dismissed badge */
  isDismissed = false;

  /**
   * Get base badge classes (shared across all variants)
   */
  get baseClasses(): string {
    return 'inline-flex items-center font-medium transition-all duration-200';
  }

  /**
   * Get variant-specific classes based on style
   */
  get variantClasses(): string {
    const solidVariants = {
      success: 'bg-success text-white dark:bg-green-600',
      warning: 'bg-warning text-white dark:bg-amber-600',
      danger: 'bg-danger text-white dark:bg-red-600',
      info: 'bg-primary text-white dark:bg-blue-600',
      neutral: 'bg-gray-500 text-white dark:bg-gray-600',
    };

    const outlinedVariants = {
      success:
        'border-2 border-success text-success bg-transparent dark:border-green-500 dark:text-green-400',
      warning:
        'border-2 border-warning text-warning bg-transparent dark:border-amber-500 dark:text-amber-400',
      danger:
        'border-2 border-danger text-danger bg-transparent dark:border-red-500 dark:text-red-400',
      info: 'border-2 border-primary text-primary bg-transparent dark:border-blue-500 dark:text-blue-400',
      neutral:
        'border-2 border-gray-500 text-gray-700 bg-transparent dark:border-gray-500 dark:text-gray-300',
    };

    const subtleVariants = {
      success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      neutral: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    };

    const styleMap = {
      solid: solidVariants,
      outlined: outlinedVariants,
      subtle: subtleVariants,
    };

    return styleMap[this.badgeStyle][this.variant];
  }

  /**
   * Get size-specific classes
   */
  get sizeClasses(): string {
    const sizes = {
      sm: 'px-2 py-0.5 text-xs gap-1',
      md: 'px-2.5 py-1 text-sm gap-1.5',
      lg: 'px-3 py-1.5 text-base gap-2',
    };
    return sizes[this.size];
  }

  /**
   * Get rounded classes
   */
  get roundedClasses(): string {
    return this.rounded ? 'rounded-full' : 'rounded-md';
  }

  /**
   * Get all badge classes
   */
  get badgeClasses(): string {
    return [this.baseClasses, this.variantClasses, this.sizeClasses, this.roundedClasses].join(' ');
  }

  /**
   * Get icon size classes
   */
  get iconSizeClasses(): string {
    const sizes = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
    };
    return sizes[this.size];
  }

  /**
   * Get close button classes
   */
  get closeButtonClasses(): string {
    const base = 'ml-1 -mr-0.5 hover:opacity-70 transition-opacity';
    const sizes = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
    };
    return `${base} ${sizes[this.size]}`;
  }

  /**
   * Handle badge dismissal
   */
  onDismiss(event: Event): void {
    event.stopPropagation();
    this.isDismissed = true;
  }
}
