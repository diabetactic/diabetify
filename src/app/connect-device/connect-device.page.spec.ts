import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ExploreContainerComponentModule } from '../explore-container/explore-container.module';

import { ConnectDevicePage } from './connect-device.page';

describe('ConnectDevicePage', () => {
  let component: ConnectDevicePage;
  let fixture: ComponentFixture<ConnectDevicePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ConnectDevicePage],
      imports: [IonicModule.forRoot(), ExploreContainerComponentModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ConnectDevicePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
