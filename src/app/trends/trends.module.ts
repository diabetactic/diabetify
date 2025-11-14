import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { TrendsPage } from './trends.page';

const routes: Routes = [
  {
    path: '',
    component: TrendsPage,
  },
];

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, TranslateModule, RouterModule.forChild(routes)],
  declarations: [TrendsPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class TrendsPageModule {}
