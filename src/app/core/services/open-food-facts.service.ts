import { Injectable } from '@angular/core';
import { ApiGatewayService, ApiResponse } from '@services/api-gateway.service';
import { FoodItem } from '@models/food.model';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class OpenFoodFactsService {
  // Valid barcode formats: EAN-13 (13 digits), EAN-8 (8 digits), UPC-A (12 digits)
  private readonly BARCODE_PATTERN = /^[0-9]{8,14}$/;

  constructor(private apiGateway: ApiGatewayService) {}

  /**
   * Validate barcode format to prevent injection and invalid requests
   */
  private isValidBarcode(barcode: string): boolean {
    if (!barcode || typeof barcode !== 'string') return false;
    // Sanitize: remove any non-digit characters
    const sanitized = barcode.replace(/\D/g, '');
    return this.BARCODE_PATTERN.test(sanitized) && sanitized === barcode;
  }

  getProductByBarcode(barcode: string): Observable<FoodItem | null> {
    // Validate barcode before making API request
    if (!this.isValidBarcode(barcode)) {
      return new Observable(subscriber => {
        subscriber.next(null);
        subscriber.complete();
      });
    }

    return this.apiGateway.request<any>('openfoodfacts.product.get', {}, { barcode }).pipe(
      map((response: ApiResponse<any>) => {
        if (response.success && response.data?.product) {
          const product = response.data.product;
          return {
            id: product.code,
            name: product.product_name,
            nameKey: product.product_name,
            carbsPerServing: product.nutriments.carbohydrates_100g,
            servingSize: 100,
            servingUnit: 'g',
            category: 'scanned',
            emoji: '📦',
          } as FoodItem;
        }
        return null;
      })
    );
  }
}
