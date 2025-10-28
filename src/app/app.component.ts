import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule, Platform } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { TranslationService } from './core/services/translation.service';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, TranslateModule],
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {
  constructor(
    private translationService: TranslationService,
    private platform: Platform
  ) {
    this.initializeApp();
  }

  async ngOnInit(): Promise<void> {
    // Translation service initializes automatically in constructor/service
    this.translationService.currentLanguage$.subscribe(lang => {
      console.log('Current language:', lang);
    });
  }

  private async initializeApp(): Promise<void> {
    await this.platform.ready();

    if (this.platform.is('capacitor')) {
      try {
        await StatusBar.setStyle({ style: Style.Default });
        await SplashScreen.hide();
      } catch (err) {
        console.error('Error initializing native plugins', err);
      }
    }
  }
}
