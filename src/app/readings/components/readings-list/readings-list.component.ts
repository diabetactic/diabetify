import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonText,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { LocalGlucoseReading } from '@models/glucose-reading.model';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { ReadingItemComponent } from '@shared/components/reading-item/reading-item.component';

export interface GroupedReading {
  date: string; // ISO date string
  displayDate: string; // "Today", "Yesterday", or formatted date
  readings: LocalGlucoseReading[];
}

@Component({
  selector: 'app-readings-list',
  templateUrl: './readings-list.component.html',
  styleUrls: ['./readings-list.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    TranslateModule,
    IonItem,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonText,
    AppIconComponent,
    EmptyStateComponent,
    ReadingItemComponent,
  ],
})
export class ReadingsListComponent {
  @Input() groupedReadings: GroupedReading[] = [];
  @Input() isLoading = true;
  @Input() totalCount = 0;
  @Input() filteredCount = 0;
  @Output() readingClicked = new EventEmitter<LocalGlucoseReading>();
  @Output() addReading = new EventEmitter<void>();
  @Output() clearFilters = new EventEmitter<void>();
  @Output() deleteReading = new EventEmitter<{
    reading: LocalGlucoseReading;
    slidingItem: IonItemSliding;
  }>();

  onReadingClick(reading: LocalGlucoseReading): void {
    this.readingClicked.emit(reading);
  }

  onAddReading(): void {
    this.addReading.emit();
  }

  onClearFilters(): void {
    this.clearFilters.emit();
  }

  onDeleteReading(reading: LocalGlucoseReading, slidingItem: IonItemSliding): void {
    this.deleteReading.emit({ reading, slidingItem });
  }

  trackByGroup(index: number, group: GroupedReading): string {
    return group.date;
  }

  trackByReading(index: number, reading: LocalGlucoseReading): string {
    return reading.id || reading.localId || `${index}`;
  }

  itemHeight(): number {
    // This is an approximation. A more accurate measurement might be needed
    return 80;
  }
}
