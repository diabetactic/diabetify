import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { AppIconComponent } from '../app-icon/app-icon.component';

/**
 * Bottom Sheet Component
 * A slide-up panel for quick actions and contextual menus.
 *
 * Usage:
 * <app-bottom-sheet [isOpen]="showSheet" (closed)="showSheet = false">
 *   <ng-container header>
 *     <h3>Quick Actions</h3>
 *   </ng-container>
 *   <div class="p-4">
 *     <button (click)="action()">Do Something</button>
 *   </div>
 * </app-bottom-sheet>
 */
@Component({
  selector: 'app-bottom-sheet',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, AppIconComponent],
  template: `
    <!-- Backdrop -->
    <div
      *ngIf="isOpen"
      class="bottom-sheet-backdrop"
      [class.bottom-sheet-backdrop--visible]="isOpen"
      (click)="onBackdropClick()"
      [@fadeInOut]="isOpen ? 'visible' : 'hidden'"
      role="presentation"
    ></div>

    <!-- Sheet -->
    <div
      class="bottom-sheet"
      [class.bottom-sheet--open]="isOpen"
      [@slideUpDown]="isOpen ? 'open' : 'closed'"
      role="dialog"
      [attr.aria-hidden]="!isOpen"
      aria-modal="true"
      [attr.aria-labelledby]="headerId"
    >
      <!-- Handle bar for dragging indication -->
      <div class="bottom-sheet__handle" aria-hidden="true">
        <div class="bottom-sheet__handle-bar"></div>
      </div>

      <!-- Header slot -->
      <div class="bottom-sheet__header" [id]="headerId">
        <ng-content select="[header]"></ng-content>
        <button
          class="bottom-sheet__close touch-target"
          (click)="close()"
          [attr.aria-label]="closeLabel"
          type="button"
        >
          <app-icon name="x"></app-icon>
        </button>
      </div>

      <!-- Content slot -->
      <div class="bottom-sheet__content">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: contents;
      }

      .bottom-sheet-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999;
        opacity: 0;
        transition: opacity var(--duration-normal, 300ms) var(--ease-out, ease-out);
      }

      .bottom-sheet-backdrop--visible {
        opacity: 1;
      }

      .bottom-sheet {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 1000;
        background: var(--color-base-100, #fff);
        border-radius: var(--radius-xl, 24px) var(--radius-xl, 24px) 0 0;
        box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
        max-height: 85vh;
        overflow: hidden;
        transform: translateY(100%);
        will-change: transform;
      }

      .bottom-sheet--open {
        transform: translateY(0);
      }

      .bottom-sheet__handle {
        display: flex;
        justify-content: center;
        padding: 12px 0 8px;
      }

      .bottom-sheet__handle-bar {
        width: 40px;
        height: 4px;
        background: var(--color-base-300, #e5e7eb);
        border-radius: 2px;
      }

      .bottom-sheet__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 16px 12px;
        border-bottom: 1px solid var(--color-base-200, #f5f7f8);
      }

      .bottom-sheet__close {
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        cursor: pointer;
        color: var(--color-base-content, #0d171c);
        opacity: 0.7;
        transition: opacity var(--duration-fast, 150ms) ease;
      }

      .bottom-sheet__close:hover,
      .bottom-sheet__close:focus {
        opacity: 1;
      }

      .bottom-sheet__content {
        overflow-y: auto;
        max-height: calc(85vh - 80px);
        padding-bottom: env(safe-area-inset-bottom, 16px);
      }

      /* Dark mode */
      :host-context(.dark) .bottom-sheet,
      :host-context(.ion-palette-dark) .bottom-sheet,
      :host-context([data-theme='dark']) .bottom-sheet {
        background: var(--color-base-100, #1f2937);
      }

      :host-context(.dark) .bottom-sheet__handle-bar,
      :host-context(.ion-palette-dark) .bottom-sheet__handle-bar,
      :host-context([data-theme='dark']) .bottom-sheet__handle-bar {
        background: var(--color-base-300, #4b5563);
      }
    `,
  ],
  animations: [
    trigger('slideUpDown', [
      state('closed', style({ transform: 'translateY(100%)' })),
      state('open', style({ transform: 'translateY(0)' })),
      transition('closed => open', [animate('300ms cubic-bezier(0.16, 1, 0.3, 1)')]),
      transition('open => closed', [animate('250ms cubic-bezier(0.4, 0, 1, 1)')]),
    ]),
    trigger('fadeInOut', [
      state('hidden', style({ opacity: 0 })),
      state('visible', style({ opacity: 1 })),
      transition('hidden => visible', [animate('200ms ease-out')]),
      transition('visible => hidden', [animate('150ms ease-in')]),
    ]),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomSheetComponent {
  /** Whether the bottom sheet is open */
  @Input() isOpen = false;

  /** Accessible label for the close button */
  @Input() closeLabel = 'Close';

  /** Emitted when the sheet is closed */
  @Output() readonly closed = new EventEmitter<void>();

  /** Unique ID for the header (for aria-labelledby) */
  readonly headerId = `bottom-sheet-header-${Math.random().toString(36).substring(2, 9)}`;

  /** Close on escape key */
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isOpen) {
      this.close();
    }
  }

  /** Handle backdrop click */
  onBackdropClick(): void {
    this.close();
  }

  /** Close the sheet */
  close(): void {
    this.closed.emit();
  }
}
