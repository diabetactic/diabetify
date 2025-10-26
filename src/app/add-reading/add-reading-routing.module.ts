import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AddReadingPage } from './add-reading.page';

const routes: Routes = [
  {
    path: '',
    component: AddReadingPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AddReadingPageRoutingModule {}
