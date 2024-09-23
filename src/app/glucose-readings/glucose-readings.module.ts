import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GlucoseReadingsPage } from './glucose-readings.page';
import { ExploreContainerComponentModule } from '../explore-container/explore-container.module';

import { GlucoseReadingsPageRoutingModule } from './glucose-readings-routing.module';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ExploreContainerComponentModule,
    GlucoseReadingsPageRoutingModule
  ],
  declarations: [GlucoseReadingsPage]
})
export class GlucoseReadingsPageModule {}
