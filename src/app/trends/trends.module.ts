import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';

import { TrendsPage } from './trends.page';

const routes: Routes = [
  {
    path: '',
    component: TrendsPage,
  },
];

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, TrendsPage, RouterModule.forChild(routes)],
})
export class TrendsPageModule {}
