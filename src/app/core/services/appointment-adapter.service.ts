import { Injectable } from '@angular/core';
import { Observable, from, of, forkJoin, throwError, BehaviorSubject } from 'rxjs';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
import { AppointmentService } from './appointment.service';
import { DatabaseService } from './database.service';
import { LoggerService } from './logger.service';
import Dexie, { Table } from 'dexie';

/**
 * Local appointment modification tracking
 */
export interface LocalAppointmentUpdate {
  id: string;
  appointmentId: string;
  updates: Partial<Appointment>;
  timestamp: Date;
  synced: boolean;
}

export interface LocalAppointmentCancellation {
  id: string;
  appointmentId: string;
  reason?: string;
  timestamp: Date;
  synced: boolean;
}

export interface Appointment {
  appointment_id: string;
  user_id: string;
  glucose_objective: number;
  insulin_type: string;
  dose: number;
  fast_insulin: string;
  fixed_dose: number;
  ratio: number;
  sensitivity: number;
  pump_type?: string;
  another_treatment?: string;
  control_data: string;
  motive?: string[];
  other_motive?: string;
  created_at?: Date;
  updated_at?: Date;
  // Local-only fields
  _locallyModified?: boolean;
  _locallyCancelled?: boolean;
  _localUpdates?: Partial<Appointment>;
}

export interface SyncResult {
  successful: number;
  failed: number;
  errors: Array<{ appointmentId: string; error: string }>;
}

/**
 * Database for local appointment modifications
 */
class AppointmentAdapterDB extends Dexie {
  localUpdates!: Table<LocalAppointmentUpdate>;
  localCancellations!: Table<LocalAppointmentCancellation>;

  constructor() {
    super('AppointmentAdapterDB');

    this.version(1).stores({
      localUpdates: '++id, appointmentId, synced, timestamp',
      localCancellations: '++id, appointmentId, synced, timestamp',
    });
  }
}

/**
 * Appointment adapter service that adds local update/cancel functionality
 * on top of the existing AppointmentService WITHOUT modifying the backend
 */
@Injectable({
  providedIn: 'root',
})
export class AppointmentAdapterService {
  private db: AppointmentAdapterDB;
  private syncStatusSubject = new BehaviorSubject<SyncResult | null>(null);
  public syncStatus$ = this.syncStatusSubject.asObservable();

  constructor(
    private appointmentService: AppointmentService,
    private logger: LoggerService
  ) {
    this.db = new AppointmentAdapterDB();
    this.initializeDB();
  }

  private async initializeDB(): Promise<void> {
    try {
      await this.db.open();
      this.logger.info('AppointmentAdapter', 'Local database initialized');
    } catch (error) {
      this.logger.error('AppointmentAdapter', 'Failed to initialize database', error);
    }
  }

