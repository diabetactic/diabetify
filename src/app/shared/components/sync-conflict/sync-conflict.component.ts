import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { SyncConflictItem } from '@services/database.service';

@Component({
  selector: 'app-sync-conflict',
  templateUrl: './sync-conflict.component.html',
  styleUrls: ['./sync-conflict.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class SyncConflictComponent implements OnInit {
  @Input() conflict!: SyncConflictItem;
  @Output() resolve = new EventEmitter<{
    conflict: SyncConflictItem;
    resolution: 'keep-mine' | 'keep-server' | 'keep-both';
  }>();

  constructor() {}

  ngOnInit() {}

  keepMine() {
    this.resolve.emit({ conflict: this.conflict, resolution: 'keep-mine' });
  }

  keepServer() {
    this.resolve.emit({ conflict: this.conflict, resolution: 'keep-server' });
  }

  keepBoth() {
    this.resolve.emit({ conflict: this.conflict, resolution: 'keep-both' });
  }
}
