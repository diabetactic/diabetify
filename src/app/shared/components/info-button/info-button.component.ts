import { ChangeDetectionStrategy, Component, Input, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertController } from '@ionic/angular';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-info-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      [ngClass]="'transition-colors ' + (buttonClass || 'text-medium hover:text-dark')"
      (click)="showInfo()"
      [attr.aria-label]="'common.info' | translate"
    >
      <app-icon name="info" class="text-lg"></app-icon>
    </button>
  `,
  standalone: true,
  imports: [CommonModule, AppIconComponent, TranslateModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class InfoButtonComponent {
  @Input() title = '';
  @Input() message = '';
  @Input() buttonClass = '';

  constructor(
    private alertController: AlertController,
    private translate: TranslateService
  ) {}

  async showInfo() {
    const alert = await this.alertController.create({
      header: this.title || this.translate.instant('app.info'),
      message: this.message,
      buttons: [this.translate.instant('common.ok')],
      cssClass: 'info-alert',
    });
    await alert.present();
  }
}