  /**
   * Update appointment locally (since backend doesn't support it)
   */
  updateAppointment(appointmentId: string, updates: Partial<Appointment>): Observable<Appointment> {
    this.logger.info('AppointmentAdapter', `Updating appointment ${appointmentId} locally`);

    return from(
      this.db.localUpdates.add({
        id: crypto.randomUUID(),
        appointmentId,
        updates,
        timestamp: new Date(),
        synced: false,
      })
    ).pipe(
      switchMap(() => this.getAppointmentWithLocalChanges(appointmentId)),
      tap(() => {
        this.logger.info('AppointmentAdapter', `Appointment ${appointmentId} updated locally`);
      }),
      catchError(error => {
        this.logger.error('AppointmentAdapter', 'Failed to update appointment', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Cancel appointment locally (since backend doesn't support it)
   */
  cancelAppointment(appointmentId: string, reason?: string): Observable<void> {
    this.logger.info('AppointmentAdapter', `Cancelling appointment ${appointmentId} locally`);

    return from(
      this.db.localCancellations.add({
        id: crypto.randomUUID(),
        appointmentId,
        reason,
        timestamp: new Date(),
        synced: false,
      })
    ).pipe(
      map(() => void 0),
      tap(() => {
        this.logger.info('AppointmentAdapter', `Appointment ${appointmentId} cancelled locally`);
      }),
      catchError(error => {
        this.logger.error('AppointmentAdapter', 'Failed to cancel appointment', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get single appointment with local modifications applied
   */
  getAppointmentWithLocalChanges(appointmentId: string): Observable<Appointment> {
    return this.appointmentService.getAppointmentDetails(appointmentId).pipe(
      switchMap(appointment => this.applyLocalChanges([appointment])),
      map(appointments => appointments[0])
    );
  }

  /**
   * Get all appointments with local modifications applied
   */
  getAppointmentsWithLocalChanges(): Observable<Appointment[]> {
    return this.appointmentService
      .getUserAppointments()
      .pipe(switchMap(appointments => this.applyLocalChanges(appointments)));
  }

  /**
   * Apply local changes to appointments
   */
  private applyLocalChanges(appointments: Appointment[]): Observable<Appointment[]> {
    return from(
      Promise.all([
        this.db.localUpdates.where('synced').equals(0).toArray(),
        this.db.localCancellations.where('synced').equals(0).toArray(),
      ])
    ).pipe(
      map(([updates, cancellations]) => {
        // Create maps for efficient lookup
        const updateMap = new Map<string, LocalAppointmentUpdate[]>();
        updates.forEach(update => {
          if (!updateMap.has(update.appointmentId)) {
            updateMap.set(update.appointmentId, []);
          }
          updateMap.get(update.appointmentId)!.push(update);
        });

        const cancellationMap = new Map<string, LocalAppointmentCancellation>();
        cancellations.forEach(cancel => {
          cancellationMap.set(cancel.appointmentId, cancel);
        });

        // Apply changes to appointments
        return (
          appointments
            .map(appointment => {
              const appointmentId = appointment.appointment_id;

              // Check if cancelled
              if (cancellationMap.has(appointmentId)) {
                return {
                  ...appointment,
                  _locallyCancelled: true,
                };
              }

              // Apply updates (merge all updates for this appointment)
              const localUpdates = updateMap.get(appointmentId);
              if (localUpdates && localUpdates.length > 0) {
                // Sort by timestamp and apply in order
                const sortedUpdates = localUpdates.sort(
                  (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
                );

                let updatedAppointment = { ...appointment };
                sortedUpdates.forEach(update => {
                  updatedAppointment = { ...updatedAppointment, ...update.updates };
                });

                return {
                  ...updatedAppointment,
                  _locallyModified: true,
                  _localUpdates: sortedUpdates.reduce((acc, u) => ({ ...acc, ...u.updates }), {}),
                };
              }

              return appointment;
            })
            // Filter out cancelled appointments (optional - can also show them with cancelled flag)
            .filter(appointment => !appointment._locallyCancelled)
        );
      })
    );
  }

  /**
   * Sync local changes with backend when it supports update/cancel
   * For now, this is a placeholder that would be activated when backend is ready
   */
  syncLocalChanges(): Observable<SyncResult> {
    this.logger.info('AppointmentAdapter', 'Attempting to sync local changes');

    return from(
      Promise.all([
        this.db.localUpdates.where('synced').equals(0).toArray(),
        this.db.localCancellations.where('synced').equals(0).toArray(),
      ])
    ).pipe(
      switchMap(([updates, cancellations]) => {
        const result: SyncResult = {
          successful: 0,
          failed: 0,
          errors: [],
        };

        // For now, we can't actually sync because backend doesn't support it
        // This is where you would call the backend when it's ready

        this.logger.warn(
          'AppointmentAdapter',
          `Cannot sync: ${updates.length} updates and ${cancellations.length} cancellations pending`
        );

        // Simulate what would happen when backend is ready:
        /*
        const updateObservables = updates.map(update =>
          this.appointmentService.updateAppointment(update.appointmentId, update.updates).pipe(
            tap(() => {
              // Mark as synced
              this.db.localUpdates.update(update.id, { synced: true });
              result.successful++;
            }),
            catchError(error => {
              result.failed++;
              result.errors.push({
                appointmentId: update.appointmentId,
                error: error.message
              });
              return of(null);
            })
          )
        );

        const cancelObservables = cancellations.map(cancel =>
          this.appointmentService.cancelAppointment(cancel.appointmentId).pipe(
            tap(() => {
              // Mark as synced
              this.db.localCancellations.update(cancel.id, { synced: true });
              result.successful++;
            }),
            catchError(error => {
              result.failed++;
              result.errors.push({
                appointmentId: cancel.appointmentId,
                error: error.message
              });
              return of(null);
            })
          )
        );

        return forkJoin([...updateObservables, ...cancelObservables]).pipe(
          map(() => result)
        );
        */

        // For now, just return the pending count
        result.failed = updates.length + cancellations.length;
        updates.forEach(u => {
          result.errors.push({
            appointmentId: u.appointmentId,
            error: 'Backend does not support updates yet',
          });
        });
        cancellations.forEach(c => {
          result.errors.push({
            appointmentId: c.appointmentId,
            error: 'Backend does not support cancellations yet',
          });
        });

        this.syncStatusSubject.next(result);
        return of(result);
      })
    );
  }

  /**
   * Clear all local modifications
   */
  clearLocalChanges(): Observable<void> {
    this.logger.info('AppointmentAdapter', 'Clearing all local changes');

    return from(
      Promise.all([this.db.localUpdates.clear(), this.db.localCancellations.clear()])
    ).pipe(
      map(() => void 0),
      tap(() => {
        this.logger.info('AppointmentAdapter', 'Local changes cleared');
        this.syncStatusSubject.next(null);
      })
    );
  }

  /**
   * Get count of pending local changes
   */
  getPendingChangesCount(): Observable<{ updates: number; cancellations: number }> {
    return from(
      Promise.all([
        this.db.localUpdates.where('synced').equals(0).count(),
        this.db.localCancellations.where('synced').equals(0).count(),
      ])
    ).pipe(map(([updates, cancellations]) => ({ updates, cancellations })));
  }

  /**
   * Check if an appointment has local modifications
   */
  hasLocalChanges(appointmentId: string): Observable<boolean> {
    return from(
      Promise.all([
        this.db.localUpdates.where('appointmentId').equals(appointmentId).count(),
        this.db.localCancellations.where('appointmentId').equals(appointmentId).count(),
      ])
    ).pipe(map(([updateCount, cancelCount]) => updateCount > 0 || cancelCount > 0));
  }

  /**
   * Get history of local changes for an appointment
   */
  getLocalChangesHistory(appointmentId: string): Observable<{
    updates: LocalAppointmentUpdate[];
    cancellation?: LocalAppointmentCancellation;
  }> {
    return from(
      Promise.all([
        this.db.localUpdates.where('appointmentId').equals(appointmentId).toArray(),
        this.db.localCancellations.where('appointmentId').equals(appointmentId).first(),
      ])
    ).pipe(
      map(([updates, cancellation]) => ({
        updates: updates.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
        cancellation: cancellation || undefined,
      }))
    );
  }

  /**
   * Create a new appointment (wraps the original service)
   */
  createAppointment(appointmentData: Partial<Appointment>): Observable<Appointment> {
    // Simply delegate to the original service
    return this.appointmentService.createAppointment(appointmentData);
  }

  /**
   * Share glucose data (wraps the original service)
   */
  shareGlucoseData(appointmentId: string, glucoseData: any): Observable<void> {
    // Simply delegate to the original service
    return this.appointmentService.shareGlucoseData(appointmentId, glucoseData);
  }
}

/**
 * Provider configuration to replace AppointmentService with adapter
 * Add this to your app.module.ts providers:
 *
 * {
 *   provide: AppointmentService,
 *   useClass: AppointmentAdapterService
 * }
 */
export const APPOINTMENT_ADAPTER_PROVIDER = {
  provide: AppointmentService,
  useClass: AppointmentAdapterService,
};
