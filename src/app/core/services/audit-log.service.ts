import { Injectable, Optional } from '@angular/core';
import { db, AuditLogItem, DiabetacticDatabase } from '@services/database.service';

@Injectable({
  providedIn: 'root',
})
export class AuditLogService {
  private db: DiabetacticDatabase;

  constructor(@Optional() database?: DiabetacticDatabase) {
    this.db = database ?? db;
  }

  async logConflictResolution(
    readingId: string,
    resolution: 'keep-mine' | 'keep-server' | 'keep-both',
    details: unknown
  ) {
    const logEntry: AuditLogItem = {
      action: `conflict-resolution-${resolution}`,
      details: {
        readingId,
        resolution,
        ...(typeof details === 'object' && details !== null ? details : { value: details }),
      },
      createdAt: Date.now(),
    };
    await this.db.auditLog.add(logEntry);
  }
}
