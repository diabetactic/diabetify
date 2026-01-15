import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  signal,
  CUSTOM_ELEMENTS_SCHEMA,
  ViewChild,
  ChangeDetectorRef,
  inject,
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
  IonRefresher,
  IonRefresherContent,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType, Chart } from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'hammerjs';
import { Subject, takeUntil } from 'rxjs';
import { ReadingsService } from '@services/readings.service';
import { LoggerService } from '@services/logger.service';
import { ThemeService } from '@services/theme.service';
import { PreferencesService } from '@services/preferences.service';
import { ReadingsMapperService } from '@services/readings-mapper.service';
import { GlucoseStatistics, LocalGlucoseReading, GlucoseUnit } from '@models/glucose-reading.model';
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
    IonRefresher,
    IonRefresherContent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class TrendsPage implements OnInit, OnDestroy {
  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;

  private readonly destroy$ = new Subject<void>();
  private readonly themeService = inject(ThemeService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly preferencesService = inject(PreferencesService);
  private readonly mapper = inject(ReadingsMapperService);

  selectedPeriod = signal<'week' | 'month' | 'all'>('week');
  statistics = signal<GlucoseStatistics | null>(null);
  loading = signal(true);
  preferredUnit = signal<GlucoseUnit>('mg/dL');
  isDarkMode = signal(false);

  // Chart color configuration for light/dark modes
  private readonly chartColors = {
    light: {
      primary: '#3880ff',
      primaryBg: 'rgba(56, 128, 255, 0.2)',
      text: '#1f2937',
      grid: 'rgba(0, 0, 0, 0.1)',
      border: 'rgba(0, 0, 0, 0.1)',
    },
    dark: {
      primary: '#6ea8fe',
      primaryBg: 'rgba(110, 168, 254, 0.2)',
      text: '#e5e7eb',
      grid: 'rgba(255, 255, 255, 0.1)',
      border: 'rgba(255, 255, 255, 0.1)',
    },
  };

  public lineChartData: ChartData<'line'> = {
    datasets: [
      {
        data: [],
        label: 'Glucose Readings',
        borderColor: this.chartColors.light.primary,
        backgroundColor: this.chartColors.light.primaryBg,
        fill: true,
      },
    ],
    labels: [],
  };
  public lineChartType: ChartType = 'line';
  public lineChartOptions: ChartConfiguration['options'] = this.getChartOptions(false);

  constructor(
    private readingsService: ReadingsService,
    private logger: LoggerService
  ) {
    Chart.register(zoomPlugin);
  }

  private getChartOptions(isDark: boolean): ChartConfiguration['options'] {
    const colors = isDark ? this.chartColors.dark : this.chartColors.light;
    return {
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
            color: colors.text,
          },
          ticks: {
            color: colors.text,
          },
          grid: {
            color: colors.grid,
          },
          border: {
            color: colors.border,
          },
        },
        y: {
          title: {
            display: true,
            text: `Glucose (${this.preferredUnit()})`,
            color: colors.text,
          },
          ticks: {
            color: colors.text,
          },
          grid: {
            color: colors.grid,
          },
          border: {
            color: colors.border,
          },
        },
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            color: colors.text,
          },
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
  }

  async ngOnInit(): Promise<void> {
    // Subscribe to preferences to get user's preferred glucose unit
    this.preferencesService
      .getPreferences()
      .pipe(takeUntil(this.destroy$))
      .subscribe(prefs => {
        this.preferredUnit.set(prefs.glucoseUnit);
        // Update chart options when unit changes
        this.lineChartOptions = this.getChartOptions(this.isDarkMode());
        this.cdr.markForCheck();
      });

    // Subscribe to theme changes
    this.themeService.isDark$.pipe(takeUntil(this.destroy$)).subscribe(isDark => {
      this.isDarkMode.set(isDark);
      this.lineChartOptions = this.getChartOptions(isDark);
      this.updateChartColors(isDark);
      this.cdr.markForCheck();
    });

    await this.loadStatistics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateChartColors(isDark: boolean): void {
    const colors = isDark ? this.chartColors.dark : this.chartColors.light;
    if (this.lineChartData.datasets.length > 0) {
      this.lineChartData.datasets[0].borderColor = colors.primary;
      this.lineChartData.datasets[0].backgroundColor = colors.primaryBg;
      this.lineChartData.datasets[0].pointBackgroundColor = colors.primary;
    }
    this.chart?.update();
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
    const colors = this.isDarkMode() ? this.chartColors.dark : this.chartColors.light;
    const targetUnit = this.preferredUnit();

    if (readings && readings.length > 0) {
      const chartData = readings.map(reading => ({
        x: new Date(reading.time).getTime(),
        // Convert reading value to user's preferred unit for consistent display
        y: this.mapper.convertToUnit(reading.value, reading.units, targetUnit),
      }));

      this.lineChartData = {
        datasets: [
          {
            data: chartData,
            label: 'Glucose Level',
            borderColor: colors.primary,
            backgroundColor: colors.primaryBg,
            fill: true,
            pointRadius: 3,
            pointBackgroundColor: colors.primary,
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
