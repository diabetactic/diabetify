import { Component, OnInit } from '@angular/core';
import { Chart, ChartConfiguration, ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { format, subDays, addDays, startOfDay, endOfDay, addMinutes, getHours, startOfHour, setHours } from 'date-fns';
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

  generateGlucoseReadings(days = 14) {
    const readingsPerDay = 24 * 4; // Lecturas cada 15 minutos
    const readings = [];
    const events = [];
    const baselineGlucose = 95;
  
    // Funciones auxiliares para calcular efectos
    function getMealEffect(timeDiff: number, intensity: number) {
      const peakTime = 45;
      const duration = 180;
      if (timeDiff > duration) return 0;
      return intensity * 80 * Math.exp(-Math.pow(timeDiff - peakTime, 2) / (2 * Math.pow(duration/3, 2)));
    }
  
    function getInsulinEffect(timeDiff: number, intensity: number) {
      const peakTime = 75;
      const duration = 240;
      if (timeDiff > duration) return 0;
      return intensity * 70 * Math.exp(-Math.pow(timeDiff - peakTime, 2) / (2 * Math.pow(duration/3, 2)));
    }
  
    function getExerciseEffect(timeDiff: number, intensity: number) {
      const duration = 120;
      if (timeDiff > duration) return 0;
      return intensity * 30 * Math.exp(-timeDiff / duration);
    }
  
    // Generar eventos para todos los días
    for (let day = 0; day < days; day++) {
      const date = new Date();
      date.setDate(date.getDate() - days + day);
      date.setHours(0, 0, 0, 0);
  
      // 4 comidas al día con horarios semi-aleatorios
      const meals = [
        { hour: 7 + Math.random() * 1.5, intensity: 0.7 },  // Desayuno
        { hour: 12 + Math.random() * 1.5, intensity: 1 },   // Almuerzo
        { hour: 16 + Math.random(), intensity: 0.4 },       // Merienda
        { hour: 20 + Math.random() * 1.5, intensity: 0.8 }  // Cena
      ];
  
      // Agregar comidas y su insulina correspondiente
      meals.forEach(meal => {
        const mealTime = new Date(date);
        mealTime.setHours(Math.floor(meal.hour), (meal.hour % 1) * 60, 0, 0);
        
        events.push({
          type: 'meal',
          time: mealTime,
          intensity: meal.intensity
        });
  
        // Insulina 15 minutos después
        const insulinTime = new Date(mealTime.getTime() + 15 * 60 * 1000);
        events.push({
          type: 'insulin',
          time: insulinTime,
          intensity: meal.intensity * 0.9
        });
      });
  
      // 50% de probabilidad de ejercicio
      if (Math.random() > 0.5) {
        const exerciseHour = 18 + Math.random();
        const exerciseTime = new Date(date);
        exerciseTime.setHours(Math.floor(exerciseHour), (exerciseHour % 1) * 60, 0, 0);
        
        events.push({
          type: 'exercise',
          time: exerciseTime,
          intensity: 0.6
        });
      }
    }
  
    // Generar lecturas
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
  
    for (let i = 0; i < days * readingsPerDay; i++) {
      const currentTime = new Date(startDate.getTime() + i * 15 * 60 * 1000);
      let glucose = baselineGlucose;
  
      // Calcular efecto de cada evento
      events.forEach(event => {
        const timeDiffMinutes = (currentTime.getTime() - event.time.getTime()) / (1000 * 60);
        
        if (timeDiffMinutes >= 0) {
          switch (event.type) {
            case 'meal':
              glucose += getMealEffect(timeDiffMinutes, event.intensity);
              break;
            case 'insulin':
              glucose -= getInsulinEffect(timeDiffMinutes, event.intensity);
              break;
            case 'exercise':
              glucose -= getExerciseEffect(timeDiffMinutes, event.intensity);
              break;
          }
        }
      });
  
      // Pequeña variación suave
      glucose += Math.sin(currentTime.getTime() / 5000) * 3;
  
      // Mantener en rango seguro
      glucose = Math.max(65, Math.min(200, glucose));
  
      readings.push({
        glucoseConcentration: Math.round(glucose),
        timestamp: currentTime,
        unit: 'mg/dL'
      });
    }
  
    return readings;
  }

  constructor() {}

  ngOnInit() {
    this.allReadings = this.generateGlucoseReadings();

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
      case 'pre-meal': return 'Antes de comer';
      case 'post-meal': return 'Después de comer';
      case 'pre-exercise': return 'Antes de ejercicio';
      case 'post-exercise': return 'Después de ejercicio';
      default: return type;
    }
  }
}
