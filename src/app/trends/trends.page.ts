import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  signal,
  CUSTOM_ELEMENTS_SCHEMA,
  ViewChild,
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
  IonButton,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType, Chart } from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'hammerjs';
import { ReadingsService } from '@services/readings.service';
import { LoggerService } from '@services/logger.service';
import { GlucoseStatistics, LocalGlucoseReading } from '@models/glucose-reading.model';
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
    IonButton,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class TrendsPage implements OnInit {
  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;

  selectedPeriod = signal<'week' | 'month' | 'all'>('week');
  statistics = signal<GlucoseStatistics | null>(null);
  loading = signal(true);

  public lineChartData: ChartData<'line'> = {
    datasets: [
      {
        data: [],
        label: 'Glucose Readings',
        borderColor: 'rgba(75,192,192,1)',
        backgroundColor: 'rgba(75,192,192,0.2)',
        fill: true,
      },
    ],
    labels: [],
  };
  public lineChartType: ChartType = 'line';
  public lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day',
        },
        title: {
          display: true,
          text: 'Date',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Glucose (mg/dL)',
        },
      },
    },
    plugins: {
      legend: {
        display: true,
      },
      zoom: {
        pan: {
          enabled: true,
          mode: 'x',
        },
        zoom: {
          pinch: {
            enabled: true,
          },
          wheel: {
            enabled: true,
          },
          mode: 'x',
        },
      },
    },
  };

  constructor(
    private readingsService: ReadingsService,
    private logger: LoggerService
  ) {
    Chart.register(zoomPlugin);
  }

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
      const endDate = new Date();
      let startDate: Date;
      switch (this.selectedPeriod()) {
        case 'week':
          startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'all':
        default:
          startDate = new Date(0);
          break;
      }
      const readings = await this.readingsService.getReadingsByDateRange(startDate, endDate);
      this.updateLineChart(readings);
    } catch (error) {
      this.logger.error('TrendsPage', 'Failed to load statistics', error);
    } finally {
      this.loading.set(false);
    }
  }

  private updateLineChart(readings: LocalGlucoseReading[]) {
    if (readings && readings.length > 0) {
      const chartData = readings.map(reading => ({
        x: new Date(reading.time).getTime(),
        y: reading.value,
      }));

      this.lineChartData = {
        datasets: [
          {
            data: chartData,
            label: 'Glucose Level',
            borderColor: '#3880ff',
            backgroundColor: 'rgba(56, 128, 255, 0.2)',
            fill: true,
            pointRadius: 3,
            pointBackgroundColor: '#3880ff',
          },
        ],
      };
    } else {
      this.lineChartData = {
        datasets: [],
        labels: [],
      };
    }
  }

  exportChart() {
    if (this.chart) {
      const image = this.chart.toBase64Image();
      if (image) {
        const a = document.createElement('a');
        a.href = image;
        a.download = 'trends.png';
        a.click();
      }
    }
  }

  async handleRefresh(event: CustomEvent) {
    await this.loadStatistics();
    (event.target as HTMLIonRefresherElement).complete();
  }
}
