// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { OpenFoodFactsService } from './open-food-facts.service';
import { ApiGatewayService, ApiResponse } from '@services/api-gateway.service';
import { FoodItem } from '@models/food.model';

describe('OpenFoodFactsService', () => {
  let service: OpenFoodFactsService;
  let apiGatewayMock: {
    request: ReturnType<typeof vi.fn>;
  };

  const mockProductResponse: ApiResponse<any> = {
    success: true,
    data: {
      product: {
        code: '3017620422003',
        product_name: 'Nutella',
        nutriments: {
          carbohydrates_100g: 57.5,
        },
      },
    },
  };

  beforeEach(() => {
    apiGatewayMock = {
      request: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [OpenFoodFactsService, { provide: ApiGatewayService, useValue: apiGatewayMock }],
    });

    service = TestBed.inject(OpenFoodFactsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ============================================
  // Barcode Validation Tests
  // ============================================

  describe('Barcode Validation', () => {
    describe('Valid Barcodes', () => {
      it('should accept EAN-8 barcode (8 digits)', async () => {
        const barcode = '12345678';
        apiGatewayMock.request.mockReturnValue(of(mockProductResponse));

        const result = await new Promise<FoodItem | null>(resolve => {
          service.getProductByBarcode(barcode).subscribe(result => resolve(result));
        });

        expect(apiGatewayMock.request).toHaveBeenCalled();
        expect(result).not.toBeNull();
      });

      it('should accept EAN-13 barcode (13 digits)', async () => {
        const barcode = '3017620422003';
        apiGatewayMock.request.mockReturnValue(of(mockProductResponse));

        const result = await new Promise<FoodItem | null>(resolve => {
          service.getProductByBarcode(barcode).subscribe(result => resolve(result));
        });

        expect(apiGatewayMock.request).toHaveBeenCalled();
        expect(result).not.toBeNull();
      });

      it('should accept UPC-A barcode (12 digits)', async () => {
        const barcode = '012345678905';
        apiGatewayMock.request.mockReturnValue(of(mockProductResponse));

        const result = await new Promise<FoodItem | null>(resolve => {
          service.getProductByBarcode(barcode).subscribe(result => resolve(result));
        });

        expect(apiGatewayMock.request).toHaveBeenCalled();
        expect(result).not.toBeNull();
      });

      it('should accept 14-digit barcode (GTIN-14)', async () => {
        const barcode = '00012345678905';
        apiGatewayMock.request.mockReturnValue(of(mockProductResponse));

        const result = await new Promise<FoodItem | null>(resolve => {
          service.getProductByBarcode(barcode).subscribe(result => resolve(result));
        });

        expect(apiGatewayMock.request).toHaveBeenCalled();
        expect(result).not.toBeNull();
      });
    });

    describe('Invalid Barcodes', () => {
      it('should reject barcode shorter than 8 digits', async () => {
        const barcode = '1234567'; // 7 digits

        const result = await new Promise<FoodItem | null>(resolve => {
          service.getProductByBarcode(barcode).subscribe(result => resolve(result));
        });

        expect(apiGatewayMock.request).not.toHaveBeenCalled();
        expect(result).toBeNull();
      });

      it('should reject barcode longer than 14 digits', async () => {
        const barcode = '123456789012345'; // 15 digits

        const result = await new Promise<FoodItem | null>(resolve => {
          service.getProductByBarcode(barcode).subscribe(result => resolve(result));
        });

        expect(apiGatewayMock.request).not.toHaveBeenCalled();
        expect(result).toBeNull();
      });

      it('should reject barcode with letters', async () => {
        const barcode = '12345678ABC';

        const result = await new Promise<FoodItem | null>(resolve => {
          service.getProductByBarcode(barcode).subscribe(result => resolve(result));
        });

        expect(apiGatewayMock.request).not.toHaveBeenCalled();
        expect(result).toBeNull();
      });

      it('should reject barcode with special characters', async () => {
        const barcode = '1234-5678-9012';

        const result = await new Promise<FoodItem | null>(resolve => {
          service.getProductByBarcode(barcode).subscribe(result => resolve(result));
        });

        expect(apiGatewayMock.request).not.toHaveBeenCalled();
        expect(result).toBeNull();
      });

      it('should reject barcode with spaces', async () => {
        const barcode = '1234 5678 9012';

        const result = await new Promise<FoodItem | null>(resolve => {
          service.getProductByBarcode(barcode).subscribe(result => resolve(result));
        });

        expect(apiGatewayMock.request).not.toHaveBeenCalled();
        expect(result).toBeNull();
      });

      it('should reject empty string', async () => {
        const barcode = '';

        const result = await new Promise<FoodItem | null>(resolve => {
          service.getProductByBarcode(barcode).subscribe(result => resolve(result));
        });

        expect(apiGatewayMock.request).not.toHaveBeenCalled();
        expect(result).toBeNull();
      });

      it('should reject null barcode', async () => {
        const barcode = null as unknown as string;

        const result = await new Promise<FoodItem | null>(resolve => {
          service.getProductByBarcode(barcode).subscribe(result => resolve(result));
        });

        expect(apiGatewayMock.request).not.toHaveBeenCalled();
        expect(result).toBeNull();
      });

      it('should reject undefined barcode', async () => {
        const barcode = undefined as unknown as string;

        const result = await new Promise<FoodItem | null>(resolve => {
          service.getProductByBarcode(barcode).subscribe(result => resolve(result));
        });

        expect(apiGatewayMock.request).not.toHaveBeenCalled();
        expect(result).toBeNull();
      });

      it('should reject SQL injection attempt', async () => {
        const barcode = "1234567890'; DROP TABLE products;--";

        const result = await new Promise<FoodItem | null>(resolve => {
          service.getProductByBarcode(barcode).subscribe(result => resolve(result));
        });

        expect(apiGatewayMock.request).not.toHaveBeenCalled();
        expect(result).toBeNull();
      });

      it('should reject script injection attempt', async () => {
        const barcode = '<script>alert("xss")</script>';

        const result = await new Promise<FoodItem | null>(resolve => {
          service.getProductByBarcode(barcode).subscribe(result => resolve(result));
        });

        expect(apiGatewayMock.request).not.toHaveBeenCalled();
        expect(result).toBeNull();
      });
    });
  });

  // ============================================
  // API Response Handling Tests
  // ============================================

  describe('API Response Handling', () => {
    it('should map successful response to FoodItem', async () => {
      const barcode = '3017620422003';
      apiGatewayMock.request.mockReturnValue(of(mockProductResponse));

      const result = await new Promise<FoodItem | null>(resolve => {
        service.getProductByBarcode(barcode).subscribe(result => resolve(result));
      });

      expect(result).not.toBeNull();
      expect(result?.id).toBe('3017620422003');
      expect(result?.name).toBe('Nutella');
      expect(result?.carbsPerServing).toBe(57.5);
      expect(result?.servingSize).toBe(100);
      expect(result?.servingUnit).toBe('g');
      expect(result?.category).toBe('scanned');
    });

    it('should return null for unsuccessful response', async () => {
      const barcode = '3017620422003';
      const failedResponse: ApiResponse<any> = {
        success: false,
        error: { message: 'Product not found' },
      };
      apiGatewayMock.request.mockReturnValue(of(failedResponse));

      const result = await new Promise<FoodItem | null>(resolve => {
        service.getProductByBarcode(barcode).subscribe(result => resolve(result));
      });

      expect(result).toBeNull();
    });

    it('should return null when product data is missing', async () => {
      const barcode = '3017620422003';
      const emptyResponse: ApiResponse<any> = {
        success: true,
        data: {},
      };
      apiGatewayMock.request.mockReturnValue(of(emptyResponse));

      const result = await new Promise<FoodItem | null>(resolve => {
        service.getProductByBarcode(barcode).subscribe(result => resolve(result));
      });

      expect(result).toBeNull();
    });
  });
});
