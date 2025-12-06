import { Component, CUSTOM_ELEMENTS_SCHEMA, ChangeDetectionStrategy } from '@angular/core';
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
import { AppIconComponent } from '../shared/components/app-icon/app-icon.component';

interface Tip {
  icon: string;
  title: string;
  description: string;
  category: 'glucose' | 'nutrition' | 'exercise' | 'medication';
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
export class TipsPage {
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
  ];

  getCategoryIcon(category: string): string {
    const icons: { [key: string]: string } = {
      glucose: 'analytics-outline',
      nutrition: 'nutrition-outline',
      exercise: 'fitness-outline',
      medication: 'medical-outline',
    };
    return icons[category] || 'information-circle-outline';
  }

  getCategoryColor(category: string): string {
    const colors: { [key: string]: string } = {
      glucose: 'primary',
      nutrition: 'success',
      exercise: 'warning',
      medication: 'danger',
    };
    return colors[category] || 'medium';
  }
}
