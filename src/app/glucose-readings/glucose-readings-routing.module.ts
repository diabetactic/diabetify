import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GlucoseReadingsPage } from './glucose-readings.page';

const routes: Routes = [
  {
    path: '',
    component: GlucoseReadingsPage,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GlucoseReadingsPageRoutingModule {}
