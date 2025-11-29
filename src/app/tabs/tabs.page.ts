import { Component } from '@angular/core';
import { Router } from '@angular/router';
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
export class TabsPage {
  constructor(private router: Router) {}

  navigateToAddReading(): void {
    const currentUrl = this.router.url;
    if (currentUrl.includes('appointments')) {
      this.router.navigate(['/tabs', 'appointments', 'create']);
    } else {
      this.router.navigate(['/add-reading']);
    }
  }
}
