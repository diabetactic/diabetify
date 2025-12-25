import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  signal,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { ReadingsService } from '@services/readings.service';
import { LoggerService } from '@services/logger.service';
import { GlucoseStatistics } from '@models/glucose-reading.model';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-trends',
  templateUrl: './trends.page.html',
  styleUrls: ['./trends.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonSpinner,
    TranslateModule,
    BaseChartDirective,
    AppIconComponent,
    IonRefresher,
    IonRefresherContent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class TrendsPage implements OnInit {
  selectedPeriod = signal<'week' | 'month' | 'all'>('week');
  statistics = signal<GlucoseStatistics | null>(null);
  loading = signal(true);

  // Time in range donut chart configuration
  public doughnutChartLabels: string[] = [];
  public doughnutChartData: ChartData<'doughnut'> = {
    labels: this.doughnutChartLabels,
    datasets: [
      {
        data: [0, 0, 0],
        backgroundColor: ['#22c55e', '#fbbf24', '#ef4444'],
        hoverBackgroundColor: ['#16a34a', '#f59e0b', '#dc2626'],
        borderWidth: 0,
      },
    ],
  };
  public doughnutChartType: ChartType = 'doughnut';
  public doughnutChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          color: 'rgba(255, 255, 255, 0.87)',
          font: {
            size: 12,
          },
          padding: 15,
        },
      },
      tooltip: {
        callbacks: {
          label: context => {
            const label = context.label || '';
            const value = context.parsed || 0;
            return `${label}: ${value.toFixed(1)}%`;
          },
        },
      },
    },
  };

  constructor(
    private readingsService: ReadingsService,
    private logger: LoggerService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadStatistics();
  }

  async onPeriodChange(event: CustomEvent) {
    const period = event.detail.value as 'week' | 'month' | 'all';
    if (period) {
      this.selectedPeriod.set(period);
      await this.loadStatistics();
    }
  }

  private async loadStatistics() {
    this.loading.set(true);
    try {
      const stats = await this.readingsService.getStatistics(this.selectedPeriod());
      this.statistics.set(stats);
      this.updateChart(stats);
    } catch (error) {
      this.logger.error('TrendsPage', 'Failed to load statistics', error);
    } finally {
      this.loading.set(false);
    }
  }

  private updateChart(stats: GlucoseStatistics) {
    this.doughnutChartData = {
      labels: ['In Range', 'Above Range', 'Below Range'],
      datasets: [
        {
          data: [stats.timeInRange, stats.timeAboveRange, stats.timeBelowRange],
          backgroundColor: ['#22c55e', '#fbbf24', '#ef4444'],
          hoverBackgroundColor: ['#16a34a', '#f59e0b', '#dc2626'],
          borderWidth: 0,
        },
      ],
    };
  }

  async handleRefresh(event: CustomEvent) {
    await this.loadStatistics();
    (event.target as HTMLIonRefresherElement).complete();
  }
}
