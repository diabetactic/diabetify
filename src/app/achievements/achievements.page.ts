import {
  Component,
  OnInit,
  OnDestroy,
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonBackButton,
  IonButtons,
  IonRefresher,
  IonRefresherContent,
  IonProgressBar,
  IonSpinner,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AchievementsService } from '../core/services/achievements.service';
import { TranslationService } from '../core/services/translation.service';
import { Achievement, StreakData, getAchievementProgress } from '../core/models/achievements.model';
import { AppIconComponent } from '../shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-achievements',
  templateUrl: './achievements.page.html',
  styleUrls: ['./achievements.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    TranslateModule,
    AppIconComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonBackButton,
    IonButtons,
    IonRefresher,
    IonRefresherContent,
    IonProgressBar,
    IonSpinner,
  ],
})
export class AchievementsPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  streak: StreakData | null = null;
  achievements: Achievement[] = [];
  isLoading = true;
  error: string | null = null;

  /** Daily measurements progress (0-4 for the day) */
  dailyMeasurements = 0;
  dailyTarget = 4;

  constructor(
    private achievementsService: AchievementsService,
    private translationService: TranslationService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadData(forceRefresh = false): Promise<void> {
    this.isLoading = true;
    this.error = null;
    this.cdr.markForCheck();

    try {
      const result = await this.achievementsService.fetchAll(forceRefresh);
      this.streak = result.streak;
      this.achievements = result.achievements;
      this.dailyMeasurements = result.streak?.four_times_today ?? 0;
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  async handleRefresh(event: CustomEvent): Promise<void> {
    await this.loadData(true);
    (event.target as HTMLIonRefresherElement).complete();
  }

  goBack(): void {
    this.router.navigate(['/tabs/profile']);
  }

  getAchievementProgress(achievement: Achievement): number {
    return getAchievementProgress(achievement);
  }

  getAchievementIcon(achievement: Achievement): string {
    if (achievement.got) {
      return 'trophy';
    }
    switch (achievement.attribute) {
      case 'times_measured':
        return 'water-outline';
      case 'max_streak':
        return 'flame-outline';
      default:
        return 'ribbon-outline';
    }
  }

  getAchievementColor(achievement: Achievement): string {
    if (achievement.got) {
      return 'text-amber-500'; // Gold for earned
    }
    const progress = this.getAchievementProgress(achievement);
    if (progress >= 75) return 'text-green-500';
    if (progress >= 50) return 'text-blue-500';
    if (progress >= 25) return 'text-orange-500';
    return 'text-gray-400';
  }

  getProgressBarColor(achievement: Achievement): string {
    if (achievement.got) return 'success';
    const progress = this.getAchievementProgress(achievement);
    if (progress >= 75) return 'success';
    if (progress >= 50) return 'primary';
    if (progress >= 25) return 'warning';
    return 'medium';
  }

  getDailyProgress(): number {
    return (this.dailyMeasurements / this.dailyTarget) * 100;
  }

  getStreakFireIcon(): string {
    const streak = this.streak?.streak ?? 0;
    if (streak >= 30) return 'flame'; // Solid flame for 30+ days
    if (streak >= 7) return 'flame'; // Solid flame for 7+ days
    return 'flame-outline'; // Outline for less
  }

  getStreakFireColor(): string {
    const streak = this.streak?.streak ?? 0;
    if (streak >= 30) return 'text-red-500';
    if (streak >= 7) return 'text-orange-500';
    if (streak >= 1) return 'text-amber-500';
    return 'text-gray-400';
  }

  getEarnedCount(): number {
    return this.achievements.filter(a => a.got).length;
  }

  getTotalCount(): number {
    return this.achievements.length;
  }

  trackByAchievement(_index: number, achievement: Achievement): number {
    return achievement.ach_id;
  }
}
