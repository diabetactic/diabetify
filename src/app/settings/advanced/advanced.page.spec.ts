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
  let mockAuthService: jasmine.SpyObj<UnifiedAuthService>;
  let mockAlertController: jasmine.SpyObj<AlertController>;
  let mockToastController: jasmine.SpyObj<ToastController>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockTranslationService: jasmine.SpyObj<TranslationService>;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('UnifiedAuthService', ['logout']);
    mockAlertController = jasmine.createSpyObj('AlertController', ['create']);
    mockToastController = jasmine.createSpyObj('ToastController', ['create']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl'], {
      events: new Subject(),
      url: '/',
    });
    mockTranslationService = jasmine.createSpyObj('TranslationService', ['instant']);

    // Mock the alert and toast controllers' create methods
    (mockAlertController.create as jasmine.Spy).and.returnValue(
      Promise.resolve({
        present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      } as any)
    );

    (mockToastController.create as jasmine.Spy).and.returnValue(
      Promise.resolve({
        present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      } as any)
    );

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
