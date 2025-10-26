import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class EmptyStateComponent {
  @Input() illustration: string = 'inbox';
  @Input() heading: string = 'No data yet';
  @Input() message: string = 'Get started by adding your first item.';
  @Input() ctaText: string = '';
  @Output() ctaClick = new EventEmitter<void>();

  onCtaClick(): void {
    this.ctaClick.emit();
  }
}
