import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-explore-container',
  templateUrl: './explore-container.component.html',
  styleUrls: ['./explore-container.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class ExploreContainerComponent {
  @Input() name?: string;
}
