import '../../../../test-setup';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatCardComponent } from './stat-card.component';
import { AppIconComponent } from '../app-icon/app-icon.component';
import { By } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { DecimalPipe } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';

describe('StatCardComponent Icons', () => {
  let component: StatCardComponent;
  let fixture: ComponentFixture<StatCardComponent>;
  let cdr: ChangeDetectorRef;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatCardComponent, AppIconComponent, TranslateModule.forRoot()],
      providers: [DecimalPipe],
    }).compileComponents();

    fixture = TestBed.createComponent(StatCardComponent);
    component = fixture.componentInstance;
    cdr = fixture.debugElement.injector.get(ChangeDetectorRef);
    fixture.detectChanges();
  });

  it('should render target icon for Time in Range', () => {
    component.title = 'Time in Range';
    component.icon = 'target'; // Direct lucide name or mapped name
    cdr.markForCheck();
    fixture.detectChanges();

    const iconComponent = fixture.debugElement.query(By.directive(AppIconComponent));
    expect(iconComponent).toBeTruthy();
    expect(iconComponent.componentInstance.name).toBe('target');
  });

  it('should render activity icon for Average Glucose', () => {
    component.title = 'Average Glucose';
    component.icon = 'activity'; // Direct lucide name or mapped name
    cdr.markForCheck();
    fixture.detectChanges();

    const iconComponent = fixture.debugElement.query(By.directive(AppIconComponent));
    expect(iconComponent).toBeTruthy();
    expect(iconComponent.componentInstance.name).toBe('activity');
  });
});
