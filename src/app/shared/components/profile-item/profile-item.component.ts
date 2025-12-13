import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

import { IonItem, IonToggle } from '@ionic/angular/standalone';

export type ActionType = 'none' | 'toggle' | 'chevron' | 'badge';

@Component({
  selector: 'app-profile-item',
  templateUrl: './profile-item.component.html',
  styleUrls: ['./profile-item.component.scss'],
  standalone: true,
  imports: [IonItem, IonToggle],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileItemComponent {
  @Input() icon: string = 'person';
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() actionType: ActionType = 'chevron';
  @Input() actionValue: string | number | boolean | null = null;
  @Input() iconColor: string = '#3b82f6';
  @Output() readonly itemClick = new EventEmitter<void>();
  @Output() readonly toggleChange = new EventEmitter<boolean>();

  onItemClick(): void {
    if (this.actionType !== 'toggle') {
      this.itemClick.emit();
    }
  }

  onToggleChange(event: CustomEvent<{ checked: boolean }>): void {
    this.toggleChange.emit(event.detail.checked);
  }
}
