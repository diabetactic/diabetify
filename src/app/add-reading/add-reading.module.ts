import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AddReadingPageRoutingModule } from './add-reading-routing.module';

import { AddReadingPage } from './add-reading.page';
import { AlertBannerComponent } from '../shared/components/alert-banner/alert-banner.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    AddReadingPageRoutingModule,
    AddReadingPage,
    AlertBannerComponent,
  ],
})
export class AddReadingPageModule {}
