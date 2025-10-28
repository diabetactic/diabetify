import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-trends',
  templateUrl: './trends.page.html',
  styleUrls: ['./trends.page.scss'],
  standalone: true,
  imports: [IonicModule, TranslateModule],
})
export class TrendsPage {
  constructor() {}
}
