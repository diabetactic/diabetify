import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-stat-card',
  templateUrl: './stat-card.component.html',
  styleUrls: ['./stat-card.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class StatCardComponent {
  @Input() title: string = '';
  @Input() value: number | string = 0;
  @Input() unit: string = '';
  @Input() icon: string = 'analytics';
  @Input() gradientColors: [string, string] = ['#3b82f6', '#60a5fa'];
}
