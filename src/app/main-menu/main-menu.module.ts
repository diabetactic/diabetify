import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MainMenuPage } from './main-menu.page';
import { ExploreContainerComponentModule } from '../explore-container/explore-container.module';

import { MainMenuPageRoutingModule } from './main-menu-routing.module';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ExploreContainerComponentModule,
    MainMenuPageRoutingModule
  ],
  declarations: [MainMenuPage]
})
export class MainMenuPageModule {}
