// Initialize TestBed environment for Vitest
import '../../../../test-setup';

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileItemComponent } from './profile-item.component';

describe('ProfileItemComponent', () => {
  let component: ProfileItemComponent;
  let fixture: ComponentFixture<ProfileItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileItemComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
