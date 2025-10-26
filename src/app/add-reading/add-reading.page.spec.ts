import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddReadingPage } from './add-reading.page';

describe('AddReadingPage', () => {
  let component: AddReadingPage;
  let fixture: ComponentFixture<AddReadingPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AddReadingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
