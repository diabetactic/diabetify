import { Component, CUSTOM_ELEMENTS_SCHEMA, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Skeleton Loading Component
 * Displays animated placeholder content while data is loading.
 *
 * Usage:
 * <app-skeleton type="text" [lines]="3"></app-skeleton>
 * <app-skeleton type="card"></app-skeleton>
 * <app-skeleton type="circle" width="48px" height="48px"></app-skeleton>
 */
@Component({
  selector: 'app-skeleton',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule],
  template: `
    <div
      class="skeleton"
      [class.skeleton--pulse]="variant === 'pulse'"
      [class.skeleton--text]="type === 'text'"
      [class.skeleton--circle]="type === 'circle'"
      [class.skeleton--card]="type === 'card'"
      [style.width]="width"
      [style.height]="height"
      [attr.aria-hidden]="true"
      role="presentation"
    >
      @if (type === 'text' && lines > 1) {
        @for (line of lineArray; track $index) {
          <div
            class="skeleton skeleton--text"
            [style.width]="$index === lines - 1 ? '70%' : '100%'"
          ></div>
        }
      }
      @if (type === 'card') {
        <div class="mb-3 flex items-center gap-3">
          <div class="skeleton skeleton--circle" style="width: 40px; height: 40px;"></div>
          <div class="flex-1">
            <div class="skeleton skeleton--text" style="width: 60%;"></div>
            <div class="skeleton skeleton--text" style="width: 40%; height: 0.75em;"></div>
          </div>
        </div>
        <div class="skeleton skeleton--text"></div>
        <div class="skeleton skeleton--text"></div>
        <div class="skeleton skeleton--text" style="width: 80%;"></div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonComponent {
  /** Type of skeleton: text, circle, card, or custom (default) */
  @Input() type: 'text' | 'circle' | 'card' | 'custom' = 'custom';

  /** Animation variant: shimmer (default) or pulse */
  @Input() variant: 'shimmer' | 'pulse' = 'shimmer';

  /** Width (CSS value) */
  @Input() width = '100%';

  /** Height (CSS value) */
  @Input() height = '1em';

  /** Number of text lines (for type="text") */
  @Input() lines = 1;

  /** Generate array for text lines */
  get lineArray(): number[] {
    return Array.from({ length: this.lines }, (_, i) => i);
  }
}
