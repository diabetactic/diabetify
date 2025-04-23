import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class XdripService {
  private readonly baseUrl = 'http://127.0.0.1:17580'; // O la IP de tu xDrip+
  private readonly endpoint = `${this.baseUrl}/sgv.json`;
  private readonly apiSecretHash = ''; //'f7c3bc1d808e04732adf679965ccc34ca7ae3441'; // Descomenta y pon tu hash aquí si usas api-secret

  constructor(private http: HttpClient) {}

  getGlucoseData(): Observable<any[]> {
    const headers = this.apiSecretHash
      ? new HttpHeaders({ 'api-secret': this.apiSecretHash })
      : new HttpHeaders(); // Si no hay apiSecretHash, envía headers vacíos

    return this.http.get<any[]>(this.endpoint, { headers }).pipe(
      map(readings => readings.map(reading => ({
        _id: reading._id, // Usar el _id que viene de xDrip+
        glucoseConcentration: reading.sgv,
        timestamp: new Date(reading.dateString),
        unit: reading.units_hint || reading.unit || 'mg/dL',
        type: reading.type,
        direction: reading.direction
      })))
    );
  }
}