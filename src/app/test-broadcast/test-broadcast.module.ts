import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TestBroadcastPageRoutingModule } from './test-broadcast-routing.module';

import { TestBroadcastPage } from './test-broadcast.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TestBroadcastPageRoutingModule
  ],
  declarations: [TestBroadcastPage]
})
export class TestBroadcastPageModule {}
