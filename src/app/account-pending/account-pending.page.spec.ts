// Initialize TestBed environment for Vitest
import '../../test-setup';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { AccountPendingPage } from './account-pending.page';
import { LocalAuthService } from '@core/services/local-auth.service';
import { Router } from '@angular/router';
import { APP_CONFIG } from '@core/config/app-config';

describe('AccountPendingPage', () => {
  let component: AccountPendingPage;
  let fixture: ComponentFixture<AccountPendingPage>;
  let mockAuthService: Mock<LocalAuthService>;
  let mockRouter: Mock<Router>;

  beforeEach(async () => {
    mockAuthService = { logout: vi.fn() } as any;
    mockRouter = { navigate: vi.fn() } as any;

    await TestBed.configureTestingModule({
      imports: [AccountPendingPage, IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: LocalAuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        {
          provide: APP_CONFIG,
          useValue: {
            productName: 'Diabetactic',
            brandShort: 'Diabetactic',
            legalEntity: 'Diabetactic Health Inc.',
            supportEmail: 'test@example.com',
            primaryColor: '#3880ff',
            logoPath: 'assets/img/logo.svg',
            defaultLocale: 'es',
            availableLocales: ['es', 'en'],
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountPendingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should sign out user and navigate to welcome', async () => {
    mockAuthService.logout.mockResolvedValue();
    mockRouter.navigate.mockResolvedValue(true);

    await component.signOut();

    expect(mockAuthService.logout).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/welcome']);
  });

  it('should handle sign out errors gracefully', async () => {
    mockAuthService.logout.mockRejectedValue(new Error('Logout failed'));
    vi.spyOn(console, 'error').mockImplementation();

    await component.signOut();

    expect(console.error).toHaveBeenCalled();
  });
});
