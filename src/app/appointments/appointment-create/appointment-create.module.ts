import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { AppointmentCreatePage } from './appointment-create.page';

const routes: Routes = [
  {
    path: '',
    component: AppointmentCreatePage,
  },
];

@NgModule({
  imports: [CommonModule, ReactiveFormsModule, IonicModule, RouterModule.forChild(routes)],
  declarations: [AppointmentCreatePage],
})
export class AppointmentCreatePageModule {}
