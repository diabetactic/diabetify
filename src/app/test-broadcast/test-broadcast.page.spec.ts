import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestBroadcastPage } from './test-broadcast.page';

describe('TestBroadcastPage', () => {
  let component: TestBroadcastPage;
  let fixture: ComponentFixture<TestBroadcastPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TestBroadcastPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
