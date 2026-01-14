import { Component, Input, CUSTOM_ELEMENTS_SCHEMA, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ModalController } from '@ionic/angular';
import { ImageCropperComponent, ImageCroppedEvent, LoadedImage } from 'ngx-image-cropper';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-avatar-cropper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    ImageCropperComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonButtons,
    TranslateModule,
    AppIconComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button (click)="onCancel()">
            <app-icon name="close" slot="icon-only"></app-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>{{ 'profile.avatar.cropTitle' | translate }}</ion-title>
        <ion-buttons slot="end">
          <ion-button
            (click)="onConfirm()"
            [disabled]="!croppedBlob"
            fill="clear"
            class="font-semibold"
          >
            {{ 'common.save' | translate }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="cropper-content">
      <div class="cropper-wrapper">
        <image-cropper
          class="avatar-cropper"
          [imageFile]="imageFile"
          [maintainAspectRatio]="true"
          [aspectRatio]="1"
          [roundCropper]="true"
          [resizeToWidth]="512"
          [cropperMinWidth]="128"
          format="jpeg"
          [imageQuality]="90"
          (imageCropped)="onImageCropped($event)"
          (imageLoaded)="onImageLoaded($event)"
          (loadImageFailed)="onLoadFailed()"
        ></image-cropper>
      </div>

      @if (croppedImage) {
        <div class="preview-section">
          <p class="text-base-content/60 mb-2 text-center text-sm">
            {{ 'profile.avatar.preview' | translate }}
          </p>
          <div class="preview-container">
            <img [src]="croppedImage" class="avatar-preview" alt="Avatar preview" />
          </div>
        </div>
      }
    </ion-content>
  `,
  styles: [
    `
      .cropper-content {
        --background: var(--ion-background-color);
      }

      .cropper-wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 1rem;
        min-height: 300px;
      }

      .avatar-cropper {
        max-height: 350px;
        width: 100%;
      }

      .preview-section {
        padding: 1rem;
        border-top: 1px solid var(--dt-color-border-subtle, #e5e7eb);
      }

      .preview-container {
        display: flex;
        justify-content: center;
      }

      .avatar-preview {
        width: 96px;
        height: 96px;
        border-radius: 50%;
        object-fit: cover;
        border: 3px solid var(--ion-color-primary);
        box-shadow: 0 4px 12px rgb(0 0 0 / 15%);
      }

      :host-context(.dark) .preview-section,
      :host-context(.ion-palette-dark) .preview-section {
        border-top-color: var(--dt-color-border-subtle, #374151);
      }
    `,
  ],
})
export class AvatarCropperComponent {
  @Input() imageFile: File | undefined;

  croppedImage: SafeUrl = '';
  croppedBlob: Blob | null = null;
  private croppedBase64 = '';

  constructor(
    private sanitizer: DomSanitizer,
    private modalController: ModalController
  ) {}

  onImageCropped(event: ImageCroppedEvent): void {
    if (event.objectUrl) {
      this.croppedImage = this.sanitizer.bypassSecurityTrustUrl(event.objectUrl);
    }
    this.croppedBlob = event.blob || null;
    this.croppedBase64 = event.base64 || '';
  }

  onImageLoaded(_image: LoadedImage): void {}

  onLoadFailed(): void {
    this.onCancel();
  }

  async onCancel(): Promise<void> {
    await this.modalController.dismiss(null, 'cancel');
  }

  async onConfirm(): Promise<void> {
    if (this.croppedBase64) {
      await this.modalController.dismiss({ croppedImage: this.croppedBase64 }, 'confirm');
    }
  }
}
