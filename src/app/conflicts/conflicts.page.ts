import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { db, SyncConflictItem } from '@services/database.service';
import { SyncConflictComponent } from '@shared/components/sync-conflict/sync-conflict.component';
import { ReadingsService } from '@services/readings.service';

@Component({
  selector: 'app-conflicts',
  templateUrl: './conflicts.page.html',
  styleUrls: ['./conflicts.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, IonicModule, TranslateModule, SyncConflictComponent],
})
export class ConflictsPage implements OnInit {
  conflicts: SyncConflictItem[] = [];

  constructor(
    private readingsService: ReadingsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    void this.loadConflicts();
  }

  async loadConflicts() {
    this.conflicts = await db.conflicts.where('status').equals('pending').toArray();
    this.cdr.markForCheck();
  }

  async resolveConflict(event: {
    conflict: SyncConflictItem;
    resolution: 'keep-mine' | 'keep-server' | 'keep-both';
  }) {
    await this.readingsService.resolveConflict(event.conflict, event.resolution);
    await this.loadConflicts();
  }
}
