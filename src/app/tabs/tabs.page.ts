import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonFab,
  IonFabButton,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { ROUTES, ROUTE_SEGMENTS } from '../core/constants';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: true,
  imports: [
    IonTabs,
    IonTabBar,
    IonTabButton,
    IonIcon,
    IonLabel,
    IonFab,
    IonFabButton,
    TranslateModule,
  ],
})
export class TabsPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  fabIcon = 'medkit-outline';
  fabLabel = '';

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.router.events.pipe(takeUntil(this.destroy$)).subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.updateFabContext(event.url);
      }
    });

    this.updateFabContext(this.router.url);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateFabContext(url: string): void {
    if (url.includes(ROUTE_SEGMENTS.APPOINTMENTS)) {
      this.fabIcon = 'calendar-outline';
      this.fabLabel = 'Add Appointment';
    } else {
      this.fabIcon = 'medkit-outline';
      this.fabLabel = 'Add Reading';
    }
  }

  navigateToAddReading(): void {
    const currentUrl = this.router.url;
    if (currentUrl.includes(ROUTE_SEGMENTS.APPOINTMENTS)) {
      this.router.navigate([ROUTES.APPOINTMENTS_CREATE]);
    } else {
      this.router.navigate([ROUTES.ADD_READING]);
    }
  }
}
