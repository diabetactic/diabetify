import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { IonicStorageModule } from '@ionic/storage-angular'; // Para almacenamiento

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

// Importa las páginas
import { HomePage } from './home/home.page';
import { MainMenuPage } from './main-menu/main-menu.page';
import { ConnectDevicePage } from './connect-device/connect-device.page';
import { ProfilePage } from './profile/profile.page';
import { GlucoseReadingsPage } from './glucose-readings/glucose-readings.page';

@NgModule({
  declarations: [
    AppComponent,
    HomePage,
    MainMenuPage,
    ConnectDevicePage,
    ProfilePage,
    GlucoseReadingsPage
  ],
  imports: [
    BrowserModule,
    FormsModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    IonicStorageModule.forRoot() // Inicializa el almacenamiento
  ],
  providers: [{ provide: RouteReuseStrategy, useClass: IonicRouteStrategy }],
  bootstrap: [AppComponent],
})
export class AppModule { }
