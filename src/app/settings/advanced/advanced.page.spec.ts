import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdvancedPage } from './advanced.page';
import { UnifiedAuthService } from '../../core/services/unified-auth.service';
import { TranslationService } from '../../core/services/translation.service';
import { AlertController, IonicModule, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { getTranslateModuleForTesting } from '../../tests/helpers/translate-test.helper';
import { getLucideIconsForTesting } from '../../tests/helpers/icon-test.helper';

describe('AdvancedPage', () => {
  let component: AdvancedPage;
  let fixture: ComponentFixture<AdvancedPage>;
  let mockAuthService: jest.Mocked<UnifiedAuthService>;
  let mockAlertController: jest.Mocked<AlertController>;
  let mockToastController: jest.Mocked<ToastController>;
  let mockRouter: jest.Mocked<Router>;
  let mockTranslationService: jest.Mocked<TranslationService>;

  beforeEach(async () => {
    mockAuthService = { logout: jest.fn() } as any;
    mockAlertController = { create: jest.fn() } as any;
    mockToastController = { create: jest.fn() } as any;
    mockRouter = {
      navigate: jest.fn(),
      navigateByUrl: jest.fn(),
      events: new Subject(),
      url: '/',
    } as any;
    mockTranslationService = { instant: jest.fn() } as any;

    // Mock the alert and toast controllers' create methods
    mockAlertController.create.mockResolvedValue({
      present: jest.fn().mockResolvedValue(undefined),
    } as any);

    mockToastController.create.mockResolvedValue({
      present: jest.fn().mockResolvedValue(undefined),
    } as any);

    await TestBed.configureTestingModule({
      imports: [
        AdvancedPage,
        IonicModule,
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
    }).compileComponents();

    fixture = TestBed.createComponent(AdvancedPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have dev mode enabled based on production flag', () => {
    expect(component.isDevMode).toBeDefined();
  });

  it('should initialize account state to active', () => {
    expect(component.accountState).toBe('active');
  });

  it('should update account state on change', () => {
    const newState = 'pending';
    const event = new CustomEvent('ionChange', { detail: { value: newState } });
    component.onAccountStateChange(event as CustomEvent<{ value: string }>);
    expect(component.accountState).toBe('pending');
  });
});
