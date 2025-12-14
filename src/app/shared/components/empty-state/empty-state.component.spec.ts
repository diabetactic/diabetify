// Initialize TestBed environment for Vitest
import '../../../../test-setup';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { EmptyStateComponent } from './empty-state.component';
import { ThemeService } from '@services/theme.service';

describe('EmptyStateComponent', () => {
  let component: EmptyStateComponent;
  let fixture: ComponentFixture<EmptyStateComponent>;

  const mockThemeService = {
    isDark$: of(false),
    isDarkTheme: jest.fn().mockReturnValue(false),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStateComponent],
      providers: [{ provide: ThemeService, useValue: mockThemeService }],
    }).compileComponents();

    fixture = TestBed.createComponent(EmptyStateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
