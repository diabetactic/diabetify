import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { SettingsRoutingModule } from './settings-routing.module';
import { SettingsPage } from './settings.page';

@NgModule({
  declarations: [],
  imports: [CommonModule, FormsModule, IonicModule, SettingsRoutingModule, SettingsPage],
})
export class SettingsModule {}
