import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { IonicModule } from '@ionic/angular';
import { AppComponent } from './app.component';
import { TranslationService } from './core/services/translation.service';
import { getLucideIconsForTesting } from './tests/helpers/icon-test.helper';

class TranslationServiceStub {
  currentLanguage$ = of('en');
}

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AppComponent,
        IonicModule.forRoot(),
        TranslateModule.forRoot(),
        RouterTestingModule,
        getLucideIconsForTesting(),
      ],
      providers: [{ provide: TranslationService, useClass: TranslationServiceStub }],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
