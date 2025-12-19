/**
 * Food Service Integration Tests
 *
 * Pruebas de integración para FoodService.
 * Verifica la gestión de alimentos, búsquedas, selecciones y cálculos de carbohidratos
 * con propagación de señales Angular.
 *
 * COBERTURA (11 tests):
 *
 * Signal Management (3 tests):
 * 1. Signal totalCarbs se actualiza automáticamente al agregar alimentos
 * 2. Signal selectedFoods refleja cambios de selección
 * 3. Multiple subscriptions a computed signals funcionan correctamente
 *
 * Food Operations (3 tests):
 * 4. Add food actualiza signals y persiste selección
 * 5. Update servings recalcula totalCarbs correctamente
 * 6. Remove food elimina de selección y actualiza total
 *
 * Search & Filtering (2 tests):
 * 7. Search by name encuentra alimentos correctamente
 * 8. Search by keywords (español) encuentra matches
 *
 * Category Filtering (1 test):
 * 9. getFoodsByCategory filtra por categoría correctamente
 *
 * Carb Calculations (1 test):
 * 10. Carb calculation accuracy con múltiples servings y redondeo
 *
 * Selection Management (2 tests):
 * 11. getSelectionResult genera resultado con totales correctos
 * 12. clearSelection resetea signals a estado inicial
 */

// Inicializar entorno TestBed para Vitest
import '../../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { effect } from '@angular/core';
import { FoodService } from '@core/services/food.service';
import { FoodItem, FoodCategory, SelectedFood } from '@models/food.model';

