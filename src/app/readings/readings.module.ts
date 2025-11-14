import { IonicModule } from '@ionic/angular';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ReadingsPage } from './readings.page';

import { ReadingsPageRoutingModule } from './readings-routing.module';

// Import shared components (standalone)
import { ReadingItemComponent, EmptyStateComponent } from '../shared/components';
import { AppIconComponent } from '../shared/components/app-icon/app-icon.component';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    TranslateModule,
    ReadingsPageRoutingModule,
    // Standalone components
    ReadingItemComponent,
    EmptyStateComponent,
    AppIconComponent,
  ],
  declarations: [ReadingsPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ReadingsPageModule {}
