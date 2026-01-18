import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  HostBinding,
  Input,
} from '@angular/core';
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
      class="skeleton skeleton-root"
      [class.skeleton--pulse]="variant === 'pulse'"
      [class.skeleton--text]="type === 'text'"
      [class.skeleton--circle]="type === 'circle'"
      [class.skeleton--card]="type === 'card'"
      [attr.aria-hidden]="true"
      role="presentation"
    >
      @if (type === 'text' && lines > 1) {
        @for (line of lineArray; track $index) {
          <div
            class="skeleton skeleton--text skeleton--w100"
            [class.skeleton--w70]="$index === lines - 1"
          ></div>
        }
      }
      @if (type === 'card') {
        <div class="mb-3 flex items-center gap-3">
          <div class="skeleton skeleton--circle skeleton--card-avatar"></div>
          <div class="flex-1">
            <div class="skeleton skeleton--text skeleton--w60"></div>
            <div class="skeleton skeleton--text skeleton--w40 skeleton--h-sm"></div>
          </div>
        </div>
        <div class="skeleton skeleton--text"></div>
        <div class="skeleton skeleton--text"></div>
        <div class="skeleton skeleton--text skeleton--w80"></div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .skeleton-root {
        width: 100%;
        height: 100%;
      }

      .skeleton--card-avatar {
        width: 40px;
        height: 40px;
      }

      .skeleton--h-sm {
        height: 0.75em;
      }

      .skeleton--w100 {
        width: 100%;
      }

      .skeleton--w80 {
        width: 80%;
      }

      .skeleton--w70 {
        width: 70%;
      }

      .skeleton--w60 {
        width: 60%;
      }

      .skeleton--w40 {
        width: 40%;
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

  @HostBinding('style.width') get hostWidth(): string {
    return this.width;
  }

  @HostBinding('style.height') get hostHeight(): string {
    return this.height;
  }

  /** Number of text lines (for type="text") */
  @Input() lines = 1;

  /** Generate array for text lines */
  get lineArray(): number[] {
    return Array.from({ length: this.lines }, (_, i) => i);
  }
}
