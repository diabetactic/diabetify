import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: true,
  imports: [IonicModule, TranslateModule],
})
export class TabsPage {
  constructor(private router: Router) {}

  navigateToAddReading(): void {
    this.router.navigate(['/add-reading']);
  }
}
