import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { AddReadingPage } from './add-reading.page';
import { getLucideIconsForTesting } from '../tests/helpers/icon-test.helper';
import { ReadingsService } from '../core/services/readings.service';
import { ProfileService } from '../core/services/profile.service';
import { LoggerService } from '../core/services/logger.service';
import { BehaviorSubject, of } from 'rxjs';

describe('AddReadingPage', () => {
  let component: AddReadingPage;
  let fixture: ComponentFixture<AddReadingPage>;

  beforeEach(async () => {
    const mockModalController = {
      dismiss: jest.fn().mockResolvedValue(undefined),
    };

    const mockReadingsService = {
      addReading: jest.fn().mockReturnValue(of({})),
    };

    const mockProfileService = {
      profile$: new BehaviorSubject({
        id: 'test-user-id',
        dni: '12345678',
        name: 'Test',
        surname: 'User',
        email: 'test@example.com',
        accountState: 'active' as const,
        preferences: {
          glucoseUnit: 'mg/dL' as const,
          language: 'en',
          theme: 'light',
        },
        tidepoolConnection: {
          connected: false,
        },
      }),
      tidepoolConnected$: new BehaviorSubject(false),
      getProfile: jest.fn().mockResolvedValue(null),
      updateProfile: jest.fn().mockResolvedValue(undefined),
    };

    const mockLoggerService = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [
        AddReadingPage,
        IonicModule.forRoot(),
        TranslateModule.forRoot(),
        getLucideIconsForTesting(),
      ],
      providers: [
        { provide: ModalController, useValue: mockModalController },
        { provide: ReadingsService, useValue: mockReadingsService },
        { provide: ProfileService, useValue: mockProfileService },
        { provide: LoggerService, useValue: mockLoggerService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AddReadingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
