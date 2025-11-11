import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Platform } from '@ionic/angular';
import { TranslationService } from './core/services/translation.service';
import { LoggerService } from './core/services/logger.service';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { environment } from '../environments/environment';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { DebugPanelComponent } from './shared/components/debug-panel/debug-panel.component';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule, DebugPanelComponent, IonApp, IonRouterOutlet],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppComponent implements OnInit {
  showDebugPanel = !environment.production && environment.features.devTools;

  constructor(
    private translationService: TranslationService,
    private platform: Platform,
    private logger: LoggerService
  ) {
    this.logger.info('Init', 'AppComponent initialized');
    this.initializeApp();
  }

  async ngOnInit(): Promise<void> {
    // Translation service initializes automatically in constructor/service
    this.translationService.currentLanguage$.subscribe(lang => {
      this.logger.info('UI', 'Language changed', { language: lang });
    });
  }

  private async initializeApp(): Promise<void> {
    this.logger.info('Init', 'Platform initializing');
    await this.platform.ready();
    this.logger.info('Init', 'Platform ready', { platforms: this.platform.platforms() });

    if (this.platform.is('capacitor')) {
      try {
        await StatusBar.setStyle({ style: Style.Default });
        await SplashScreen.hide();
        this.logger.info('Init', 'Native plugins initialized successfully');
      } catch (err) {
        this.logger.error('Init', 'Error initializing native plugins', err);
      }
    }
  }
}
