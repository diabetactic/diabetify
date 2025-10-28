import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfilePage } from './profile.page';

import { ProfilePageRoutingModule } from './profile-routing.module';
import { ProfileItemComponent } from '../shared/components/profile-item/profile-item.component';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ProfilePageRoutingModule,
    ProfilePage,
    ProfileItemComponent,
  ],
})
export class ProfilePageModule {}
