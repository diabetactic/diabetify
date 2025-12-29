import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { ReadingsStatsComponent } from './readings-stats.component';

describe('ReadingsStatsComponent', () => {
  let component: ReadingsStatsComponent;
  let fixture: ComponentFixture<ReadingsStatsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), ReadingsStatsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ReadingsStatsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should display stats correctly', () => {
    component.filteredCount = 10;
    component.totalCount = 20;
    component.hasActiveFilters = true;
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('10');
    expect(element.textContent).toContain('20');
    expect(element.textContent).toContain('filtered');
  });
});
