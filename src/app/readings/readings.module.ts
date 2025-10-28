import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReadingsPage } from './readings.page';

import { ReadingsPageRoutingModule } from './readings-routing.module';

// Import shared components (standalone)
import { ReadingItemComponent, EmptyStateComponent } from '../shared/components';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ReadingsPageRoutingModule,
    ReadingsPage,
    // Standalone components
    ReadingItemComponent,
    EmptyStateComponent,
  ],
})
export class ReadingsPageModule {}
