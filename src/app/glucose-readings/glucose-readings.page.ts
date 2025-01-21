import { Component, OnInit } from '@angular/core';
import { Chart, ChartConfiguration, ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { format, subDays, addDays, startOfDay, endOfDay } from 'date-fns';
import annotationPlugin from 'chartjs-plugin-annotation';

Chart.register(annotationPlugin);

@Component({
  selector: 'app-glucose-readings',
  templateUrl: './glucose-readings.page.html',
  styleUrls: ['./glucose-readings.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, BaseChartDirective],
})
export class GlucoseReadingsPage implements OnInit {
  public selectedPeriod: '24h' | '3d' | '7d' = '24h';
  public selectedTab: 'chart' | 'manual' = 'chart';
  public stats = {
    max: 0,
    min: 0,
    avg: 0
  };
  allReadings: any[] = [];
  filteredReadings: any[] = [];
  manualReadings: any[] = []; // Placeholder para mediciones manuales
  periodStart: Date = new Date();
  periodEnd: Date = new Date();

  public lineChartData: ChartConfiguration<'line'>['data'] = {
    datasets: [
      {
        data: [],
        label: 'Nivel de Glucosa',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderColor: 'rgb(16, 185, 129)',
        pointBackgroundColor: 'rgb(16, 185, 129)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(16, 185, 129)',
        fill: 'origin',
      }
    ],
    labels: []
  };

  public lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: 40,
        max: 200,
        grid: {
          color: 'rgba(0,0,0,0.05)'
        },
        ticks: {
          color: '#666'
        }
      },
      x: {
        grid: {
          color: 'rgba(0,0,0,0.05)'
        },
        ticks: {
          color: '#666'
        }
      }
    },
    plugins: {
      legend: {
        display: true,
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'white',
        titleColor: '#666',
        bodyColor: '#666',
        borderColor: '#ddd',
        borderWidth: 1,
        padding: 10,
        usePointStyle: true,
        callbacks: {
          label: (context) => {
            const reading = this.filteredReadings[context.dataIndex];
            let label = `Glucosa: ${context.parsed.y} mg/dL`;
            if (reading?.type) {
              label += `\nTipo: ${this.getReadingTypeString(reading.type)}`;
            }
            return label;
          }
        }
      },
      annotation: {
        annotations: {
          highLine: {
            type: 'line',
            yMin: 180,
            yMax: 180,
            borderColor: '#ef4444',
            borderDash: [3, 3],
            label: {
              content: 'Límite Alto (180 mg/dL)',
              display: true
            }
          },
          lowLine: {
            type: 'line',
            yMin: 70,
            yMax: 70,
            borderColor: '#ef4444',
            borderDash: [3, 3],
            label: {
              content: 'Límite Bajo (70 mg/dL)',
              display: true
            }
          }
        }
      }
    }
  };

  constructor() {}

  ngOnInit() {
    const now = new Date();
    this.allReadings = [
      {
        glucoseConcentration: 120,
        timestamp: now,
        unit: 'mg/dL',
        type: 'pre-meal'
      },
      {
        glucoseConcentration: 140,
        timestamp: new Date(now.getTime() - 3600000), // 1 hora antes
        unit: 'mg/dL',
        type: 'post-meal'
      },
      {
        glucoseConcentration: 65,
        timestamp: new Date(now.getTime() - 7200000), // 2 horas antes
        unit: 'mg/dL',
        type: 'pre-exercise'
      },
      {
        glucoseConcentration: 185,
        timestamp: new Date(now.getTime() - 10800000), // 3 horas antes
        unit: 'mg/dL',
        type: 'post-meal'
      },
      {
        glucoseConcentration: 110,
        timestamp: new Date(now.getTime() - 14400000), // 4 horas antes
        unit: 'mg/dL',
        type: 'pre-meal'
      },
      // Agregar algunas lecturas para los días anteriores
      {
        glucoseConcentration: 95,
        timestamp: subDays(now, 1),
        unit: 'mg/dL',
        type: 'pre-meal'
      },
      {
        glucoseConcentration: 130,
        timestamp: subDays(now, 2),
        unit: 'mg/dL',
        type: 'post-meal'
      },
      {
        glucoseConcentration: 78,
        timestamp: subDays(now, 3),
        unit: 'mg/dL',
        type: 'pre-exercise'
      },
      {
        glucoseConcentration: 160,
        timestamp: subDays(now, 4),
        unit: 'mg/dL',
        type: 'post-meal'
      },
      {
        glucoseConcentration: 105,
        timestamp: subDays(now, 5),
        unit: 'mg/dL',
        type: 'pre-meal'
      },
      {
        glucoseConcentration: 88,
        timestamp: subDays(now, 6),
        unit: 'mg/dL',
        type: 'pre-exercise'
      },
      {
        glucoseConcentration: 175,
        timestamp: subDays(now, 7),
        unit: 'mg/dL',
        type: 'post-meal'
      }
    ];
    // Placeholder de mediciones manuales
    this.manualReadings = [
      {
        glucoseConcentration: 95,
        timestamp: new Date(),
        unit: 'mg/dL'
      },
      {
        glucoseConcentration: 110,
        timestamp: subDays(new Date(), 2),
        unit: 'mg/dL'
      }
    ];
    this.setPeriodDates();
    this.updateChartData();
  }

  updateChartData() {
    if (!this.allReadings?.length) return;

    this.filteredReadings = this.allReadings.filter(reading => {
      const readingDate = new Date(reading.timestamp);
      return readingDate >= this.periodStart && readingDate <= this.periodEnd;
    });

    // Actualizar datos del gráfico
    this.lineChartData.labels = this.filteredReadings.map(reading => 
      format(new Date(reading.timestamp), 'HH:mm')
    );
    this.lineChartData.datasets[0].data = this.filteredReadings.map(reading => 
      reading.glucoseConcentration
    );

    // Calcular estadísticas
    this.stats = {
      max: Math.max(...this.filteredReadings.map(r => r.glucoseConcentration)),
      min: Math.min(...this.filteredReadings.map(r => r.glucoseConcentration)),
      avg: Math.round(this.filteredReadings.reduce((acc, curr) => 
        acc + curr.glucoseConcentration, 0) / this.filteredReadings.length)
    };
  }

  changePeriod(period: any) {
    if (period === '24h' || period === '3d' || period === '7d') {
      this.selectedPeriod = period;
      this.setPeriodDates();
      this.updateChartData();
    }
  }

  previousPeriod() {
    if (this.selectedPeriod === '24h') {
      this.periodStart = subDays(this.periodStart, 1);
      this.periodEnd = subDays(this.periodEnd, 1);
    } else if (this.selectedPeriod === '3d') {
      this.periodStart = subDays(this.periodStart, 3);
      this.periodEnd = subDays(this.periodEnd, 3);
    } else if (this.selectedPeriod === '7d') {
      this.periodStart = subDays(this.periodStart, 7);
      this.periodEnd = subDays(this.periodEnd, 7);
    }
    this.updateChartData();
  }

  nextPeriod() {
    if (this.selectedPeriod === '24h') {
      this.periodStart = addDays(this.periodStart, 1);
      this.periodEnd = addDays(this.periodEnd, 1);
    } else if (this.selectedPeriod === '3d') {
      this.periodStart = addDays(this.periodStart, 3);
      this.periodEnd = addDays(this.periodEnd, 3);
    } else if (this.selectedPeriod === '7d') {
      this.periodStart = addDays(this.periodStart, 7);
      this.periodEnd = addDays(this.periodEnd, 7);
    }
    this.updateChartData();
  }

  setPeriodDates() {
    const now = new Date();
    if (this.selectedPeriod === '24h') {
      this.periodStart = subDays(now, 1);
      this.periodEnd = now;
    } else if (this.selectedPeriod === '3d') {
      this.periodStart = subDays(now, 3);
      this.periodEnd = now;
    } else {
      this.periodStart = subDays(now, 7);
      this.periodEnd = now;
    }
    this.periodStart = startOfDay(this.periodStart);
    this.periodEnd = endOfDay(this.periodEnd);
  }

  changeTab(tab: any) {
    this.selectedTab = tab;
  }

  addManualReading() {
    // Aquí se implementará la lógica para agregar una medición manual
    console.log('Agregar medición manual');
  }

  // Agregar las funciones que faltan
  getReadingColor(value: number): string {
    if (value < 70) return 'danger';
    if (value > 180) return 'warning';
    return 'success';
  }

  getReadingEmoji(value: number): string {
    if (value < 70) return '🔴';
    if (value > 180) return '🟠';
    return '🟢';
  }

  getReadingTypeString(type: string): string {
    switch(type) {
      case 'pre-meal': return 'Antes de comer';
      case 'post-meal': return 'Después de comer';
      case 'pre-exercise': return 'Antes de ejercicio';
      case 'post-exercise': return 'Después de ejercicio';
      default: return type;
    }
  }
}
