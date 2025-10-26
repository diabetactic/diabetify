import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tab1Page } from './tab1.page';

import { Tab1PageRoutingModule } from './tab1-routing.module';

// Import standalone components
import { StatCardComponent } from '../shared/components/stat-card/stat-card.component';
import { ReadingItemComponent } from '../shared/components/reading-item/reading-item.component';
import { AlertBannerComponent } from '../shared/components/alert-banner/alert-banner.component';
import { EmptyStateComponent } from '../shared/components/empty-state/empty-state.component';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    Tab1PageRoutingModule,
    // Standalone components
    StatCardComponent,
    ReadingItemComponent,
    AlertBannerComponent,
    EmptyStateComponent,
  ],
  declarations: [Tab1Page],
})
export class Tab1PageModule {}
