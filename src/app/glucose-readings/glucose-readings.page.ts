import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-glucose-readings',
  templateUrl: 'glucose-readings.page.html',
  styleUrls: ['glucose-readings.page.scss']
})
export class GlucoseReadingsPage implements OnInit {
  allReadings: any[] = [];

  ngOnInit() {
    this.loadReadings();
  }

  loadReadings() {
    // Datos ficticios
     this.allReadings = [
      {
        glucoseConcentration: 85,
        unit: 'mg/dL',
        timestamp: new Date(),
        type: 1,
      },
      {
        glucoseConcentration: 65,
        unit: 'mg/dL',
        timestamp: new Date(Date.now() - 3600 * 1000),
        type: 1,
      },
      {
        glucoseConcentration: 190,
        unit: 'mg/dL',
        timestamp: new Date(Date.now() - 2 * 3600 * 1000),
        type: 1,
      },
    ];
  }

  getReadingTypeString(type: number): string {
    // Retorna una cadena que describe el tipo de lectura, data fake por ahora
    const types = [
      'Reservado',
      'Sangre capilar total',
      'Plasma capilar',
      'Sangre venosa total',
      'Plasma venoso',
      'Sangre arterial total',
      'Plasma arterial',
      'Sangre total no determinada',
      'Plasma no determinado',
      'Fluido intersticial',
      'Solución de control'
    ];
    return types[type] || 'Desconocido';
  }

  getReadingColor(value: number): string {
    if (value < 70) {
      return 'danger'; // Bajo
    } else if (value > 180) {
      return 'warning'; // Alto
    } else {
      return 'success'; // Normal
    }
  }

  getReadingEmoji(value: number): string {
    if (value < 70) {
      return '🔴';
    } else if (value > 180) {
      return '🟠';
    } else {
      return '🟢';
    }
  }
}
