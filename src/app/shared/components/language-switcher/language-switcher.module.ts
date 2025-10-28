import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { LanguageSwitcherComponent, LanguagePopoverComponent } from './language-switcher.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    LanguageSwitcherComponent,
    LanguagePopoverComponent,
  ],
  exports: [LanguageSwitcherComponent],
})
export class LanguageSwitcherComponentModule {}
