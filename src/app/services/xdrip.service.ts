import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class XdripService {
  private readonly baseUrl = 'http://127.0.0.1:17580';
  private readonly endpoint = `${this.baseUrl}/sgv.json`;
  // private readonly apiSecretHash = 'f7c3bc1d808e04732adf679965ccc34ca7ae3441'; // Hash SHA-1 de tu contraseña

  constructor(private http: HttpClient) {}

  getGlucoseData(): Observable<any[]> {
    // const headers = new HttpHeaders({
    //   'api-secret': this.apiSecretHash,
    // });
    return this.http.get<any[]>(this.endpoint).pipe(
      map(readings => readings.map(reading => ({
        glucoseConcentration: reading.sgv,
        timestamp: new Date(reading.dateString),
        unit: reading.units_hint || 'mg/dL',
        type: reading.type,
        direction: reading.direction
      })))
    );
  }
}