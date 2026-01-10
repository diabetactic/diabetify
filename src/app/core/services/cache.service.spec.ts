// Initialize TestBed environment for Vitest
import '../../../test-setup';

import Dexie from 'dexie';
import 'fake-indexeddb/auto';
import FDBFactory from 'fake-indexeddb/lib/FDBFactory';
import { CacheService } from '@services/cache.service';
import { FoodItem } from '@models/food.model';

describe('CacheService', () => {
  let service: CacheService;

  const mockFoodItem: FoodItem = {
    id: 'apple-001',
    name: 'Apple',
    nameKey: 'food.apple',
    carbsPerServing: 19,
    servingSize: 150,
    servingUnit: 'g',
    category: 'fruits',
    emoji: '🍎',
    fiber: 3,
    glycemicIndex: 'low',
    isFavorite: false,
    keywords: ['apple', 'manzana', 'fruit'],
  };

  const mockFoodItem2: FoodItem = {
    id: 'banana-002',
    name: 'Banana',
    nameKey: 'food.banana',
    carbsPerServing: 27,
    servingSize: 120,
    servingUnit: 'g',
    category: 'fruits',
    emoji: '🍌',
    fiber: 2.6,
    glycemicIndex: 'medium',
    isFavorite: true,
    keywords: ['banana', 'platano', 'fruit'],
  };

  beforeEach(async () => {
    // Reset IndexedDB for each test
    (global as any).indexedDB = new FDBFactory();
    Dexie.dependencies.indexedDB = (global as any).indexedDB;

    // Delete any existing database
    await Dexie.delete('diabetactic-cache');

    // Create a fresh service instance
    service = new CacheService();
    await service.open();
  });

  afterEach(async () => {
    if (service?.isOpen()) {
      await service.close();
    }
    await Dexie.delete('diabetactic-cache');
  });

  // ============================================================================
  // DATABASE INITIALIZATION
  // ============================================================================

  describe('Database Initialization', () => {
    it('should initialize with correct database name', () => {
      expect(service.name).toBe('diabetactic-cache');
    });

    it('should have version 1', () => {
      expect(service.verno).toBe(1);
    });

    it('should have foodItems table defined', () => {
      expect(service.foodItems).toBeDefined();
    });

    it('should have correct schema for foodItems table', () => {
      const schema = service.table('foodItems').schema;
      expect(schema.primKey.name).toBe('id');
      expect(schema.indexes.some(idx => idx.name === 'name')).toBe(true);
    });

    it('should start with empty foodItems table', async () => {
      const count = await service.foodItems.count();
      expect(count).toBe(0);
    });
  });

  // ============================================================================
  // addFoodItem() - SET OPERATIONS
  // ============================================================================

  describe('addFoodItem (set operations)', () => {
    it('should add a food item to the cache', async () => {
      await service.addFoodItem(mockFoodItem);
      const count = await service.foodItems.count();
      expect(count).toBe(1);
    });

    it('should store all food item properties correctly', async () => {
      await service.addFoodItem(mockFoodItem);
      const stored = await service.foodItems.get('apple-001');

      expect(stored).toBeDefined();
      expect(stored!.id).toBe('apple-001');
      expect(stored!.name).toBe('Apple');
      expect(stored!.nameKey).toBe('food.apple');
      expect(stored!.carbsPerServing).toBe(19);
      expect(stored!.servingSize).toBe(150);
      expect(stored!.servingUnit).toBe('g');
      expect(stored!.category).toBe('fruits');
      expect(stored!.emoji).toBe('🍎');
      expect(stored!.fiber).toBe(3);
      expect(stored!.glycemicIndex).toBe('low');
      expect(stored!.isFavorite).toBe(false);
      expect(stored!.keywords).toEqual(['apple', 'manzana', 'fruit']);
    });

    it('should add multiple food items', async () => {
      await service.addFoodItem(mockFoodItem);
      await service.addFoodItem(mockFoodItem2);

      const count = await service.foodItems.count();
      expect(count).toBe(2);
    });

    it('should update existing food item with same id (upsert behavior)', async () => {
      await service.addFoodItem(mockFoodItem);

      const updatedItem: FoodItem = {
        ...mockFoodItem,
        name: 'Green Apple',
        carbsPerServing: 18,
      };
      await service.addFoodItem(updatedItem);

      const count = await service.foodItems.count();
      expect(count).toBe(1);

      const stored = await service.foodItems.get('apple-001');
      expect(stored!.name).toBe('Green Apple');
      expect(stored!.carbsPerServing).toBe(18);
    });

    it('should handle food item without optional properties', async () => {
      const minimalItem: FoodItem = {
        id: 'minimal-001',
        name: 'Minimal Food',
        nameKey: 'food.minimal',
        carbsPerServing: 10,
        servingSize: 100,
        servingUnit: 'g',
        category: 'snacks',
        emoji: '🍪',
      };

      await service.addFoodItem(minimalItem);
      const stored = await service.foodItems.get('minimal-001');

      expect(stored).toBeDefined();
      expect(stored!.fiber).toBeUndefined();
      expect(stored!.glycemicIndex).toBeUndefined();
      expect(stored!.isFavorite).toBeUndefined();
      expect(stored!.keywords).toBeUndefined();
    });
  });

  // ============================================================================
  // getFoodItem() - GET OPERATIONS
  // ============================================================================

  describe('getFoodItem (get operations)', () => {
    it('should retrieve a stored food item by id', async () => {
      await service.addFoodItem(mockFoodItem);
      const retrieved = await service.getFoodItem('apple-001');

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe('apple-001');
      expect(retrieved!.name).toBe('Apple');
    });

    it('should return undefined for non-existent id', async () => {
      const retrieved = await service.getFoodItem('non-existent-id');
      expect(retrieved).toBeUndefined();
    });

    it('should return undefined from empty cache', async () => {
      const retrieved = await service.getFoodItem('any-id');
      expect(retrieved).toBeUndefined();
    });

    it('should retrieve correct item when multiple items exist', async () => {
      await service.addFoodItem(mockFoodItem);
      await service.addFoodItem(mockFoodItem2);

      const apple = await service.getFoodItem('apple-001');
      const banana = await service.getFoodItem('banana-002');

      expect(apple!.name).toBe('Apple');
      expect(banana!.name).toBe('Banana');
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    describe('Empty and null values', () => {
      it('should handle empty string id', async () => {
        const itemWithEmptyId: FoodItem = {
          ...mockFoodItem,
          id: '',
        };
        await service.addFoodItem(itemWithEmptyId);
        const retrieved = await service.getFoodItem('');
        expect(retrieved).toBeDefined();
        expect(retrieved!.id).toBe('');
      });

      it('should handle empty string name', async () => {
        const itemWithEmptyName: FoodItem = {
          ...mockFoodItem,
          id: 'empty-name-001',
          name: '',
        };
        await service.addFoodItem(itemWithEmptyName);
        const retrieved = await service.getFoodItem('empty-name-001');
        expect(retrieved!.name).toBe('');
      });

      it('should handle zero carbs', async () => {
        const zeroCarbs: FoodItem = {
          ...mockFoodItem,
          id: 'zero-carbs-001',
          carbsPerServing: 0,
        };
        await service.addFoodItem(zeroCarbs);
        const retrieved = await service.getFoodItem('zero-carbs-001');
        expect(retrieved!.carbsPerServing).toBe(0);
      });

      it('should handle empty keywords array', async () => {
        const emptyKeywords: FoodItem = {
          ...mockFoodItem,
          id: 'empty-keywords-001',
          keywords: [],
        };
        await service.addFoodItem(emptyKeywords);
        const retrieved = await service.getFoodItem('empty-keywords-001');
        expect(retrieved!.keywords).toEqual([]);
      });
    });

    describe('Large objects', () => {
      it('should handle food item with very long name', async () => {
        const longName = 'A'.repeat(1000);
        const largeItem: FoodItem = {
          ...mockFoodItem,
          id: 'large-name-001',
          name: longName,
        };
        await service.addFoodItem(largeItem);
        const retrieved = await service.getFoodItem('large-name-001');
        expect(retrieved!.name).toBe(longName);
        expect(retrieved!.name.length).toBe(1000);
      });

      it('should handle food item with many keywords', async () => {
        const manyKeywords = Array.from({ length: 100 }, (_, i) => `keyword-${i}`);
        const largeKeywordsItem: FoodItem = {
          ...mockFoodItem,
          id: 'many-keywords-001',
          keywords: manyKeywords,
        };
        await service.addFoodItem(largeKeywordsItem);
        const retrieved = await service.getFoodItem('many-keywords-001');
        expect(retrieved!.keywords).toHaveLength(100);
        expect(retrieved!.keywords).toEqual(manyKeywords);
      });

      it('should handle storing many food items', async () => {
        const items = Array.from({ length: 500 }, (_, i) => ({
          ...mockFoodItem,
          id: `food-${i}`,
          name: `Food ${i}`,
        }));

        for (const item of items) {
          await service.addFoodItem(item);
        }

        const count = await service.foodItems.count();
        expect(count).toBe(500);

        // Verify random items
        const item0 = await service.getFoodItem('food-0');
        const item250 = await service.getFoodItem('food-250');
        const item499 = await service.getFoodItem('food-499');

        expect(item0!.name).toBe('Food 0');
        expect(item250!.name).toBe('Food 250');
        expect(item499!.name).toBe('Food 499');
      });
    });

    describe('Special characters', () => {
      it('should handle special characters in id', async () => {
        const specialId = 'food_with-special.chars:123/456';
        const item: FoodItem = {
          ...mockFoodItem,
          id: specialId,
        };
        await service.addFoodItem(item);
        const retrieved = await service.getFoodItem(specialId);
        expect(retrieved).toBeDefined();
        expect(retrieved!.id).toBe(specialId);
      });

      it('should handle unicode characters in name', async () => {
        const unicodeName = 'Manzana Roja - Apple - Pomme - Apfel';
        const item: FoodItem = {
          ...mockFoodItem,
          id: 'unicode-001',
          name: unicodeName,
        };
        await service.addFoodItem(item);
        const retrieved = await service.getFoodItem('unicode-001');
        expect(retrieved!.name).toBe(unicodeName);
      });

      it('should handle emoji in emoji field', async () => {
        const complexEmoji = '🍎🍏';
        const item: FoodItem = {
          ...mockFoodItem,
          id: 'emoji-001',
          emoji: complexEmoji,
        };
        await service.addFoodItem(item);
        const retrieved = await service.getFoodItem('emoji-001');
        expect(retrieved!.emoji).toBe(complexEmoji);
      });
    });

    describe('Numeric edge cases', () => {
      it('should handle decimal carbs per serving', async () => {
        const decimalCarbs: FoodItem = {
          ...mockFoodItem,
          id: 'decimal-001',
          carbsPerServing: 15.5,
        };
        await service.addFoodItem(decimalCarbs);
        const retrieved = await service.getFoodItem('decimal-001');
        expect(retrieved!.carbsPerServing).toBe(15.5);
      });

      it('should handle very small serving size', async () => {
        const smallServing: FoodItem = {
          ...mockFoodItem,
          id: 'small-serving-001',
          servingSize: 0.5,
        };
        await service.addFoodItem(smallServing);
        const retrieved = await service.getFoodItem('small-serving-001');
        expect(retrieved!.servingSize).toBe(0.5);
      });

      it('should handle large numbers', async () => {
        const largeNumbers: FoodItem = {
          ...mockFoodItem,
          id: 'large-numbers-001',
          carbsPerServing: 999999,
          servingSize: 10000,
        };
        await service.addFoodItem(largeNumbers);
        const retrieved = await service.getFoodItem('large-numbers-001');
        expect(retrieved!.carbsPerServing).toBe(999999);
        expect(retrieved!.servingSize).toBe(10000);
      });
    });
  });

  // ============================================================================
  // CONCURRENT OPERATIONS
  // ============================================================================

  describe('Concurrent Operations', () => {
    it('should handle concurrent add operations', async () => {
      const items = Array.from({ length: 20 }, (_, i) => ({
        ...mockFoodItem,
        id: `concurrent-${i}`,
        name: `Concurrent Food ${i}`,
      }));

      await Promise.all(items.map(item => service.addFoodItem(item)));

      const count = await service.foodItems.count();
      expect(count).toBe(20);
    });

    it('should handle concurrent get operations', async () => {
      // First add items
      const items = Array.from({ length: 10 }, (_, i) => ({
        ...mockFoodItem,
        id: `read-${i}`,
        name: `Read Food ${i}`,
      }));

      for (const item of items) {
        await service.addFoodItem(item);
      }

      // Then concurrent reads
      const results = await Promise.all(items.map(item => service.getFoodItem(item.id)));

      expect(results.every(r => r !== undefined)).toBe(true);
      results.forEach((result, i) => {
        expect(result!.name).toBe(`Read Food ${i}`);
      });
    });

    it('should handle mixed concurrent read and write operations', async () => {
      // Pre-populate some data
      await service.addFoodItem(mockFoodItem);
      await service.addFoodItem(mockFoodItem2);

      // Mixed operations
      const operations = [
        service.getFoodItem('apple-001'),
        service.addFoodItem({ ...mockFoodItem, id: 'new-001', name: 'New Food 1' }),
        service.getFoodItem('banana-002'),
        service.addFoodItem({ ...mockFoodItem, id: 'new-002', name: 'New Food 2' }),
        service.getFoodItem('apple-001'),
      ];

      const results = await Promise.all(operations);

      // Verify reads returned data
      expect(results[0]).toBeDefined();
      expect(results[2]).toBeDefined();
      expect(results[4]).toBeDefined();

      // Verify writes completed
      const count = await service.foodItems.count();
      expect(count).toBe(4); // 2 original + 2 new
    });
  });

  // ============================================================================
  // DATABASE LIFECYCLE
  // ============================================================================

  describe('Database Lifecycle', () => {
    it('should persist data after reopening', async () => {
      await service.addFoodItem(mockFoodItem);
      await service.close();

      // Reopen
      service = new CacheService();
      await service.open();

      const retrieved = await service.getFoodItem('apple-001');
      expect(retrieved).toBeDefined();
      expect(retrieved!.name).toBe('Apple');
    });

    it('should handle operations after database close and reopen', async () => {
      await service.addFoodItem(mockFoodItem);
      await service.close();

      // Reopen and add more
      service = new CacheService();
      await service.open();

      await service.addFoodItem(mockFoodItem2);
      const count = await service.foodItems.count();
      expect(count).toBe(2);
    });
  });

  // ============================================================================
  // DATA INTEGRITY
  // ============================================================================

  describe('Data Integrity', () => {
    it('should maintain data integrity after multiple updates', async () => {
      await service.addFoodItem(mockFoodItem);

      // Multiple updates
      for (let i = 0; i < 10; i++) {
        await service.addFoodItem({
          ...mockFoodItem,
          carbsPerServing: i * 10,
        });
      }

      const retrieved = await service.getFoodItem('apple-001');
      expect(retrieved!.carbsPerServing).toBe(90); // Last update: 9 * 10
    });

    it('should not corrupt other items when updating one', async () => {
      await service.addFoodItem(mockFoodItem);
      await service.addFoodItem(mockFoodItem2);

      // Update only apple
      await service.addFoodItem({
        ...mockFoodItem,
        name: 'Updated Apple',
      });

      // Verify banana is unchanged
      const banana = await service.getFoodItem('banana-002');
      expect(banana!.name).toBe('Banana');
      expect(banana!.carbsPerServing).toBe(27);
    });

    it('should return independent copies, not references', async () => {
      await service.addFoodItem(mockFoodItem);

      const retrieved1 = await service.getFoodItem('apple-001');
      const retrieved2 = await service.getFoodItem('apple-001');

      expect(retrieved1).not.toBe(retrieved2);
      expect(retrieved1).toEqual(retrieved2);
    });
  });

  // ============================================================================
  // QUERY BY NAME (INDEX)
  // ============================================================================

  describe('Query by Name Index', () => {
    it('should query items by name using index', async () => {
      await service.addFoodItem(mockFoodItem);
      await service.addFoodItem(mockFoodItem2);

      const results = await service.foodItems.where('name').equals('Apple').toArray();

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('apple-001');
    });

    it('should find multiple items with similar names', async () => {
      await service.addFoodItem(mockFoodItem);
      await service.addFoodItem({
        ...mockFoodItem,
        id: 'apple-002',
        name: 'Apple',
      });

      const results = await service.foodItems.where('name').equals('Apple').toArray();
      expect(results).toHaveLength(2);
    });

    it('should return empty array when no match', async () => {
      await service.addFoodItem(mockFoodItem);

      const results = await service.foodItems.where('name').equals('Orange').toArray();
      expect(results).toHaveLength(0);
    });
  });

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  describe('Error Handling', () => {
    it('should throw on operations after database close', async () => {
      await service.close();

      await expect(service.foodItems.add(mockFoodItem)).rejects.toThrow();
    });

    it('should handle reopening closed database', async () => {
      await service.close();

      // Reopen
      await service.open();

      // Should work now
      await service.addFoodItem(mockFoodItem);
      const retrieved = await service.getFoodItem('apple-001');
      expect(retrieved).toBeDefined();
    });
  });

  // ============================================================================
  // TTL (TIME-TO-LIVE) EXPIRATION TESTS
  // ============================================================================

  describe('TTL (Time-to-Live) Expiration', () => {
    // Note: The current CacheService implementation does not have TTL support.
    // These tests document expected behavior for future TTL implementation.

    it('should currently store items indefinitely (no TTL support)', async () => {
      // Current implementation has no TTL - items persist until manually deleted
      await service.addFoodItem(mockFoodItem);

      // Item should be retrievable immediately
      const retrieved = await service.getFoodItem('apple-001');
      expect(retrieved).toBeDefined();

      // Without TTL, items never auto-expire
      // When TTL is implemented, additional tests would verify expiration behavior
    });
  });

  // ============================================================================
  // CACHE INVALIDATION TESTS
  // ============================================================================

  describe('Cache Invalidation', () => {
    // Note: The current CacheService implementation does not have explicit
    // invalidation methods. These tests use Dexie's built-in delete methods.

    it('should invalidate single item', async () => {
      await service.addFoodItem(mockFoodItem);
      await service.addFoodItem(mockFoodItem2);

      await service.foodItems.delete('apple-001');

      const apple = await service.getFoodItem('apple-001');
      const banana = await service.getFoodItem('banana-002');

      expect(apple).toBeUndefined();
      expect(banana).toBeDefined();
    });

    it('should invalidate all items (clear cache)', async () => {
      await service.addFoodItem(mockFoodItem);
      await service.addFoodItem(mockFoodItem2);

      await service.foodItems.clear();

      const count = await service.foodItems.count();
      expect(count).toBe(0);
    });

    it('should invalidate items by criteria', async () => {
      // Add items of different categories
      await service.addFoodItem(mockFoodItem); // fruits
      await service.addFoodItem(mockFoodItem2); // fruits
      await service.addFoodItem({
        ...mockFoodItem,
        id: 'cookie-001',
        name: 'Cookie',
        category: 'snacks',
      });

      // Delete all fruits (using filter since category is not indexed)
      const fruits = await service.foodItems.filter(item => item.category === 'fruits').toArray();
      await Promise.all(fruits.map(item => service.foodItems.delete(item.id)));

      const remainingCount = await service.foodItems.count();
      expect(remainingCount).toBe(1);

      const cookie = await service.getFoodItem('cookie-001');
      expect(cookie).toBeDefined();
    });

    it('should handle invalidation of non-existent item gracefully', async () => {
      await service.addFoodItem(mockFoodItem);

      // Deleting non-existent item should not throw
      await expect(service.foodItems.delete('non-existent')).resolves.not.toThrow();

      // Original item should still exist
      const apple = await service.getFoodItem('apple-001');
      expect(apple).toBeDefined();
    });

    it('should invalidate and re-add item', async () => {
      await service.addFoodItem(mockFoodItem);
      await service.foodItems.delete('apple-001');

      // Re-add with different data
      await service.addFoodItem({
        ...mockFoodItem,
        name: 'Red Apple',
      });

      const retrieved = await service.getFoodItem('apple-001');
      expect(retrieved!.name).toBe('Red Apple');
    });
  });

  // ============================================================================
  // KEY PATTERNS AND NAMESPACING
  // ============================================================================

  describe('Key Patterns and Namespacing', () => {
    // Note: The current implementation uses simple string IDs.
    // These tests demonstrate using ID patterns for logical namespacing.

    it('should support namespaced keys', async () => {
      // Using ID prefixes as namespace convention
      const userFoodItem: FoodItem = {
        ...mockFoodItem,
        id: 'user:123:apple-001',
      };
      const globalFoodItem: FoodItem = {
        ...mockFoodItem,
        id: 'global:apple-001',
      };

      await service.addFoodItem(userFoodItem);
      await service.addFoodItem(globalFoodItem);

      const userItem = await service.getFoodItem('user:123:apple-001');
      const globalItem = await service.getFoodItem('global:apple-001');

      expect(userItem).toBeDefined();
      expect(globalItem).toBeDefined();
    });

    it('should query by namespace pattern', async () => {
      const items = [
        { ...mockFoodItem, id: 'user:123:item-1', name: 'User Item 1' },
        { ...mockFoodItem, id: 'user:123:item-2', name: 'User Item 2' },
        { ...mockFoodItem, id: 'user:456:item-1', name: 'Other User Item' },
        { ...mockFoodItem, id: 'global:item-1', name: 'Global Item' },
      ];

      for (const item of items) {
        await service.addFoodItem(item);
      }

      // Query user:123 namespace
      const user123Items = await service.foodItems
        .filter(item => item.id.startsWith('user:123:'))
        .toArray();

      expect(user123Items).toHaveLength(2);
      expect(user123Items.every(item => item.id.startsWith('user:123:'))).toBe(true);
    });

    it('should invalidate by namespace pattern', async () => {
      const items = [
        { ...mockFoodItem, id: 'temp:item-1' },
        { ...mockFoodItem, id: 'temp:item-2' },
        { ...mockFoodItem, id: 'perm:item-1' },
      ];

      for (const item of items) {
        await service.addFoodItem(item);
      }

      // Delete all temp items
      const tempItems = await service.foodItems
        .filter(item => item.id.startsWith('temp:'))
        .toArray();
      await Promise.all(tempItems.map(item => service.foodItems.delete(item.id)));

      const remainingCount = await service.foodItems.count();
      expect(remainingCount).toBe(1);

      const permItem = await service.getFoodItem('perm:item-1');
      expect(permItem).toBeDefined();
    });
  });

  // ============================================================================
  // MEMORY LIMITS (INDEXEDDB STORAGE)
  // ============================================================================

  describe('Memory/Storage Limits', () => {
    // Note: IndexedDB has browser-enforced storage limits.
    // These tests verify handling of large datasets.

    it('should handle bulk insert of many items', async () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({
        ...mockFoodItem,
        id: `bulk-${i}`,
        name: `Bulk Food ${i}`,
        keywords: [`keyword-${i}`, 'bulk', 'test'],
      }));

      await service.foodItems.bulkPut(items);

      const count = await service.foodItems.count();
      expect(count).toBe(1000);
    });

    it('should handle items with large data payload', async () => {
      const largeKeywords = Array.from(
        { length: 1000 },
        (_, i) => `very-long-keyword-${i}-${'x'.repeat(100)}`
      );
      const largeItem: FoodItem = {
        ...mockFoodItem,
        id: 'large-payload-001',
        name: 'A'.repeat(10000),
        nameKey: 'B'.repeat(5000),
        keywords: largeKeywords,
      };

      await service.addFoodItem(largeItem);
      const retrieved = await service.getFoodItem('large-payload-001');

      expect(retrieved).toBeDefined();
      expect(retrieved!.name.length).toBe(10000);
      expect(retrieved!.keywords!.length).toBe(1000);
    });

    it('should report storage statistics', async () => {
      await service.addFoodItem(mockFoodItem);
      await service.addFoodItem(mockFoodItem2);

      const count = await service.foodItems.count();
      const allItems = await service.foodItems.toArray();

      expect(count).toBe(2);
      expect(allItems).toHaveLength(2);
    });
  });

  // ============================================================================
  // ALL CATEGORY TYPES
  // ============================================================================

  describe('Food Category Coverage', () => {
    const categories: Array<FoodItem['category']> = [
      'fruits',
      'vegetables',
      'grains',
      'dairy',
      'proteins',
      'snacks',
      'drinks',
      'meals',
      'desserts',
      'scanned',
    ];

    it('should handle all food categories', async () => {
      const items = categories.map((category, i) => ({
        ...mockFoodItem,
        id: `category-${i}`,
        name: `${category} item`,
        category,
      }));

      for (const item of items) {
        await service.addFoodItem(item);
      }

      const count = await service.foodItems.count();
      expect(count).toBe(categories.length);

      // Verify each category is stored correctly
      for (let i = 0; i < categories.length; i++) {
        const retrieved = await service.getFoodItem(`category-${i}`);
        expect(retrieved!.category).toBe(categories[i]);
      }
    });
  });

  // ============================================================================
  // PORTION UNIT TYPES
  // ============================================================================

  describe('Portion Unit Coverage', () => {
    const portionUnits: Array<FoodItem['servingUnit']> = [
      'g',
      'ml',
      'cup',
      'piece',
      'slice',
      'tablespoon',
      'teaspoon',
      'serving',
    ];

    it('should handle all portion unit types', async () => {
      const items = portionUnits.map((unit, i) => ({
        ...mockFoodItem,
        id: `unit-${i}`,
        name: `${unit} item`,
        servingUnit: unit,
      }));

      for (const item of items) {
        await service.addFoodItem(item);
      }

      const count = await service.foodItems.count();
      expect(count).toBe(portionUnits.length);

      // Verify each unit is stored correctly
      for (let i = 0; i < portionUnits.length; i++) {
        const retrieved = await service.getFoodItem(`unit-${i}`);
        expect(retrieved!.servingUnit).toBe(portionUnits[i]);
      }
    });
  });

  // ============================================================================
  // GLYCEMIC INDEX VALUES
  // ============================================================================

  describe('Glycemic Index Coverage', () => {
    const giValues: Array<FoodItem['glycemicIndex']> = ['low', 'medium', 'high', undefined];

    it('should handle all glycemic index values', async () => {
      const items = giValues.map((gi, i) => ({
        ...mockFoodItem,
        id: `gi-${i}`,
        name: `GI ${gi || 'none'} item`,
        glycemicIndex: gi,
      }));

      for (const item of items) {
        await service.addFoodItem(item);
      }

      // Verify each GI value is stored correctly
      for (let i = 0; i < giValues.length; i++) {
        const retrieved = await service.getFoodItem(`gi-${i}`);
        expect(retrieved!.glycemicIndex).toBe(giValues[i]);
      }
    });
  });
});
