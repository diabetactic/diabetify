import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ExploreContainerComponentModule } from '../explore-container/explore-container.module';

import { GlucoseReadingsPage } from './glucose-readings.page';

describe('GlucoseReadingsPage', () => {
  let component: GlucoseReadingsPage;
  let fixture: ComponentFixture<GlucoseReadingsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GlucoseReadingsPage],
      imports: [IonicModule.forRoot(), ExploreContainerComponentModule]
    }).compileComponents();

    fixture = TestBed.createComponent(GlucoseReadingsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
