import '../../../test-setup';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalController, IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { AvatarCropperComponent } from './avatar-cropper.component';

describe('AvatarCropperComponent', () => {
  let component: AvatarCropperComponent;
  let fixture: ComponentFixture<AvatarCropperComponent>;
  let mockModalController: { dismiss: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockModalController = {
      dismiss: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [AvatarCropperComponent, IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [{ provide: ModalController, useValue: mockModalController }],
    }).compileComponents();

    fixture = TestBed.createComponent(AvatarCropperComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onCancel', () => {
    it('should dismiss modal with cancel role', async () => {
      await component.onCancel();

      expect(mockModalController.dismiss).toHaveBeenCalledWith(null, 'cancel');
    });
  });

  describe('onConfirm', () => {
    it('should not dismiss if no cropped image', async () => {
      await component.onConfirm();

      expect(mockModalController.dismiss).not.toHaveBeenCalled();
    });

    it('should dismiss with cropped image data on confirm', async () => {
      const mockBase64 = 'data:image/jpeg;base64,/9j/test';
      component.onImageCropped({
        base64: mockBase64,
        blob: new Blob(['test'], { type: 'image/jpeg' }),
        objectUrl: 'blob:test',
        width: 512,
        height: 512,
        cropperPosition: { x1: 0, y1: 0, x2: 512, y2: 512 },
        imagePosition: { x1: 0, y1: 0, x2: 512, y2: 512 },
      });

      await component.onConfirm();

      expect(mockModalController.dismiss).toHaveBeenCalledWith(
        { croppedImage: mockBase64 },
        'confirm'
      );
    });
  });

  describe('onImageCropped', () => {
    it('should store cropped blob and base64', () => {
      const mockBlob = new Blob(['test'], { type: 'image/jpeg' });
      const mockBase64 = 'data:image/jpeg;base64,test';

      component.onImageCropped({
        base64: mockBase64,
        blob: mockBlob,
        objectUrl: 'blob:test',
        width: 512,
        height: 512,
        cropperPosition: { x1: 0, y1: 0, x2: 512, y2: 512 },
        imagePosition: { x1: 0, y1: 0, x2: 512, y2: 512 },
      });

      expect(component.croppedBlob).toBe(mockBlob);
    });
  });

  describe('onLoadFailed', () => {
    it('should call onCancel when image fails to load', async () => {
      const cancelSpy = vi.spyOn(component, 'onCancel');

      component.onLoadFailed();

      expect(cancelSpy).toHaveBeenCalled();
    });
  });
});
