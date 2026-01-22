import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  computed,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { LocalGlucoseReading } from '@models/glucose-reading.model';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { ReadingItemComponent } from '@shared/components/reading-item/reading-item.component';

export interface GroupedReading {
  date: string; // ISO date string
  displayDate: string; // "Today", "Yesterday", or formatted date
  readings: LocalGlucoseReading[];
}

export type VirtualListItem =
  | { type: 'header'; date: string; displayDate: string; count: number }
  | { type: 'reading'; reading: LocalGlucoseReading };

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
    ScrollingModule,
    EmptyStateComponent,
    ReadingItemComponent,
  ],
})
export class ReadingsListComponent {
  readonly groupedReadings = input<GroupedReading[]>([]);
  @Input() isLoading = true;
  @Input() totalCount = 0;
  @Input() filteredCount = 0;
  @Output() readingClicked = new EventEmitter<LocalGlucoseReading>();
  @Output() readingEdit = new EventEmitter<LocalGlucoseReading>();
  @Output() addReading = new EventEmitter<void>();
  @Output() clearFilters = new EventEmitter<void>();

  readonly flattenedItems = computed<VirtualListItem[]>(() => {
    const groups = this.groupedReadings();
    const items: VirtualListItem[] = [];
    for (const group of groups) {
      items.push({
        type: 'header',
        date: group.date,
        displayDate: group.displayDate,
        count: group.readings.length,
      });
      for (const reading of group.readings) {
        items.push({ type: 'reading', reading });
      }
    }
    return items;
  });

  readonly HEADER_HEIGHT = 48;
  readonly ITEM_HEIGHT = 80;

  onReadingClick(reading: LocalGlucoseReading): void {
    this.readingClicked.emit(reading);
  }

  onReadingEdit(reading: LocalGlucoseReading): void {
    this.readingEdit.emit(reading);
  }

  onAddReading(): void {
    this.addReading.emit();
  }

  onClearFilters(): void {
    this.clearFilters.emit();
  }

  trackByGroup(_index: number, group: GroupedReading): string {
    return group.date;
  }

  trackByReading(index: number, reading: LocalGlucoseReading): string {
    return reading.id || reading.localId || `${index}`;
  }

  trackByItem(index: number, item: VirtualListItem): string {
    if (item.type === 'header') {
      return `header-${item.date}`;
    }
    return item.reading.id || item.reading.localId || `reading-${index}`;
  }

  isHeader(item: VirtualListItem): item is VirtualListItem & { type: 'header' } {
    return item.type === 'header';
  }

  isReading(item: VirtualListItem): item is VirtualListItem & { type: 'reading' } {
    return item.type === 'reading';
  }
}
