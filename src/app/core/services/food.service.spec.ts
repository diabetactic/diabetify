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
    service.clearSelection();
  });

  describe('getAllFoods', () => {
    it('should return all foods with complete properties and as a copy', () => {
      const foods1 = service.getAllFoods();
      const foods2 = service.getAllFoods();

      // Returns array with items
      expect(foods1).toBeInstanceOf(Array);
      expect(foods1.length).toBeGreaterThan(0);

      // Returns a copy, not reference
      expect(foods1).not.toBe(foods2);
      expect(foods1).toEqual(foods2);

      // Has all required properties
      const firstFood = foods1[0];
      const requiredProps = [
        'id',
        'name',
        'nameKey',
        'carbsPerServing',
        'servingSize',
        'servingUnit',
        'category',
        'emoji',
      ];
      requiredProps.forEach(prop => expect(firstFood).toHaveProperty(prop));
    });
  });

  describe('getFoodsByCategory', () => {
    it('should return correct foods for each category', () => {
      const categories: FoodCategory[] = [
        'fruits',
        'grains',
        'dairy',
        'snacks',
        'drinks',
        'meals',
        'desserts',
        'vegetables',
        'proteins',
      ];

      categories.forEach(category => {
        const foods = service.getFoodsByCategory(category);
        expect(foods.length, `${category} should have foods`).toBeGreaterThan(0);
        foods.forEach(food => expect(food.category).toBe(category));
      });
    });

    it('should return empty array for non-matching category', () => {
      expect(service.getFoodsByCategory('non-existent' as FoodCategory)).toEqual([]);
    });
  });

  describe('searchFoods', () => {
    it('should find foods by name (case-insensitive, partial match, trimmed)', () => {
      const testCases = [
        { query: 'apple', expectId: 'apple', desc: 'lowercase exact' },
        { query: 'BANANA', expectIncludes: 'banana', desc: 'uppercase' },
        { query: 'choc', expectOneOf: ['chocolate', 'chocolate-milk'], desc: 'partial match' },
        { query: '  apple  ', expectId: 'apple', desc: 'trimmed whitespace' },
      ];

      testCases.forEach(({ query, expectId, expectIncludes, expectOneOf, desc }) => {
        const results = service.searchFoods(query);
        expect(results.length, desc).toBeGreaterThan(0);

        if (expectId) {
          expect(results[0].id, desc).toBe(expectId);
        }
        if (expectIncludes) {
          expect(
            results.some(f => f.id === expectIncludes),
            desc
          ).toBe(true);
        }
        if (expectOneOf) {
          expect(
            results.some(f => expectOneOf.includes(f.id)),
            desc
          ).toBe(true);
        }
      });
    });

    it('should find foods by Spanish keywords', () => {
      const spanishKeywords = [
        { query: 'manzana', expectIncludes: 'apple' },
        { query: 'plátano', expectIncludes: 'banana' },
        { query: 'banano', expectIncludes: 'banana' },
        { query: 'fruta', expectMultiple: true },
      ];

      spanishKeywords.forEach(({ query, expectIncludes, expectMultiple }) => {
        const results = service.searchFoods(query);
        if (expectIncludes) {
          expect(
            results.some(f => f.id === expectIncludes),
            query
          ).toBe(true);
        }
        if (expectMultiple) {
          expect(results.length).toBeGreaterThan(1);
        }
      });
    });

    it('should handle edge cases gracefully', () => {
      expect(service.searchFoods('')).toEqual([]);
      expect(service.searchFoods('   ')).toEqual([]);
      expect(service.searchFoods('xyznonexistent')).toEqual([]);
    });
  });

  describe('getFoodById', () => {
    it('should return correct food by ID or undefined for non-existent', () => {
      const apple = service.getFoodById('apple');
      expect(apple).toBeDefined();
      expect(apple?.id).toBe('apple');
      expect(apple?.name).toBe('Apple');

      expect(service.getFoodById('non-existent-id')).toBeUndefined();
    });

    it('should return correct carb values for specific foods', () => {
      const carbTests = [
        { id: 'banana', carbs: 27 },
        { id: 'rice', carbs: 45 },
        { id: 'milk', carbs: 12 },
      ];

      carbTests.forEach(({ id, carbs }) => {
        expect(service.getFoodById(id)?.carbsPerServing).toBe(carbs);
      });
    });
  });

  describe('addFood', () => {
    it('should add food with default and custom servings', () => {
      const apple = service.getFoodById('apple')!;
      const banana = service.getFoodById('banana')!;

      // Default 1 serving
      service.addFood(apple);
      let selected = service.selectedFoods();
      expect(selected.length).toBe(1);
      expect(selected[0].food.id).toBe('apple');
      expect(selected[0].servings).toBe(1);
      expect(selected[0].totalCarbs).toBe(19);

      // Custom servings
      service.clearSelection();
      service.addFood(banana, 2);
      selected = service.selectedFoods();
      expect(selected[0].servings).toBe(2);
      expect(selected[0].totalCarbs).toBe(54);
    });

    it('should increment servings when adding same food and handle multiple foods', () => {
      const apple = service.getFoodById('apple')!;
      const banana = service.getFoodById('banana')!;
      const milk = service.getFoodById('milk')!;

      service.addFood(apple, 1);
      service.addFood(apple, 1);

      let selected = service.selectedFoods();
      expect(selected.length).toBe(1);
      expect(selected[0].servings).toBe(2);
      expect(selected[0].totalCarbs).toBe(38);

      service.addFood(banana);
      service.addFood(milk);

      selected = service.selectedFoods();
      expect(selected.length).toBe(3);
      expect(selected.map(s => s.food.id)).toEqual(
        expect.arrayContaining(['apple', 'banana', 'milk'])
      );
    });

    it('should round carbs correctly and update totalCarbs signal', () => {
      const apple = service.getFoodById('apple')!;

      expect(service.totalCarbs()).toBe(0);

      service.addFood(apple, 1.5);
      expect(service.selectedFoods()[0].totalCarbs).toBe(28.5);
      expect(service.totalCarbs()).toBeGreaterThan(0);
    });
  });

  describe('updateServings', () => {
    it('should update servings and recalculate carbs correctly', () => {
      const banana = service.getFoodById('banana')!;
      service.addFood(banana, 1);
      expect(service.totalCarbs()).toBe(27);

      service.updateServings('banana', 3);
      const selected = service.selectedFoods();
      expect(selected[0].servings).toBe(3);
      expect(selected[0].totalCarbs).toBe(81);
      expect(service.totalCarbs()).toBe(81);

      // Fractional servings
      service.updateServings('banana', 0.5);
      expect(service.selectedFoods()[0].totalCarbs).toBe(13.5);
    });

    it('should not affect other foods and ignore non-existent IDs', () => {
      const apple = service.getFoodById('apple')!;
      const banana = service.getFoodById('banana')!;

      service.addFood(apple, 1);
      service.addFood(banana, 1);

      service.updateServings('apple', 2);
      const selected = service.selectedFoods();
      expect(selected.find(s => s.food.id === 'apple')?.servings).toBe(2);
      expect(selected.find(s => s.food.id === 'banana')?.servings).toBe(1);

      // Non-existent ID should do nothing
      service.updateServings('nonexistent', 5);
      expect(selected.length).toBe(2);
    });
  });

  describe('removeFood', () => {
    it('should remove food and update total carbs correctly', () => {
      const apple = service.getFoodById('apple')!;
      const banana = service.getFoodById('banana')!;
      const milk = service.getFoodById('milk')!;

      service.addFood(apple);
      service.addFood(banana);
      service.addFood(milk);
      expect(service.totalCarbs()).toBe(58);

      service.removeFood('apple');
      expect(service.totalCarbs()).toBe(39);

      const selected = service.selectedFoods();
      expect(selected.map(s => s.food.id)).not.toContain('apple');
      expect(selected.map(s => s.food.id)).toContain('banana');
      expect(selected.map(s => s.food.id)).toContain('milk');
    });

    it('should handle removing non-existent ID and from empty selection', () => {
      const apple = service.getFoodById('apple')!;
      service.addFood(apple);

      service.removeFood('banana');
      expect(service.selectedFoods().length).toBe(1);

      service.clearSelection();
      service.removeFood('apple');
      expect(service.selectedFoods().length).toBe(0);
    });
  });

  describe('clearSelection', () => {
    it('should clear all foods and reset total carbs', () => {
      const apple = service.getFoodById('apple')!;
      const banana = service.getFoodById('banana')!;

      service.addFood(apple);
      service.addFood(banana);
      expect(service.totalCarbs()).toBeGreaterThan(0);

      service.clearSelection();
      expect(service.selectedFoods().length).toBe(0);
      expect(service.totalCarbs()).toBe(0);

      // Safe to call on empty selection
      service.clearSelection();
      expect(service.totalCarbs()).toBe(0);
    });
  });

  describe('getSelectionResult', () => {
    it('should return correct selection result matching signal values', () => {
      const apple = service.getFoodById('apple')!;
      const banana = service.getFoodById('banana')!;

      // Empty result
      let result = service.getSelectionResult();
      expect(result.selectedFoods).toEqual([]);
      expect(result.totalCarbs).toBe(0);

      // With foods
      service.addFood(apple, 1);
      service.addFood(banana, 2);
      result = service.getSelectionResult();

      expect(result.selectedFoods.length).toBe(2);
      expect(result.totalCarbs).toBe(73);
      expect(result.selectedFoods).toEqual(service.selectedFoods());
      expect(result.totalCarbs).toBe(service.totalCarbs());
    });
  });

  describe('getSortedCategories', () => {
    it('should return all categories sorted by order with correct properties', () => {
      const categories = service.getSortedCategories();

      expect(categories.length).toBe(9);
      expect(categories[0].key).toBe('fruits');
      expect(categories[0].order).toBe(1);

      // Check sort order
      for (let i = 0; i < categories.length - 1; i++) {
        expect(categories[i].order).toBeLessThanOrEqual(categories[i + 1].order);
      }

      // All categories present
      const keys = categories.map(c => c.key);
      [
        'fruits',
        'grains',
        'dairy',
        'snacks',
        'drinks',
        'meals',
        'desserts',
        'vegetables',
        'proteins',
      ].forEach(key => expect(keys).toContain(key));

      // All required properties
      categories.forEach(cat => {
        ['key', 'nameKey', 'emoji', 'order'].forEach(prop => expect(cat).toHaveProperty(prop));
      });

      // Returns a copy
      expect(service.getSortedCategories()).not.toBe(categories);
    });
  });

  describe('totalCarbs computed signal', () => {
    it('should correctly compute total from multiple foods and update on changes', () => {
      const apple = service.getFoodById('apple')!;
      const banana = service.getFoodById('banana')!;
      const milk = service.getFoodById('milk')!;

      expect(service.totalCarbs()).toBe(0);

      service.addFood(apple, 1);
      expect(service.totalCarbs()).toBe(19);

      service.addFood(banana, 2);
      service.addFood(milk, 1);
      expect(service.totalCarbs()).toBe(85);

      service.updateServings('banana', 1);
      expect(service.totalCarbs()).toBe(58);

      service.removeFood('apple');
      expect(service.totalCarbs()).toBe(39);
    });
  });

  describe('Complex meal planning scenarios', () => {
    it('should handle various meal scenarios correctly', () => {
      const scenarios = [
        {
          foods: [
            ['rice', 0.5],
            ['chicken', 1],
            ['milk', 1],
            ['apple', 1],
          ],
          expectedCarbs: 53.5,
          name: 'balanced meal',
        },
        {
          foods: [
            ['cookies', 2],
            ['milk', 1],
          ],
          expectedCarbs: 32,
          name: 'snack',
        },
        {
          foods: [
            ['pizza-slice', 2],
            ['soda', 1],
            ['ice-cream', 1],
          ],
          expectedCarbs: 121,
          name: 'high-carb',
        },
        {
          foods: [
            ['egg', 2],
            ['chicken', 1],
            ['cheese', 1],
          ],
          expectedCarbs: 3,
          name: 'low-carb',
        },
      ] as const;

      scenarios.forEach(({ foods, expectedCarbs, name }) => {
        service.clearSelection();
        foods.forEach(([id, servings]) => {
          const food = service.getFoodById(id as string)!;
          service.addFood(food, servings);
        });
        expect(service.totalCarbs(), `${name} scenario`).toBe(expectedCarbs);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle zero, large, and decimal servings', () => {
      const apple = service.getFoodById('apple')!;
      const rice = service.getFoodById('rice')!;
      const banana = service.getFoodById('banana')!;

      // Zero servings
      service.addFood(apple, 1);
      service.updateServings('apple', 0);
      expect(service.selectedFoods()[0].totalCarbs).toBe(0);
      expect(service.totalCarbs()).toBe(0);

      // Large servings
      service.clearSelection();
      service.addFood(rice, 10);
      expect(service.totalCarbs()).toBe(450);

      // Decimal precision
      service.clearSelection();
      service.addFood(banana, 1.333);
      expect(service.selectedFoods()[0].totalCarbs).toBeCloseTo(36, 0);
    });

    it('should maintain singleton behavior', () => {
      const service2 = TestBed.inject(FoodService);
      const apple = service.getFoodById('apple')!;

      service.addFood(apple, 1);
      expect(service2.selectedFoods().length).toBe(1);
      expect(service2.totalCarbs()).toBe(19);

      service.clearSelection();
      expect(service2.selectedFoods().length).toBe(0);
    });
  });

  describe('Data integrity', () => {
    it('should have valid data for all foods', () => {
      const allFoods = service.getAllFoods();
      const ids = new Set<string>();
      const validGI = ['low', 'medium', 'high', undefined];

      allFoods.forEach(food => {
        // Valid carbs and servings
        expect(food.carbsPerServing).toBeGreaterThanOrEqual(0);
        expect(typeof food.carbsPerServing).toBe('number');
        expect(food.servingSize).toBeGreaterThan(0);
        expect(typeof food.servingSize).toBe('number');

        // Unique IDs
        expect(ids.has(food.id)).toBe(false);
        ids.add(food.id);

        // Valid glycemic index
        expect(validGI).toContain(food.glycemicIndex);

        // Keywords array of strings
        if (food.keywords) {
          expect(Array.isArray(food.keywords)).toBe(true);
          food.keywords.forEach(kw => expect(typeof kw).toBe('string'));
        }

        // Fiber non-negative
        if (food.fiber !== undefined) {
          expect(food.fiber).toBeGreaterThanOrEqual(0);
        }
      });
    });

    it('should have at least one food per category', () => {
      const categories = service.getSortedCategories();
      categories.forEach(cat => {
        expect(service.getFoodsByCategory(cat.key).length).toBeGreaterThan(0);
      });
    });
  });
});
