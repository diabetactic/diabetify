import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { AddReadingPage } from './add-reading.page';

describe('AddReadingPage', () => {
  let component: AddReadingPage;
  let fixture: ComponentFixture<AddReadingPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddReadingPage, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(AddReadingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
