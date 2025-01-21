import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TestBroadcastPage } from './test-broadcast.page';

const routes: Routes = [
  {
    path: '',
    component: TestBroadcastPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TestBroadcastPageRoutingModule {}
