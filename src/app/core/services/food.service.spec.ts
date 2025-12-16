// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { FoodService } from '@services/food.service';
import { FoodCategory } from '@models/food.model';

describe('FoodService', () => {
  let service: FoodService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FoodService],
    });

    service = TestBed.inject(FoodService);
  });

  afterEach(() => {
    // Reset service state between tests
    service.clearSelection();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAllFoods', () => {
    it('should return all foods from database', () => {
      const allFoods = service.getAllFoods();

      expect(allFoods).toBeInstanceOf(Array);
      expect(allFoods.length).toBeGreaterThan(0);
    });

    it('should return a copy of the database (not reference)', () => {
      const foods1 = service.getAllFoods();
      const foods2 = service.getAllFoods();

      expect(foods1).not.toBe(foods2);
      expect(foods1).toEqual(foods2);
    });

    it('should include all required food properties', () => {
      const allFoods = service.getAllFoods();
      const firstFood = allFoods[0];

      expect(firstFood).toHaveProperty('id');
      expect(firstFood).toHaveProperty('name');
      expect(firstFood).toHaveProperty('nameKey');
      expect(firstFood).toHaveProperty('carbsPerServing');
      expect(firstFood).toHaveProperty('servingSize');
      expect(firstFood).toHaveProperty('servingUnit');
      expect(firstFood).toHaveProperty('category');
      expect(firstFood).toHaveProperty('emoji');
    });
  });

  describe('getFoodsByCategory', () => {
    it('should return only fruits when fruits category is requested', () => {
      const fruits = service.getFoodsByCategory('fruits');

      expect(fruits.length).toBeGreaterThan(0);
      fruits.forEach(food => {
        expect(food.category).toBe('fruits');
      });
    });

    it('should return only grains when grains category is requested', () => {
      const grains = service.getFoodsByCategory('grains');

      expect(grains.length).toBeGreaterThan(0);
      grains.forEach(food => {
        expect(food.category).toBe('grains');
      });
    });

    it('should return only dairy when dairy category is requested', () => {
      const dairy = service.getFoodsByCategory('dairy');

      expect(dairy.length).toBeGreaterThan(0);
      dairy.forEach(food => {
        expect(food.category).toBe('dairy');
      });
    });

    it('should return only snacks when snacks category is requested', () => {
      const snacks = service.getFoodsByCategory('snacks');

      expect(snacks.length).toBeGreaterThan(0);
      snacks.forEach(food => {
        expect(food.category).toBe('snacks');
      });
    });

    it('should return only drinks when drinks category is requested', () => {
      const drinks = service.getFoodsByCategory('drinks');

      expect(drinks.length).toBeGreaterThan(0);
      drinks.forEach(food => {
        expect(food.category).toBe('drinks');
      });
    });

    it('should return only meals when meals category is requested', () => {
      const meals = service.getFoodsByCategory('meals');

      expect(meals.length).toBeGreaterThan(0);
      meals.forEach(food => {
        expect(food.category).toBe('meals');
      });
    });

    it('should return only desserts when desserts category is requested', () => {
      const desserts = service.getFoodsByCategory('desserts');

      expect(desserts.length).toBeGreaterThan(0);
      desserts.forEach(food => {
        expect(food.category).toBe('desserts');
      });
    });

    it('should return only vegetables when vegetables category is requested', () => {
      const vegetables = service.getFoodsByCategory('vegetables');

      expect(vegetables.length).toBeGreaterThan(0);
      vegetables.forEach(food => {
        expect(food.category).toBe('vegetables');
      });
    });

    it('should return only proteins when proteins category is requested', () => {
      const proteins = service.getFoodsByCategory('proteins');

      expect(proteins.length).toBeGreaterThan(0);
      proteins.forEach(food => {
        expect(food.category).toBe('proteins');
      });
    });

    it('should return empty array for non-matching category', () => {
      const results = service.getFoodsByCategory('non-existent' as FoodCategory);

      expect(results).toEqual([]);
    });
  });

  describe('searchFoods', () => {
    it('should find foods by name (case-insensitive)', () => {
      const results = service.searchFoods('apple');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('apple');
    });

    it('should find foods by name with uppercase query', () => {
      const results = service.searchFoods('BANANA');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(f => f.id === 'banana')).toBe(true);
    });

    it('should find foods by partial name match', () => {
      const results = service.searchFoods('choc');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(f => f.id === 'chocolate' || f.id === 'chocolate-milk')).toBe(true);
    });

    it('should find foods by keywords (Spanish)', () => {
      const results = service.searchFoods('manzana');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(f => f.id === 'apple')).toBe(true);
    });

    it('should find foods by keywords (banana variations)', () => {
      const plátanoResults = service.searchFoods('plátano');
      const bananoResults = service.searchFoods('banano');

      expect(plátanoResults.some(f => f.id === 'banana')).toBe(true);
      expect(bananoResults.some(f => f.id === 'banana')).toBe(true);
    });

    it('should handle empty query gracefully', () => {
      const results = service.searchFoods('');

      expect(results).toEqual([]);
    });

    it('should handle whitespace-only query', () => {
      const results = service.searchFoods('   ');

      expect(results).toEqual([]);
    });

    it('should return empty array for non-matching query', () => {
      const results = service.searchFoods('xyznonexistent');

      expect(results).toEqual([]);
    });

    it('should trim search query', () => {
      const results = service.searchFoods('  apple  ');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('apple');
    });

    it('should find multiple foods matching keyword', () => {
      const results = service.searchFoods('fruta');

      expect(results.length).toBeGreaterThan(1);
      results.forEach(food => {
        expect(food.keywords).toBeDefined();
        expect(food.keywords?.some(kw => kw.toLowerCase().includes('fruta'))).toBe(true);
      });
    });
  });

  describe('getFoodById', () => {
    it('should return food when ID exists', () => {
      const food = service.getFoodById('apple');

      expect(food).toBeDefined();
      expect(food?.id).toBe('apple');
      expect(food?.name).toBe('Apple');
    });

    it('should return undefined when ID does not exist', () => {
      const food = service.getFoodById('non-existent-id');

      expect(food).toBeUndefined();
    });

    it('should return correct food data for specific items', () => {
      const banana = service.getFoodById('banana');
      const rice = service.getFoodById('rice');
      const milk = service.getFoodById('milk');

      expect(banana?.carbsPerServing).toBe(27);
      expect(rice?.carbsPerServing).toBe(45);
      expect(milk?.carbsPerServing).toBe(12);
    });
  });

  describe('addFood', () => {
    it('should add food to selection with default 1 serving', () => {
      const apple = service.getFoodById('apple')!;
      service.addFood(apple);

      const selected = service.selectedFoods();
      expect(selected.length).toBe(1);
      expect(selected[0].food.id).toBe('apple');
      expect(selected[0].servings).toBe(1);
      expect(selected[0].totalCarbs).toBe(19); // apple has 19g carbs
    });

    it('should add food with custom servings', () => {
      const banana = service.getFoodById('banana')!;
      service.addFood(banana, 2);

      const selected = service.selectedFoods();
      expect(selected.length).toBe(1);
      expect(selected[0].servings).toBe(2);
      expect(selected[0].totalCarbs).toBe(54); // 27g * 2
    });

    it('should increment servings when adding same food again', () => {
      const apple = service.getFoodById('apple')!;
      service.addFood(apple, 1);
      service.addFood(apple, 1);

      const selected = service.selectedFoods();
      expect(selected.length).toBe(1);
      expect(selected[0].servings).toBe(2);
      expect(selected[0].totalCarbs).toBe(38); // 19g * 2
    });

    it('should add multiple different foods', () => {
      const apple = service.getFoodById('apple')!;
      const banana = service.getFoodById('banana')!;
      const milk = service.getFoodById('milk')!;

      service.addFood(apple);
      service.addFood(banana);
      service.addFood(milk);

      const selected = service.selectedFoods();
      expect(selected.length).toBe(3);
      expect(selected.map(s => s.food.id)).toContain('apple');
      expect(selected.map(s => s.food.id)).toContain('banana');
      expect(selected.map(s => s.food.id)).toContain('milk');
    });

    it('should round total carbs to one decimal place', () => {
      const apple = service.getFoodById('apple')!;
      service.addFood(apple, 1.5);

      const selected = service.selectedFoods();
      expect(selected[0].totalCarbs).toBe(28.5); // 19 * 1.5 = 28.5
    });

    it('should update totalCarbs signal when adding food', () => {
      const apple = service.getFoodById('apple')!;

      expect(service.totalCarbs()).toBe(0);

      service.addFood(apple);
      expect(service.totalCarbs()).toBe(19);
    });
  });

  describe('updateServings', () => {
    it('should update servings for selected food', () => {
      const apple = service.getFoodById('apple')!;
      service.addFood(apple, 1);

      service.updateServings('apple', 3);

      const selected = service.selectedFoods();
      expect(selected[0].servings).toBe(3);
      expect(selected[0].totalCarbs).toBe(57); // 19g * 3
    });

    it('should recalculate total carbs when updating servings', () => {
      const banana = service.getFoodById('banana')!;
      service.addFood(banana, 1);

      expect(service.totalCarbs()).toBe(27);

      service.updateServings('banana', 2);
      expect(service.totalCarbs()).toBe(54); // 27g * 2
    });

    it('should handle fractional servings', () => {
      const rice = service.getFoodById('rice')!;
      service.addFood(rice, 1);

      service.updateServings('rice', 0.5);

      const selected = service.selectedFoods();
      expect(selected[0].servings).toBe(0.5);
      expect(selected[0].totalCarbs).toBe(22.5); // 45g * 0.5
    });

    it('should not affect other selected foods', () => {
      const apple = service.getFoodById('apple')!;
      const banana = service.getFoodById('banana')!;

      service.addFood(apple, 1);
      service.addFood(banana, 1);

      service.updateServings('apple', 2);

      const selected = service.selectedFoods();
      const appleSelection = selected.find(s => s.food.id === 'apple')!;
      const bananaSelection = selected.find(s => s.food.id === 'banana')!;

      expect(appleSelection.servings).toBe(2);
      expect(bananaSelection.servings).toBe(1);
    });

    it('should do nothing if food ID is not in selection', () => {
      const apple = service.getFoodById('apple')!;
      service.addFood(apple, 1);

      service.updateServings('banana', 5);

      const selected = service.selectedFoods();
      expect(selected.length).toBe(1);
      expect(selected[0].food.id).toBe('apple');
      expect(selected[0].servings).toBe(1);
    });
  });

  describe('removeFood', () => {
    it('should remove food from selection', () => {
      const apple = service.getFoodById('apple')!;
      service.addFood(apple);

      service.removeFood('apple');

      const selected = service.selectedFoods();
      expect(selected.length).toBe(0);
    });

    it('should update total carbs when removing food', () => {
      const apple = service.getFoodById('apple')!;
      const banana = service.getFoodById('banana')!;

      service.addFood(apple);
      service.addFood(banana);

      expect(service.totalCarbs()).toBe(46); // 19 + 27

      service.removeFood('apple');
      expect(service.totalCarbs()).toBe(27); // only banana
    });

    it('should only remove specified food, not others', () => {
      const apple = service.getFoodById('apple')!;
      const banana = service.getFoodById('banana')!;
      const milk = service.getFoodById('milk')!;

      service.addFood(apple);
      service.addFood(banana);
      service.addFood(milk);

      service.removeFood('banana');

      const selected = service.selectedFoods();
      expect(selected.length).toBe(2);
      expect(selected.map(s => s.food.id)).toContain('apple');
      expect(selected.map(s => s.food.id)).toContain('milk');
      expect(selected.map(s => s.food.id)).not.toContain('banana');
    });

    it('should do nothing if food ID is not in selection', () => {
      const apple = service.getFoodById('apple')!;
      service.addFood(apple);

      service.removeFood('banana');

      const selected = service.selectedFoods();
      expect(selected.length).toBe(1);
      expect(selected[0].food.id).toBe('apple');
    });

    it('should handle removing from empty selection', () => {
      service.removeFood('apple');

      const selected = service.selectedFoods();
      expect(selected.length).toBe(0);
    });
  });

  describe('clearSelection', () => {
    it('should clear all selected foods', () => {
      const apple = service.getFoodById('apple')!;
      const banana = service.getFoodById('banana')!;
      const milk = service.getFoodById('milk')!;

      service.addFood(apple);
      service.addFood(banana);
      service.addFood(milk);

      service.clearSelection();

      const selected = service.selectedFoods();
      expect(selected.length).toBe(0);
    });

    it('should reset total carbs to zero', () => {
      const apple = service.getFoodById('apple')!;
      const banana = service.getFoodById('banana')!;

      service.addFood(apple);
      service.addFood(banana);

      expect(service.totalCarbs()).toBeGreaterThan(0);

      service.clearSelection();
      expect(service.totalCarbs()).toBe(0);
    });

    it('should handle clearing empty selection', () => {
      service.clearSelection();

      const selected = service.selectedFoods();
      expect(selected.length).toBe(0);
      expect(service.totalCarbs()).toBe(0);
    });
  });

  describe('getSelectionResult', () => {
    it('should return selection result with foods and total carbs', () => {
      const apple = service.getFoodById('apple')!;
      const banana = service.getFoodById('banana')!;

      service.addFood(apple, 1);
      service.addFood(banana, 2);

      const result = service.getSelectionResult();

      expect(result.selectedFoods.length).toBe(2);
      expect(result.totalCarbs).toBe(73); // 19 + (27 * 2)
    });

    it('should return empty result when no foods selected', () => {
      const result = service.getSelectionResult();

      expect(result.selectedFoods).toEqual([]);
      expect(result.totalCarbs).toBe(0);
    });

    it('should match signal values', () => {
      const rice = service.getFoodById('rice')!;
      service.addFood(rice, 1.5);

      const result = service.getSelectionResult();

      expect(result.selectedFoods).toEqual(service.selectedFoods());
      expect(result.totalCarbs).toBe(service.totalCarbs());
    });
  });

  describe('getSortedCategories', () => {
    it('should return all category info objects', () => {
      const categories = service.getSortedCategories();

      expect(categories.length).toBe(9);
    });

    it('should sort categories by order property', () => {
      const categories = service.getSortedCategories();

      for (let i = 0; i < categories.length - 1; i++) {
        expect(categories[i].order).toBeLessThanOrEqual(categories[i + 1].order);
      }
    });

    it('should include all required category properties', () => {
      const categories = service.getSortedCategories();

      categories.forEach(cat => {
        expect(cat).toHaveProperty('key');
        expect(cat).toHaveProperty('nameKey');
        expect(cat).toHaveProperty('emoji');
        expect(cat).toHaveProperty('order');
      });
    });

    it('should have fruits as first category', () => {
      const categories = service.getSortedCategories();

      expect(categories[0].key).toBe('fruits');
      expect(categories[0].order).toBe(1);
    });

    it('should include all expected category keys', () => {
      const categories = service.getSortedCategories();
      const keys = categories.map(c => c.key);

      expect(keys).toContain('fruits');
      expect(keys).toContain('grains');
      expect(keys).toContain('dairy');
      expect(keys).toContain('snacks');
      expect(keys).toContain('drinks');
      expect(keys).toContain('meals');
      expect(keys).toContain('desserts');
      expect(keys).toContain('vegetables');
      expect(keys).toContain('proteins');
    });

    it('should return a copy (not reference)', () => {
      const categories1 = service.getSortedCategories();
      const categories2 = service.getSortedCategories();

      expect(categories1).not.toBe(categories2);
      expect(categories1).toEqual(categories2);
    });
  });

  describe('totalCarbs computed signal', () => {
    it('should be zero initially', () => {
      expect(service.totalCarbs()).toBe(0);
    });

    it('should calculate total carbs from single food', () => {
      const apple = service.getFoodById('apple')!;
      service.addFood(apple, 2);

      expect(service.totalCarbs()).toBe(38); // 19g * 2
    });

    it('should calculate total carbs from multiple foods', () => {
      const apple = service.getFoodById('apple')!;
      const banana = service.getFoodById('banana')!;
      const milk = service.getFoodById('milk')!;

      service.addFood(apple, 1); // 19g
      service.addFood(banana, 2); // 54g
      service.addFood(milk, 1); // 12g

      expect(service.totalCarbs()).toBe(85); // 19 + 54 + 12
    });

    it('should update when foods are added', () => {
      const apple = service.getFoodById('apple')!;

      expect(service.totalCarbs()).toBe(0);

      service.addFood(apple, 1);
      expect(service.totalCarbs()).toBe(19);

      service.addFood(apple, 1);
      expect(service.totalCarbs()).toBe(38);
    });

    it('should update when servings are changed', () => {
      const banana = service.getFoodById('banana')!;
      service.addFood(banana, 1);

      expect(service.totalCarbs()).toBe(27);

      service.updateServings('banana', 3);
      expect(service.totalCarbs()).toBe(81);
    });

    it('should update when foods are removed', () => {
      const apple = service.getFoodById('apple')!;
      const banana = service.getFoodById('banana')!;

      service.addFood(apple, 1);
      service.addFood(banana, 1);

      expect(service.totalCarbs()).toBe(46);

      service.removeFood('apple');
      expect(service.totalCarbs()).toBe(27);
    });
  });

  describe('Complex selection scenarios', () => {
    it('should handle meal planning scenario', () => {
      const rice = service.getFoodById('rice')!;
      const chicken = service.getFoodById('chicken')!;
      const milk = service.getFoodById('milk')!;
      const apple = service.getFoodById('apple')!;

      service.addFood(rice, 0.5); // 22.5g
      service.addFood(chicken, 1); // 0g
      service.addFood(milk, 1); // 12g
      service.addFood(apple, 1); // 19g

      expect(service.totalCarbs()).toBe(53.5);
      expect(service.selectedFoods().length).toBe(4);
    });

    it('should handle snack planning scenario', () => {
      const cookies = service.getFoodById('cookies')!;
      const milk = service.getFoodById('milk')!;

      service.addFood(cookies, 2); // 20g
      service.addFood(milk, 1); // 12g

      expect(service.totalCarbs()).toBe(32);
    });

    it('should handle high-carb meal scenario', () => {
      const pizza = service.getFoodById('pizza-slice')!;
      const soda = service.getFoodById('soda')!;
      const iceCream = service.getFoodById('ice-cream')!;

      service.addFood(pizza, 2); // 60g
      service.addFood(soda, 1); // 39g
      service.addFood(iceCream, 1); // 22g

      expect(service.totalCarbs()).toBe(121);
    });

    it('should handle low-carb meal scenario', () => {
      const egg = service.getFoodById('egg')!;
      const chicken = service.getFoodById('chicken')!;
      const cheese = service.getFoodById('cheese')!;

      service.addFood(egg, 2); // 2g
      service.addFood(chicken, 1); // 0g
      service.addFood(cheese, 1); // 1g

      expect(service.totalCarbs()).toBe(3);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero servings', () => {
      const apple = service.getFoodById('apple')!;
      service.addFood(apple, 1);

      service.updateServings('apple', 0);

      const selected = service.selectedFoods();
      expect(selected[0].servings).toBe(0);
      expect(selected[0].totalCarbs).toBe(0);
      expect(service.totalCarbs()).toBe(0);
    });

    it('should handle very large servings', () => {
      const rice = service.getFoodById('rice')!;
      service.addFood(rice, 10);

      expect(service.totalCarbs()).toBe(450); // 45g * 10
    });

    it('should handle decimal precision in carb calculations', () => {
      const banana = service.getFoodById('banana')!;
      service.addFood(banana, 1.333);

      const selected = service.selectedFoods();
      // 27 * 1.333 = 35.991, rounded to 36.0
      expect(selected[0].totalCarbs).toBeCloseTo(36, 0);
    });

    it('should maintain state isolation between instances', () => {
      const service2 = TestBed.inject(FoodService);

      const apple = service.getFoodById('apple')!;
      service.addFood(apple, 1);

      // Services share the same instance (singleton)
      expect(service2.selectedFoods().length).toBe(1);
      expect(service2.totalCarbs()).toBe(19);

      // Clear in service clears in service2
      service.clearSelection();
      expect(service2.selectedFoods().length).toBe(0);
    });
  });

  describe('Data integrity', () => {
    it('should have valid carb values for all foods', () => {
      const allFoods = service.getAllFoods();

      allFoods.forEach(food => {
        expect(food.carbsPerServing).toBeGreaterThanOrEqual(0);
        expect(typeof food.carbsPerServing).toBe('number');
      });
    });

    it('should have valid serving sizes for all foods', () => {
      const allFoods = service.getAllFoods();

      allFoods.forEach(food => {
        expect(food.servingSize).toBeGreaterThan(0);
        expect(typeof food.servingSize).toBe('number');
      });
    });

    it('should have unique IDs for all foods', () => {
      const allFoods = service.getAllFoods();
      const ids = allFoods.map(f => f.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid glycemic index values', () => {
      const allFoods = service.getAllFoods();
      const validGI = ['low', 'medium', 'high', undefined];

      allFoods.forEach(food => {
        expect(validGI).toContain(food.glycemicIndex);
      });
    });

    it('should have keywords as array of strings', () => {
      const allFoods = service.getAllFoods();

      allFoods.forEach(food => {
        if (food.keywords) {
          expect(Array.isArray(food.keywords)).toBe(true);
          food.keywords.forEach(kw => {
            expect(typeof kw).toBe('string');
          });
        }
      });
    });

    it('should have all categories populated with at least one food', () => {
      const categories = service.getSortedCategories();

      categories.forEach(cat => {
        const foods = service.getFoodsByCategory(cat.key);
        expect(foods.length).toBeGreaterThan(0);
      });
    });

    it('should have fiber as positive number when defined', () => {
      const allFoods = service.getAllFoods();

      allFoods.forEach(food => {
        if (food.fiber !== undefined) {
          expect(food.fiber).toBeGreaterThanOrEqual(0);
          expect(typeof food.fiber).toBe('number');
        }
      });
    });
  });
});
