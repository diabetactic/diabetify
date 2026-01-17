import '../../../test-setup';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfileFormComponent } from './profile-form.component';
import { TranslateModule } from '@ngx-translate/core';
import { By } from '@angular/platform-browser';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';

describe('ProfileFormComponent', () => {
  let component: ProfileFormComponent;
  let fixture: ComponentFixture<ProfileFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileFormComponent, TranslateModule.forRoot(), AppIconComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should emit editDiabetesInfo when diabetes info card is clicked', () => {
    const spy = vi.spyOn(component.editDiabetesInfo, 'emit');
    
    // Find the diabetes info card
    // It currently doesn't have a specific test id or class distinguishing it easily other than position or content
    // I should add a test id in the implementation step.
    // For now, I'll try to find it by text or icon?
    // Or I'll just assume I'll add data-testid="diabetes-info-btn"
    
    const btn = fixture.debugElement.query(By.css('[data-testid="diabetes-info-btn"]'));
    
    // This will fail because the button doesn't exist/have the ID yet
    expect(btn).toBeTruthy();
    
    btn.nativeElement.click();
    expect(spy).toHaveBeenCalled();
  });
});
