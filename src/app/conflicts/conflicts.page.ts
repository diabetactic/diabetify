import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { db, SyncConflictItem } from '@services/database.service';
import { SyncConflictComponent } from '@shared/components/sync-conflict/sync-conflict.component';
import { ReadingsService } from '@services/readings.service';

@Component({
  selector: 'app-conflicts',
  templateUrl: './conflicts.page.html',
  styleUrls: ['./conflicts.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, SyncConflictComponent],
})
export class ConflictsPage implements OnInit {
  conflicts: SyncConflictItem[] = [];

  constructor(private readingsService: ReadingsService) {}

  ngOnInit() {
    this.loadConflicts();
  }

  async loadConflicts() {
    this.conflicts = await db.conflicts.where('status').equals('pending').toArray();
  }

  async resolveConflict(event: {
    conflict: SyncConflictItem;
    resolution: 'keep-mine' | 'keep-server' | 'keep-both';
  }) {
    await this.readingsService.resolveConflict(event.conflict, event.resolution);
    this.loadConflicts();
  }
}
