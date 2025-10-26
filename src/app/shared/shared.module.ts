import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Import all standalone shared components
import { StatCardComponent } from './components/stat-card/stat-card.component';
import { ReadingItemComponent } from './components/reading-item/reading-item.component';
import { AlertBannerComponent } from './components/alert-banner/alert-banner.component';
import { ProfileItemComponent } from './components/profile-item/profile-item.component';
import { EmptyStateComponent } from './components/empty-state/empty-state.component';

// All components are standalone, so we import and export them
const standaloneComponents = [
  StatCardComponent,
  ReadingItemComponent,
  AlertBannerComponent,
  ProfileItemComponent,
  EmptyStateComponent,
];

/**
 * SharedModule provides a convenient way to import all shared components at once.
 * Since all components are standalone, we import them and re-export them.
 */
@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    // Import all standalone components
    ...standaloneComponents,
  ],
  exports: [
    // Export modules that consuming modules might need
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    // Export all standalone components
    ...standaloneComponents,
  ],
})
export class SharedModule {}
