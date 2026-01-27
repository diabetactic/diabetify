// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdvancedPage } from './advanced.page';
import { UnifiedAuthService } from '@core/services/unified-auth.service';
import { TranslationService } from '@core/services/translation.service';
import { AlertController, IonicModule, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { getTranslateModuleForTesting } from '@core/../tests/helpers/translate-test.helper';
import { getLucideIconsForTesting } from '@core/../tests/helpers/icon-test.helper';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('AdvancedPage', () => {
  let component: AdvancedPage;
  let fixture: ComponentFixture<AdvancedPage>;
  let mockAuthService: vi.Mocked<UnifiedAuthService>;
  let mockAlertController: vi.Mocked<AlertController>;
  let mockToastController: vi.Mocked<ToastController>;
  let mockRouter: vi.Mocked<Router>;
  let mockTranslationService: vi.Mocked<TranslationService>;

  beforeEach(async () => {
    mockAuthService = { logout: vi.fn() } as any;
    mockAlertController = { create: vi.fn() } as any;
    mockToastController = { create: vi.fn() } as any;
    mockRouter = {
      navigate: vi.fn(),
      navigateByUrl: vi.fn(),
      events: new Subject(),
      url: '/',
    } as any;
    mockTranslationService = { instant: vi.fn() } as any;

    // Mock the alert and toast controllers' create methods
    mockAlertController.create.mockResolvedValue({
      present: vi.fn().mockResolvedValue(undefined),
    } as any);

    mockToastController.create.mockResolvedValue({
      present: vi.fn().mockResolvedValue(undefined),
    } as any);

    await TestBed.configureTestingModule({
      imports: [
        AdvancedPage,
        IonicModule.forRoot(),
        getTranslateModuleForTesting(),
        getLucideIconsForTesting(),
      ],
      providers: [
        { provide: UnifiedAuthService, useValue: mockAuthService },
        { provide: AlertController, useValue: mockAlertController },
        { provide: ToastController, useValue: mockToastController },
        { provide: Router, useValue: mockRouter },
        { provide: TranslationService, useValue: mockTranslationService },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AdvancedPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should close modal when close() is called', async () => {
    await component.close();
    expect(mockRouter.navigate).toHaveBeenCalled();
  });
});
