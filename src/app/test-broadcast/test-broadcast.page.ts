import { Component, OnInit, OnDestroy } from '@angular/core';
import { XdripService } from '../services/xdrip.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-test-broadcast',
  templateUrl: './test-broadcast.page.html',
  styleUrls: ['./test-broadcast.page.scss'],
})
export class TestBroadcastPage implements OnInit, OnDestroy {
  glucoseData: any[] = [];
  private updateInterval: Subscription | undefined;
  readonly fetchInterval = 10000; // Intervalo en milisegundos

  constructor(private xdripService: XdripService) {}

  ngOnInit() {
    this.fetchData();
    this.updateInterval = interval(this.fetchInterval).subscribe(() => this.fetchData());
  }

  ngOnDestroy() {
    this.updateInterval?.unsubscribe();
  }

  fetchData() {
    this.xdripService.getGlucoseData().subscribe({
      next: (data) => {
        console.log('Glucose data:', data);
        this.glucoseData = data.slice(0, 10); // Últimas 10 mediciones
      },
      error: (error) => {
        console.error('Error fetching glucose data:', error);
      }
    });
  }
}
