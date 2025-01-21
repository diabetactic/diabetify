import { provideHttpClient } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

// Importa las páginas
import { HomePage } from './home/home.page';
import { MainMenuPage } from './main-menu/main-menu.page';
import { ConnectDevicePage } from './connect-device/connect-device.page';
import { ProfilePage } from './profile/profile.page';
import { GlucoseReadingsPage } from './glucose-readings/glucose-readings.page';
import { TestBroadcastPage } from './test-broadcast/test-broadcast.page';

const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomePage },
  { path: 'main-menu', component: MainMenuPage },
  { path: 'connect-device', component: ConnectDevicePage },
  { path: 'profile', component: ProfilePage },
  { path: 'glucose-readings', component: GlucoseReadingsPage },
  { path: 'testxdrip', component: TestBroadcastPage },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule],
  providers: [provideHttpClient()]
})
export class AppRoutingModule { }
