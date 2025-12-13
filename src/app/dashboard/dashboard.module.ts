import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DashboardPage } from './dashboard.page';

import { DashboardPageRoutingModule } from './dashboard-routing.module';

// Import standalone components
import { StatCardComponent } from '@shared/components/stat-card/stat-card.component';
import { ReadingItemComponent } from '@shared/components/reading-item/reading-item.component';
import { AlertBannerComponent } from '@shared/components/alert-banner/alert-banner.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { LanguageSwitcherComponentModule } from '@shared/components/language-switcher/language-switcher.module';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    TranslateModule,
    DashboardPageRoutingModule,
    DashboardPage,
    LanguageSwitcherComponentModule,
    // Standalone components
    StatCardComponent,
    ReadingItemComponent,
    AlertBannerComponent,
    EmptyStateComponent,
  ],
})
export class DashboardPageModule {}