describe('Food Service Integration Tests', () => {
  let service: FoodService;

  /**
   * Helper: Obtener alimento por ID desde la base de datos
   */
  const getFoodById = (id: string): FoodItem | undefined => {
    return service.getAllFoods().find(f => f.id === id);
  };

  beforeEach(() => {
    // Reset TestBed
    TestBed.resetTestingModule();

    TestBed.configureTestingModule({
      providers: [FoodService],
    });

    service = TestBed.inject(FoodService);
  });

  afterEach(() => {
    // Limpiar selecciones después de cada test
    service.clearSelection();
  });

  describe('Signal Management', () => {
    it('should update totalCarbs signal automatically when adding foods', () => {
      // ARRANGE
      const apple = getFoodById('apple')!; // 19g carbs
      const banana = getFoodById('banana')!; // 27g carbs
      expect(apple).toBeDefined();
      expect(banana).toBeDefined();

      // Verificar estado inicial
      expect(service.totalCarbs()).toBe(0);

      // ACT - agregar primera comida
      service.addFood(apple, 1);

      // ASSERT - totalCarbs se actualiza automáticamente
      expect(service.totalCarbs()).toBe(19);

      // ACT - agregar segunda comida
      service.addFood(banana, 1);

      // ASSERT - totalCarbs suma ambos
      expect(service.totalCarbs()).toBe(46); // 19 + 27
    });

    it('should reflect changes in selectedFoods signal', () => {
      // ARRANGE
      const rice = getFoodById('rice')!; // 45g carbs
      expect(rice).toBeDefined();

      // Verificar estado inicial vacío
      expect(service.selectedFoods()).toHaveLength(0);

      // ACT - agregar comida
      service.addFood(rice, 2);

      // ASSERT - selectedFoods refleja la selección
      const selected = service.selectedFoods();
      expect(selected).toHaveLength(1);
      expect(selected[0].food.id).toBe('rice');
      expect(selected[0].servings).toBe(2);
      expect(selected[0].totalCarbs).toBe(90); // 45 * 2
    });

    it('should support multiple subscriptions to computed signals', () => {
      // ARRANGE
      const apple = getFoodById('apple')!;
      const banana = getFoodById('banana')!;

      // Leer signals múltiples veces para verificar que funcionan
      const initialTotal1 = service.totalCarbs();
      const initialTotal2 = service.totalCarbs();
      const initialFoods1 = service.selectedFoods();
      const initialFoods2 = service.selectedFoods();

      // ACT - agregar alimentos
      service.addFood(apple, 1);
      service.addFood(banana, 1);

      // Leer signals múltiples veces después de cambios
      const updatedTotal1 = service.totalCarbs();
      const updatedTotal2 = service.totalCarbs();
      const updatedFoods1 = service.selectedFoods();
      const updatedFoods2 = service.selectedFoods();

      // ASSERT - todas las lecturas devuelven valores consistentes
      expect(initialTotal1).toBe(initialTotal2);
      expect(initialTotal1).toBe(0);
      expect(initialFoods1).toEqual(initialFoods2);
      expect(initialFoods1).toHaveLength(0);

      expect(updatedTotal1).toBe(updatedTotal2);
      expect(updatedTotal1).toBe(46); // 19 + 27
      expect(updatedFoods1).toEqual(updatedFoods2);
      expect(updatedFoods1).toHaveLength(2);
    });
  });

  describe('Food Operations', () => {
    it('should add food, update signals, and persist selection', () => {
      // ARRANGE
      const pasta = getFoodById('pasta')!; // 43g carbs
      expect(pasta).toBeDefined();

      // ACT
      service.addFood(pasta, 1.5);

      // ASSERT - signal actualizado
      expect(service.totalCarbs()).toBe(64.5); // 43 * 1.5 = 64.5

      // ASSERT - selección persistida
      const selected = service.selectedFoods();
      expect(selected).toHaveLength(1);
      expect(selected[0].food.id).toBe('pasta');
      expect(selected[0].servings).toBe(1.5);
    });

    it('should update servings and recalculate totalCarbs correctly', () => {
      // ARRANGE
      const milk = getFoodById('milk')!; // 12g carbs
      service.addFood(milk, 1);

      // Verificar estado inicial
      expect(service.totalCarbs()).toBe(12);

      // ACT - actualizar servings
      service.updateServings('milk', 3);

      // ASSERT - totalCarbs recalculado
      expect(service.totalCarbs()).toBe(36); // 12 * 3

      // ASSERT - servings actualizado en selección
      const selected = service.selectedFoods();
      expect(selected[0].servings).toBe(3);
      expect(selected[0].totalCarbs).toBe(36);
    });

    it('should remove food from selection and update total', () => {
      // ARRANGE
      const pizza = getFoodById('pizza-slice')!; // 30g carbs
      const soda = getFoodById('soda')!; // 39g carbs
      service.addFood(pizza, 2); // 60g
      service.addFood(soda, 1); // 39g

      // Verificar estado inicial
      expect(service.totalCarbs()).toBe(99); // 60 + 39

      // ACT - eliminar pizza
      service.removeFood('pizza-slice');

      // ASSERT - totalCarbs actualizado
      expect(service.totalCarbs()).toBe(39); // Solo soda

      // ASSERT - selección actualizada
      const selected = service.selectedFoods();
      expect(selected).toHaveLength(1);
      expect(selected[0].food.id).toBe('soda');
    });
  });

  describe('Search & Filtering', () => {
    it('should search foods by name successfully', () => {
      // ACT
      const results = service.searchFoods('apple');

      // ASSERT
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('apple');
      expect(results[0].name).toBe('Apple');
      expect(results[0].category).toBe('fruits');
    });

    it('should search foods by keywords in Spanish', () => {
      // ACT - buscar por keyword en español
      const results = service.searchFoods('manzana'); // keyword de 'apple'

      // ASSERT
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('apple');

      // ACT - buscar otra keyword
      const bananaResults = service.searchFoods('plátano'); // keyword de 'banana'

      // ASSERT
      expect(bananaResults.length).toBeGreaterThan(0);
      expect(bananaResults[0].id).toBe('banana');
    });
  });

  describe('Category Filtering', () => {
    it('should filter foods by category correctly', () => {
      // ACT
      const fruits = service.getFoodsByCategory('fruits' as FoodCategory);
      const dairy = service.getFoodsByCategory('dairy' as FoodCategory);

      // ASSERT - fruits category
      expect(fruits.length).toBeGreaterThan(0);
      fruits.forEach(food => {
        expect(food.category).toBe('fruits');
      });

      // Verificar que contiene alimentos esperados
      const fruitIds = fruits.map(f => f.id);
      expect(fruitIds).toContain('apple');
      expect(fruitIds).toContain('banana');
      expect(fruitIds).toContain('orange');

      // ASSERT - dairy category
      expect(dairy.length).toBeGreaterThan(0);
      dairy.forEach(food => {
        expect(food.category).toBe('dairy');
      });

      const dairyIds = dairy.map(f => f.id);
      expect(dairyIds).toContain('milk');
      expect(dairyIds).toContain('yogurt');
    });
  });

  describe('Carb Calculations', () => {
    it('should calculate carbs accurately with rounding', () => {
      // ARRANGE
      const apple = getFoodById('apple')!; // 19g carbs
      const banana = getFoodById('banana')!; // 27g carbs
      const rice = getFoodById('rice')!; // 45g carbs

      // ACT - agregar con servings fraccionarios
      service.addFood(apple, 1.5); // 19 * 1.5 = 28.5
      service.addFood(banana, 2.3); // 27 * 2.3 = 62.1
      service.addFood(rice, 0.75); // 45 * 0.75 = 33.75

      // ASSERT - totalCarbs suma correctamente con redondeo
      const total = service.totalCarbs();
      // 28.5 + 62.1 + 33.75 = 124.35, redondeado a 1 decimal
      expect(total).toBeCloseTo(124.4, 1);

      // ASSERT - verificar cálculos individuales
      const selected = service.selectedFoods();
      expect(selected[0].totalCarbs).toBe(28.5); // redondeado a 1 decimal
      expect(selected[1].totalCarbs).toBe(62.1);
      expect(selected[2].totalCarbs).toBeCloseTo(33.8, 1);
    });
  });

  describe('Selection Management', () => {
    it('should generate selection result with correct totals', () => {
      // ARRANGE
      const hamburger = getFoodById('hamburger')!; // 25g carbs
      const frenchFries = getFoodById('french-fries')!; // 35g carbs
      const soda = getFoodById('soda')!; // 39g carbs

      service.addFood(hamburger, 1);
      service.addFood(frenchFries, 1);
      service.addFood(soda, 1);

      // ACT
      const result = service.getSelectionResult();

      // ASSERT - estructura del resultado
      expect(result).toBeDefined();
      expect(result.selectedFoods).toHaveLength(3);
      expect(result.totalCarbs).toBe(99); // 25 + 35 + 39

      // ASSERT - contenido de selectedFoods
      expect(result.selectedFoods[0].food.id).toBe('hamburger');
      expect(result.selectedFoods[1].food.id).toBe('french-fries');
      expect(result.selectedFoods[2].food.id).toBe('soda');
    });

    it('should reset signals to initial state on clearSelection', () => {
      // ARRANGE - agregar múltiples alimentos
      const pizza = getFoodById('pizza-slice')!;
      const iceCream = getFoodById('ice-cream')!;
      service.addFood(pizza, 2);
      service.addFood(iceCream, 1);

      // Verificar estado poblado
      expect(service.totalCarbs()).toBeGreaterThan(0);
      expect(service.selectedFoods()).toHaveLength(2);

      // ACT
      service.clearSelection();

      // ASSERT - signals reseteados
      expect(service.totalCarbs()).toBe(0);
      expect(service.selectedFoods()).toHaveLength(0);

      // ASSERT - getSelectionResult también vacío
      const result = service.getSelectionResult();
      expect(result.totalCarbs).toBe(0);
      expect(result.selectedFoods).toHaveLength(0);
    });
  });

  describe('Additional Edge Cases', () => {
    it('should handle adding same food multiple times by incrementing servings', () => {
      // ARRANGE
      const apple = getFoodById('apple')!; // 19g carbs

      // ACT - agregar mismo alimento 3 veces
      service.addFood(apple, 1); // 19g
      service.addFood(apple, 1); // +19g = 38g
      service.addFood(apple, 2); // +38g = 76g

      // ASSERT - solo 1 item en selección con servings acumulados
      const selected = service.selectedFoods();
      expect(selected).toHaveLength(1);
      expect(selected[0].servings).toBe(4); // 1 + 1 + 2
      expect(service.totalCarbs()).toBe(76); // 19 * 4
    });

    it('should return empty array for empty search query', () => {
      // ACT
      const results = service.searchFoods('');

      // ASSERT
      expect(results).toEqual([]);
    });

    it('should return all foods from getAllFoods', () => {
      // ACT
      const allFoods = service.getAllFoods();

      // ASSERT - debe tener la base de datos completa (43 alimentos en total)
      expect(allFoods.length).toBe(43);
      expect(allFoods.find(f => f.id === 'apple')).toBeDefined();
      expect(allFoods.find(f => f.id === 'rice')).toBeDefined();
      expect(allFoods.find(f => f.id === 'pizza-slice')).toBeDefined();
    });

    it('should return sorted categories with correct order', () => {
      // ACT
      const categories = service.getSortedCategories();

      // ASSERT - ordenados por order field
      expect(categories[0].key).toBe('fruits'); // order: 1
      expect(categories[1].key).toBe('grains'); // order: 2
      expect(categories[2].key).toBe('dairy'); // order: 3

      // Verificar estructura
      expect(categories[0].emoji).toBe('🍎');
      expect(categories[0].nameKey).toBe('foodPicker.categories.fruits');
    });
  });
});
