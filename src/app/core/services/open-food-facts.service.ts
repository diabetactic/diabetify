import { Injectable } from '@angular/core';
import { ApiGatewayService, ApiResponse } from '@services/api-gateway.service';
import { FoodItem } from '@models/food.model';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OpenFoodFactsService {

  constructor(private apiGateway: ApiGatewayService) { }

  getProductByBarcode(barcode: string): Observable<FoodItem | null> {
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
