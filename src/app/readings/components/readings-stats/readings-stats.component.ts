import { Component, CUSTOM_ELEMENTS_SCHEMA, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonText } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-readings-stats',
  templateUrl: './readings-stats.component.html',
  styleUrls: ['./readings-stats.component.scss'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, TranslateModule, IonText],
})
export class ReadingsStatsComponent {
  @Input() filteredCount = 0;
  @Input() totalCount = 0;
  @Input() hasActiveFilters = false;
  @Input() isLoading = false;
}
