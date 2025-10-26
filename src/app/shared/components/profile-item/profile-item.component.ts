import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

export type ActionType = 'none' | 'toggle' | 'chevron' | 'badge';

@Component({
  selector: 'app-profile-item',
  templateUrl: './profile-item.component.html',
  styleUrls: ['./profile-item.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class ProfileItemComponent {
  @Input() icon: string = 'person';
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() actionType: ActionType = 'chevron';
  @Input() actionValue: any = null;
  @Input() iconColor: string = '#25aff4';
  @Output() itemClick = new EventEmitter<void>();
  @Output() toggleChange = new EventEmitter<boolean>();

  onItemClick(): void {
    if (this.actionType !== 'toggle') {
      this.itemClick.emit();
    }
  }

  onToggleChange(event: any): void {
    this.toggleChange.emit(event.detail.checked);
  }
}
