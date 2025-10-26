import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tab1Page } from './tab1.page';

import { Tab1PageRoutingModule } from './tab1-routing.module';
import { ProfileItemComponent } from '../shared/components/profile-item/profile-item.component';

@NgModule({
  imports: [IonicModule, CommonModule, FormsModule, Tab1PageRoutingModule, ProfileItemComponent],
  declarations: [Tab1Page],
})
export class Tab1PageModule {}
