import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, filter, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AuthSessionService {
  private readonly currentUserId$ = new BehaviorSubject<string | null>(null);

  public readonly userId$: Observable<string | null> = this.currentUserId$.asObservable();

  public readonly userIdNonNull$: Observable<string> = this.userId$.pipe(
    filter((id): id is string => id !== null),
    distinctUntilChanged()
  );

  public readonly isAuthenticated$: Observable<boolean> = this.userId$.pipe(
    map(id => id !== null),
    distinctUntilChanged()
  );

  setUser(userId: string): void {
    this.currentUserId$.next(userId);
  }

  clearUser(): void {
    this.currentUserId$.next(null);
  }

  getCurrentUserId(): string | null {
    return this.currentUserId$.getValue();
  }
}
