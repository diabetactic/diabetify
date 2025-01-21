import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { IonicStorageModule } from '@ionic/storage-angular'; // Para almacenamiento
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

// Importa las páginas
import { HomePage } from './home/home.page';
import { MainMenuPage } from './main-menu/main-menu.page';
import { ConnectDevicePage } from './connect-device/connect-device.page';
import { ProfilePage } from './profile/profile.page';
import { TestBroadcastPage } from './test-broadcast/test-broadcast.page';

@NgModule({
  declarations: [
    AppComponent,
    HomePage,
    MainMenuPage,
    ConnectDevicePage,
    ProfilePage,
    TestBroadcastPage
  ],
  imports: [
    BrowserModule,
    FormsModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    IonicStorageModule.forRoot(), // Inicializa el almacenamiento
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideCharts(withDefaultRegisterables())
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
