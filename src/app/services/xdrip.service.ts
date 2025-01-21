import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class XdripService {
  private readonly baseUrl = 'http://192.168.0.131:17580/sgv.json';
  private readonly endpoint = `${this.baseUrl}/sgv.json`;
  private readonly apiSecretHash = 'f7c3bc1d808e04732adf679965ccc34ca7ae3441'; // Hash SHA-1 de tu contraseña

  constructor(private http: HttpClient) {}

  getGlucoseData(): Observable<any[]> {
    const headers = new HttpHeaders({
      'api-secret': this.apiSecretHash,
    });
    return this.http.get<any[]>(this.endpoint, { headers });
  }
}
