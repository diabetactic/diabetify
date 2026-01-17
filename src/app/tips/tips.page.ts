import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';

interface Tip {
  icon: string;
  title: string;
  description: string;
  category: 'glucose' | 'nutrition' | 'exercise' | 'medication' | 'wellness' | 'safety';
}

@Component({
  selector: 'app-tips',
  templateUrl: './tips.page.html',
  styleUrls: ['./tips.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TranslateModule,
    // Ionic standalone components
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonCard,
    IonCardContent,
    // App components
    AppIconComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class TipsPage implements AfterViewInit {
  constructor(private cdr: ChangeDetectorRef) {}
  tips: Tip[] = [
    {
      icon: 'water-outline',
      title: 'tips.hydration.title',
      description: 'tips.hydration.description',
      category: 'glucose',
    },
    {
      icon: 'restaurant-outline',
      title: 'tips.meals.title',
      description: 'tips.meals.description',
      category: 'nutrition',
    },
    {
      icon: 'walk-outline',
      title: 'tips.exercise.title',
      description: 'tips.exercise.description',
      category: 'exercise',
    },
    {
      icon: 'time-outline',
      title: 'tips.monitoring.title',
      description: 'tips.monitoring.description',
      category: 'glucose',
    },
    {
      icon: 'medical-outline',
      title: 'tips.medication.title',
      description: 'tips.medication.description',
      category: 'medication',
    },
    {
      icon: 'moon-outline',
      title: 'tips.sleep.title',
      description: 'tips.sleep.description',
      category: 'glucose',
    },
    {
      icon: 'happy-outline',
      title: 'tips.stress.title',
      description: 'tips.stress.description',
      category: 'wellness',
    },
    {
      icon: 'footsteps-outline',
      title: 'tips.footcare.title',
      description: 'tips.footcare.description',
      category: 'wellness',
    },
    {
      icon: 'warning-outline',
      title: 'tips.emergency.title',
      description: 'tips.emergency.description',
      category: 'safety',
    },
    {
      icon: 'people-outline',
      title: 'tips.support.title',
      description: 'tips.support.description',
      category: 'safety',
    },
  ];

  getCategoryColorClass(category: string): string {
    const colors: { [key: string]: string } = {
      glucose: 'text-primary',
      nutrition: 'text-success',
      exercise: 'text-warning',
      medication: 'text-danger',
      wellness: 'text-tertiary',
      safety: 'text-secondary',
    };
    return colors[category] || 'text-medium';
  }

  getCategoryBgClass(category: string): string {
    const colors: { [key: string]: string } = {
      glucose: 'bg-primary/10',
      nutrition: 'bg-success/10',
      exercise: 'bg-warning/10',
      medication: 'bg-danger/10',
      wellness: 'bg-tertiary/10',
      safety: 'bg-secondary/10',
    };
    return colors[category] || 'bg-medium/10';
  }

  // trackBy function for tips ngFor
  trackByTip(_index: number, tip: Tip): string {
    return tip.title;
  }

  ngAfterViewInit() {
    this.cdr.detectChanges();
  }
}
