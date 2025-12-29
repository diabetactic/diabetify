import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonDatetime,
  IonDatetimeButton,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { GlucoseStatus } from '@models/glucose-reading.model';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';

export interface ReadingFilters {
  startDate?: Date;
  endDate?: Date;
  status?: GlucoseStatus | 'all';
}

@Component({
  selector: 'app-readings-filter',
  templateUrl: './readings-filter.component.html',
  styleUrls: ['./readings-filter.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonDatetime,
    IonDatetimeButton,
    AppIconComponent,
  ],
})
export class ReadingsFilterComponent {
  @Input() isOpen = false;
  @Input() filters: ReadingFilters = { status: 'all' };
  @Output() closeFilter = new EventEmitter<void>();
  @Output() apply = new EventEmitter<ReadingFilters>();
  @Output() clear = new EventEmitter<void>();

  @ViewChild(IonModal) modal!: IonModal;

  closeModal(): void {
    this.closeFilter.emit();
  }

  applyFilters(): void {
    this.apply.emit(this.filters);
  }

  clearFilters(): void {
    this.clear.emit();
  }

  clearFiltersAndClose(): void {
    this.clear.emit();
    this.closeFilter.emit();
  }

  setFilterAllTime(): void {
    this.filters.startDate = undefined;
    this.filters.endDate = undefined;
  }

  setFilterLast24Hours(): void {
    this.filters.startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.filters.endDate = new Date();
  }

  setFilterLast7Days(): void {
    this.filters.startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    this.filters.endDate = new Date();
  }

  setFilterLast30Days(): void {
    this.filters.startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    this.filters.endDate = new Date();
  }
}
