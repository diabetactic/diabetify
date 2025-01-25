import { Component, OnInit, OnDestroy } from '@angular/core';
import { Chart, ChartConfiguration, ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { format, subDays, addDays, startOfDay, endOfDay, getHours, startOfHour, setHours } from 'date-fns';
import annotationPlugin from 'chartjs-plugin-annotation';
import { XdripService } from 'src/app/services/xdrip.service';
import { Subscription, interval } from 'rxjs';

Chart.register(annotationPlugin);

@Component({
  selector: 'app-glucose-readings',
  templateUrl: './glucose-readings.page.html',
  styleUrls: ['./glucose-readings.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, BaseChartDirective],
})
export class GlucoseReadingsPage implements OnInit, OnDestroy {
  private glucoseDataSubscription: Subscription | null = null;
  private readonly localStorageKey = 'glucoseReadings';
  public selectedPeriod: '24h' | '3d' | '7d' = '24h';
  public selectedTab: 'chart' | 'manual' = 'chart';
  public stats: {
    max: number | null;
    min: number | null;
    avg: number | null;
  } = {
    max: 0,
    min: 0,
    avg: 0
  };
  allReadings: any[] = [];
  filteredReadings: any[] = [];
  manualReadings: any[] = [];
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

  constructor(private xdripService: XdripService) {}

  ngOnInit() {
    // Cargar las lecturas desde el LocalStorage al inicio
    this.loadReadingsFromLocalStorage();

    // Obtener datos y configurar la actualización periódica
    this.getGlucoseData();
    this.glucoseDataSubscription = interval(6000).subscribe(() => this.getGlucoseData());
  }

  ngOnDestroy() {
    if (this.glucoseDataSubscription) {
      this.glucoseDataSubscription.unsubscribe();
    }
  }

  getGlucoseData() {
    this.xdripService.getGlucoseData().subscribe({
      next: (newReadings) => {
        this.updateLocalData(newReadings);
        this.setPeriodDates();
        this.updateChartData();
      },
      error: (error) => {
        console.error('Error al obtener datos de glucosa:', error);
        // Manejar el error, por ejemplo, mostrar un mensaje al usuario
      }
    });
  }

  private updateLocalData(newReadings: any[]) {
    // Cargar las lecturas actuales del LocalStorage
    console.log('Nuevas lecturas:', JSON.stringify(newReadings));
    let currentReadings: any[] = [];
    const readingsString = localStorage.getItem(this.localStorageKey);
    if (readingsString) {
      currentReadings = JSON.parse(readingsString);
    }

    // Asumiendo que cada objeto en newReadings tiene un campo '_id' único y 'date' para timestamp
    const updatedReadings = this.mergeReadings(currentReadings, newReadings);
    console.log('Lecturas combinadas:', JSON.stringify(updatedReadings));

    // Guardar las lecturas actualizadas en el LocalStorage
    this.saveReadingsToLocalStorage(updatedReadings);

    // Actualizar allReadings con las lecturas combinadas
    this.allReadings = updatedReadings;
  }
  
  private mergeReadings(currentReadings: any[], newReadings: any[]): any[] {
    const readingsMap = new Map(currentReadings.map(reading => [reading._id, reading]));
  
    newReadings.forEach(newReading => {
      if (!readingsMap.has(newReading._id)) {
        readingsMap.set(newReading._id, newReading);
      } else {
        const existingReading = readingsMap.get(newReading._id);
  
        if (new Date(newReading.date) > new Date(existingReading.date)) {
          readingsMap.set(newReading._id, newReading);
        }
      }
    });
  
    return Array.from(readingsMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
  

  private saveReadingsToLocalStorage(readings: any[]) {
    localStorage.setItem(this.localStorageKey, JSON.stringify(readings));
  }

  private loadReadingsFromLocalStorage() {
    const readingsString = localStorage.getItem(this.localStorageKey);
    if (readingsString) {
      this.allReadings = JSON.parse(readingsString);
      console.log('Lecturas cargadas:', JSON.stringify(this.allReadings));
      this.setPeriodDates();
      this.updateChartData();
    }
  }

  updateChartData() {
    if (!this.allReadings?.length) {
      this.stats = { max: null, min: null, avg: null };
      this.lineChartData = { ...this.lineChartData, labels: [], datasets: [{ ...this.lineChartData.datasets[0], data: [] }] };
      this.filteredReadings = [];
      return;
    }
  
    this.filteredReadings = this.allReadings.filter(reading => {
      const readingDate = new Date(reading.timestamp);
      return readingDate >= this.periodStart && readingDate <= this.periodEnd;
    });
  
    if (this.filteredReadings.length === 0) {
        this.stats = { max: null, min: null, avg: null };
        this.lineChartData = { ...this.lineChartData, labels: [], datasets: [{ ...this.lineChartData.datasets[0], data: [] }] };
        return;
    }
  
    // Determinar si se deben agrupar las lecturas por hora
    const groupHourly = this.selectedPeriod === '7d';
  
    // Filtrar y/o agrupar las lecturas
    let chartReadings = [];
    if (groupHourly) {
      chartReadings = this.groupReadingsByHour(this.filteredReadings);
    } else {
      chartReadings = this.filterReadingsForChart(this.filteredReadings);
    }
  
    // Actualizar datos del gráfico
    const newLabels = chartReadings.map(reading => {
      if (groupHourly) {
        // Mostrar la fecha y la hora para las lecturas agrupadas por hora
        return format(new Date(reading.timestamp), 'dd/MM HH:mm');
      } else {
        // Mostrar solo la hora para las demás lecturas
        return format(new Date(reading.timestamp), 'HH:mm');
      }
    });
    const newData = chartReadings.map(reading => reading.glucoseConcentration);
  
    this.lineChartData = { ...this.lineChartData, labels: newLabels, datasets: [{ ...this.lineChartData.datasets[0], data: newData }] };
  
    // Calcular estadísticas
    this.stats = {
      max: Math.max(...this.filteredReadings.map(r => r.glucoseConcentration)),
      min: Math.min(...this.filteredReadings.map(r => r.glucoseConcentration)),
      avg: Math.round(this.filteredReadings.reduce((acc, curr) =>
        acc + curr.glucoseConcentration, 0) / this.filteredReadings.length)
    };
  }

  filterReadingsForChart(readings: any[]): any[] {
    // Determinar la frecuencia de muestreo según el período seleccionado
    const sampleFrequency = this.selectedPeriod === '24h' ? 2 :
                            this.selectedPeriod === '3d' ? 6 :
                            this.selectedPeriod === '7d' ? 12 : 1;
  
    return readings.filter((reading, index) => index % sampleFrequency === 0);
  }

  groupReadingsByHour(readings: any[]): any[] {
    const groupedReadings: { [key: string]: any[] } = {};

    readings.forEach(reading => {
      const threeHourBlock = Math.floor(getHours(new Date(reading.timestamp)) / 3); // Dividimos las horas en bloques de 3
      const timestamp = startOfHour(new Date(reading.timestamp));
      const threeHourTimestamp = setHours(timestamp, threeHourBlock * 3); // Redondeamos a la hora de inicio del bloque de 3 horas
      const hourKey = format(threeHourTimestamp, 'yyyy-MM-dd HH:mm'); // Usamos la hora de inicio del bloque como clave

      if (!groupedReadings[hourKey]) {
        groupedReadings[hourKey] = [];
      }

      groupedReadings[hourKey].push(reading);
    });

    const averagedReadings = Object.keys(groupedReadings).map(hourKey => {
      const readingsInHour = groupedReadings[hourKey];
      const sum = readingsInHour.reduce((acc, curr) => acc + curr.glucoseConcentration, 0);
      const avg = Math.round(sum / readingsInHour.length);

      return {
        timestamp: new Date(hourKey),
        glucoseConcentration: avg,
        unit: 'mg/dL',
      };
    });

    return averagedReadings;
  }

  changePeriod(period: any) {
    if (period === '24h' || period === '3d' || period === '7d') {
      this.selectedPeriod = period;
      this.setPeriodDates();
      this.updateChartData();
    }
  }

  previousPeriod() {
    let newPeriodStart: Date;
    let newPeriodEnd: Date;
  
    if (this.selectedPeriod === '24h') {
      newPeriodStart = subDays(this.periodStart, 1);
      newPeriodEnd = subDays(this.periodEnd, 1);
    } else if (this.selectedPeriod === '3d') {
      newPeriodStart = subDays(this.periodStart, 3);
      newPeriodEnd = subDays(this.periodEnd, 3);
    } else { // 7d
      newPeriodStart = subDays(this.periodStart, 7);
      newPeriodEnd = subDays(this.periodEnd, 7);
    }
  
    // Verificar si hay lecturas antes de la nueva fecha de inicio
    const hasReadingsBefore = this.allReadings.some(reading =>
      new Date(reading.timestamp) < newPeriodStart
    );
  
    if (hasReadingsBefore) {
      this.periodStart = newPeriodStart;
      this.periodEnd = newPeriodEnd;
      this.updateChartData();
    }
  }
  
  nextPeriod() {
    let newPeriodStart: Date;
    let newPeriodEnd: Date;
  
    if (this.selectedPeriod === '24h') {
      newPeriodStart = addDays(this.periodStart, 1);
      newPeriodEnd = addDays(this.periodEnd, 1);
    } else if (this.selectedPeriod === '3d') {
      newPeriodStart = addDays(this.periodStart, 3);
      newPeriodEnd = addDays(this.periodEnd, 3);
    } else { // 7d
      newPeriodStart = addDays(this.periodStart, 7);
      newPeriodEnd = addDays(this.periodEnd, 7);
    }
  
    // Verificar si la nueva fecha de fin está en el futuro
    const isFuture = newPeriodEnd > new Date();
  
    if (!isFuture) {
      this.periodStart = newPeriodStart;
      this.periodEnd = newPeriodEnd;
      this.updateChartData();
    }
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
      case 'sgv': return 'Sensor';
      default: return type;
    }
  }
}
