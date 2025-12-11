import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { TabsPage } from './tabs.page';
import { AppointmentService } from '../core/services/appointment.service';
import { TranslationService } from '../core/services/translation.service';
import { ToastController } from '@ionic/angular';

describe('TabsPage', () => {
  let component: TabsPage;
  let fixture: ComponentFixture<TabsPage>;

  const mockAppointmentService = {
    getQueueState: jest.fn().mockReturnValue(of({ state: 'NONE' })),
  };

  const mockTranslationService = {
    instant: jest.fn((key: string) => key),
    currentLang: 'en',
    onLangChange: of({ lang: 'en' }),
  };

  const mockToastController = {
    create: jest.fn().mockResolvedValue({
      present: jest.fn().mockResolvedValue(undefined),
    }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabsPage, TranslateModule.forRoot(), RouterTestingModule],
      providers: [
        { provide: AppointmentService, useValue: mockAppointmentService },
        { provide: TranslationService, useValue: mockTranslationService },
        { provide: ToastController, useValue: mockToastController },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TabsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
