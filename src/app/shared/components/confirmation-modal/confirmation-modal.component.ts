import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { BolusCalculation } from '../../../core/services/mock-data.service';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  ModalController,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';
import { SafeHtmlPipe } from '@shared/pipes/safe-html.pipe';

@Component({
  selector: 'app-confirmation-modal',
  templateUrl: './confirmation-modal.component.html',
  styleUrls: ['./confirmation-modal.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    TranslateModule,
    AppIconComponent,
    SafeHtmlPipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
  ],
})
export class ConfirmationModalComponent {
  private modalCtrl = inject(ModalController);

  @Input() title = 'Confirm';
  @Input() message = 'Are you sure?';
  @Input() confirmButtonText = 'Confirm';
  @Input() cancelButtonText = 'Cancel';
  @Input() icon = 'alert-circle-outline';
  @Input() color = 'warning';
  @Input() calculation: BolusCalculation | null = null;

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  onConfirm(): void {
    this.confirmed.emit();
    this.modalCtrl.dismiss(null, 'confirmed');
  }

  onCancel(): void {
    this.cancelled.emit();
    this.modalCtrl.dismiss(null, 'cancelled');
  }
}
