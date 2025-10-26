import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ReadingItemComponent } from './reading-item.component';

describe('ReadingItemComponent', () => {
  let component: ReadingItemComponent;
  let fixture: ComponentFixture<ReadingItemComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ReadingItemComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ReadingItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
