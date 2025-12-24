import { Injectable, signal, computed } from '@angular/core';
import {
  FoodItem,
  FoodCategory,
  FoodCategoryInfo,
  SelectedFood,
  FoodPickerResult,
} from '@models/food.model';

/**
 * Service for managing food database and carbohydrate counting
 * Provides a kid-friendly food database for the bolus calculator food picker
 */
@Injectable({ providedIn: 'root' })
export class FoodService {
  /** Currently selected foods */
  private selectedFoodsSignal = signal<SelectedFood[]>([]);

  /** Computed total carbs from all selections */
  readonly totalCarbs = computed(() =>
    this.selectedFoodsSignal().reduce((sum, sf) => sum + sf.totalCarbs, 0)
  );

  /** Computed selected foods array */
  readonly selectedFoods = computed(() => this.selectedFoodsSignal());

  /** Food categories with display metadata */
  readonly categories: FoodCategoryInfo[] = [
    { key: 'fruits', nameKey: 'foodPicker.categories.fruits', emoji: '🍎', order: 1 },
    { key: 'grains', nameKey: 'foodPicker.categories.grains', emoji: '🍞', order: 2 },
    { key: 'dairy', nameKey: 'foodPicker.categories.dairy', emoji: '🥛', order: 3 },
    { key: 'snacks', nameKey: 'foodPicker.categories.snacks', emoji: '🍪', order: 4 },
    { key: 'drinks', nameKey: 'foodPicker.categories.drinks', emoji: '🧃', order: 5 },
    { key: 'meals', nameKey: 'foodPicker.categories.meals', emoji: '🍽️', order: 6 },
    { key: 'desserts', nameKey: 'foodPicker.categories.desserts', emoji: '🍰', order: 7 },
    { key: 'vegetables', nameKey: 'foodPicker.categories.vegetables', emoji: '🥕', order: 8 },
    { key: 'proteins', nameKey: 'foodPicker.categories.proteins', emoji: '🍗', order: 9 },
  ];

  /**
   * Kid-friendly food database with accurate carb counts
   * Carb values based on USDA food database
   */
  private readonly foodDatabase: FoodItem[] = [
    // === FRUITS ===
    {
      id: 'apple',
      name: 'Apple',
      nameKey: 'foodPicker.foods.apple',
      carbsPerServing: 19,
      servingSize: 1,
      servingUnit: 'piece',
      category: 'fruits',
      emoji: '🍎',
      fiber: 3,
      glycemicIndex: 'low',
      keywords: ['manzana', 'fruta'],
    },
    {
      id: 'banana',
      name: 'Banana',
      nameKey: 'foodPicker.foods.banana',
      carbsPerServing: 27,
      servingSize: 1,
      servingUnit: 'piece',
      category: 'fruits',
      emoji: '🍌',
      fiber: 3,
      glycemicIndex: 'medium',
      keywords: ['plátano', 'banano', 'fruta'],
    },
    {
      id: 'orange',
      name: 'Orange',
      nameKey: 'foodPicker.foods.orange',
      carbsPerServing: 15,
      servingSize: 1,
      servingUnit: 'piece',
      category: 'fruits',
      emoji: '🍊',
      fiber: 3,
      glycemicIndex: 'low',
      keywords: ['naranja', 'fruta'],
    },
    {
      id: 'grapes',
      name: 'Grapes',
      nameKey: 'foodPicker.foods.grapes',
      carbsPerServing: 16,
      servingSize: 1,
      servingUnit: 'cup',
      category: 'fruits',
      emoji: '🍇',
      fiber: 1,
      glycemicIndex: 'medium',
      keywords: ['uvas', 'fruta'],
    },
    {
      id: 'strawberries',
      name: 'Strawberries',
      nameKey: 'foodPicker.foods.strawberries',
      carbsPerServing: 11,
      servingSize: 1,
      servingUnit: 'cup',
      category: 'fruits',
      emoji: '🍓',
      fiber: 3,
      glycemicIndex: 'low',
      keywords: ['fresas', 'frutillas', 'fruta'],
    },
    {
      id: 'watermelon',
      name: 'Watermelon',
      nameKey: 'foodPicker.foods.watermelon',
      carbsPerServing: 11,
      servingSize: 1,
      servingUnit: 'cup',
      category: 'fruits',
      emoji: '🍉',
      fiber: 1,
      glycemicIndex: 'high',
      keywords: ['sandía', 'patilla', 'fruta'],
    },

    // === GRAINS & BREADS ===
    {
      id: 'white-bread',
      name: 'White Bread',
      nameKey: 'foodPicker.foods.whiteBread',
      carbsPerServing: 13,
      servingSize: 1,
      servingUnit: 'slice',
      category: 'grains',
      emoji: '🍞',
      glycemicIndex: 'high',
      keywords: ['pan blanco', 'pan'],
    },
    {
      id: 'rice',
      name: 'Rice',
      nameKey: 'foodPicker.foods.rice',
      carbsPerServing: 45,
      servingSize: 1,
      servingUnit: 'cup',
      category: 'grains',
      emoji: '🍚',
      glycemicIndex: 'high',
      keywords: ['arroz'],
    },
    {
      id: 'pasta',
      name: 'Pasta',
      nameKey: 'foodPicker.foods.pasta',
      carbsPerServing: 43,
      servingSize: 1,
      servingUnit: 'cup',
      category: 'grains',
      emoji: '🍝',
      glycemicIndex: 'medium',
      keywords: ['fideos', 'espaguetis', 'tallarines'],
    },
    {
      id: 'cereal',
      name: 'Cereal',
      nameKey: 'foodPicker.foods.cereal',
      carbsPerServing: 24,
      servingSize: 1,
      servingUnit: 'cup',
      category: 'grains',
      emoji: '🥣',
      glycemicIndex: 'high',
      keywords: ['cereales', 'desayuno'],
    },
    {
      id: 'tortilla',
      name: 'Tortilla',
      nameKey: 'foodPicker.foods.tortilla',
      carbsPerServing: 15,
      servingSize: 1,
      servingUnit: 'piece',
      category: 'grains',
      emoji: '🫓',
      glycemicIndex: 'medium',
      keywords: ['wrap'],
    },
    {
      id: 'crackers',
      name: 'Crackers',
      nameKey: 'foodPicker.foods.crackers',
      carbsPerServing: 10,
      servingSize: 5,
      servingUnit: 'piece',
      category: 'grains',
      emoji: '🧇',
      glycemicIndex: 'medium',
      keywords: ['galletas saladas'],
    },

    // === DAIRY ===
    {
      id: 'milk',
      name: 'Milk',
      nameKey: 'foodPicker.foods.milk',
      carbsPerServing: 12,
      servingSize: 1,
      servingUnit: 'cup',
      category: 'dairy',
      emoji: '🥛',
      glycemicIndex: 'low',
      keywords: ['leche'],
    },
    {
      id: 'yogurt',
      name: 'Yogurt',
      nameKey: 'foodPicker.foods.yogurt',
      carbsPerServing: 17,
      servingSize: 1,
      servingUnit: 'cup',
      category: 'dairy',
      emoji: '🥄',
      glycemicIndex: 'low',
      keywords: ['yogur'],
    },
    {
      id: 'chocolate-milk',
      name: 'Chocolate Milk',
      nameKey: 'foodPicker.foods.chocolateMilk',
      carbsPerServing: 26,
      servingSize: 1,
      servingUnit: 'cup',
      category: 'dairy',
      emoji: '🍫',
      glycemicIndex: 'medium',
      keywords: ['leche chocolatada', 'leche con chocolate'],
    },
    {
      id: 'cheese',
      name: 'Cheese',
      nameKey: 'foodPicker.foods.cheese',
      carbsPerServing: 1,
      servingSize: 1,
      servingUnit: 'slice',
      category: 'dairy',
      emoji: '🧀',
      glycemicIndex: 'low',
      keywords: ['queso'],
    },

    // === SNACKS ===
    {
      id: 'cookies',
      name: 'Cookies',
      nameKey: 'foodPicker.foods.cookies',
      carbsPerServing: 10,
      servingSize: 1,
      servingUnit: 'piece',
      category: 'snacks',
      emoji: '🍪',
      glycemicIndex: 'high',
      keywords: ['galletas', 'galletitas'],
    },
    {
      id: 'chips',
      name: 'Chips',
      nameKey: 'foodPicker.foods.chips',
      carbsPerServing: 15,
      servingSize: 1,
      servingUnit: 'serving',
      category: 'snacks',
      emoji: '🍟',
      glycemicIndex: 'high',
      keywords: ['papas fritas', 'patatas fritas'],
    },
    {
      id: 'popcorn',
      name: 'Popcorn',
      nameKey: 'foodPicker.foods.popcorn',
      carbsPerServing: 6,
      servingSize: 1,
      servingUnit: 'cup',
      category: 'snacks',
      emoji: '🍿',
      fiber: 1,
      glycemicIndex: 'medium',
      keywords: ['palomitas', 'pochoclo', 'cotufas'],
    },
    {
      id: 'granola-bar',
      name: 'Granola Bar',
      nameKey: 'foodPicker.foods.granolaBar',
      carbsPerServing: 20,
      servingSize: 1,
      servingUnit: 'piece',
      category: 'snacks',
      emoji: '🥜',
      glycemicIndex: 'medium',
      keywords: ['barra de granola', 'barra de cereal'],
    },
    {
      id: 'fruit-snacks',
      name: 'Fruit Snacks',
      nameKey: 'foodPicker.foods.fruitSnacks',
      carbsPerServing: 18,
      servingSize: 1,
      servingUnit: 'serving',
      category: 'snacks',
      emoji: '🍬',
      glycemicIndex: 'high',
      keywords: ['gomitas de fruta', 'caramelos de fruta'],
    },

    // === DRINKS ===
    {
      id: 'juice-box',
      name: 'Juice Box',
      nameKey: 'foodPicker.foods.juiceBox',
      carbsPerServing: 15,
      servingSize: 200,
      servingUnit: 'ml',
      category: 'drinks',
      emoji: '🧃',
      glycemicIndex: 'high',
      keywords: ['jugo', 'zumo'],
    },
    {
      id: 'soda',
      name: 'Soda',
      nameKey: 'foodPicker.foods.soda',
      carbsPerServing: 39,
      servingSize: 355,
      servingUnit: 'ml',
      category: 'drinks',
      emoji: '🥤',
      glycemicIndex: 'high',
      keywords: ['refresco', 'gaseosa'],
    },
    {
      id: 'sports-drink',
      name: 'Sports Drink',
      nameKey: 'foodPicker.foods.sportsDrink',
      carbsPerServing: 21,
      servingSize: 355,
      servingUnit: 'ml',
      category: 'drinks',
      emoji: '🏃',
      glycemicIndex: 'high',
      keywords: ['bebida deportiva', 'gatorade'],
    },
    {
      id: 'smoothie',
      name: 'Smoothie',
      nameKey: 'foodPicker.foods.smoothie',
      carbsPerServing: 30,
      servingSize: 1,
      servingUnit: 'cup',
      category: 'drinks',
      emoji: '🥤',
      glycemicIndex: 'medium',
      keywords: ['batido', 'licuado'],
    },

    // === MEALS ===
    {
      id: 'pizza-slice',
      name: 'Pizza Slice',
      nameKey: 'foodPicker.foods.pizzaSlice',
      carbsPerServing: 30,
      servingSize: 1,
      servingUnit: 'slice',
      category: 'meals',
      emoji: '🍕',
      glycemicIndex: 'medium',
      keywords: ['pizza'],
    },
    {
      id: 'hamburger',
      name: 'Hamburger',
      nameKey: 'foodPicker.foods.hamburger',
      carbsPerServing: 25,
      servingSize: 1,
      servingUnit: 'piece',
      category: 'meals',
      emoji: '🍔',
      glycemicIndex: 'medium',
      keywords: ['hamburguesa'],
    },
    {
      id: 'hot-dog',
      name: 'Hot Dog',
      nameKey: 'foodPicker.foods.hotDog',
      carbsPerServing: 22,
      servingSize: 1,
      servingUnit: 'piece',
      category: 'meals',
      emoji: '🌭',
      glycemicIndex: 'medium',
      keywords: ['perro caliente', 'pancho'],
    },
    {
      id: 'tacos',
      name: 'Tacos',
      nameKey: 'foodPicker.foods.tacos',
      carbsPerServing: 15,
      servingSize: 1,
      servingUnit: 'piece',
      category: 'meals',
      emoji: '🌮',
      glycemicIndex: 'medium',
      keywords: ['taco'],
    },
    {
      id: 'sandwich',
      name: 'Sandwich',
      nameKey: 'foodPicker.foods.sandwich',
      carbsPerServing: 30,
      servingSize: 1,
      servingUnit: 'piece',
      category: 'meals',
      emoji: '🥪',
      glycemicIndex: 'medium',
      keywords: ['sándwich', 'sánduche', 'emparedado'],
    },
    {
      id: 'chicken-nuggets',
      name: 'Chicken Nuggets',
      nameKey: 'foodPicker.foods.chickenNuggets',
      carbsPerServing: 15,
      servingSize: 6,
      servingUnit: 'piece',
      category: 'meals',
      emoji: '🍗',
      glycemicIndex: 'medium',
      keywords: ['nuggets de pollo', 'nuggets'],
    },
    {
      id: 'french-fries',
      name: 'French Fries',
      nameKey: 'foodPicker.foods.frenchFries',
      carbsPerServing: 35,
      servingSize: 1,
      servingUnit: 'serving',
      category: 'meals',
      emoji: '🍟',
      glycemicIndex: 'high',
      keywords: ['papas fritas', 'patatas fritas'],
    },
    {
      id: 'mac-cheese',
      name: 'Mac & Cheese',
      nameKey: 'foodPicker.foods.macCheese',
      carbsPerServing: 47,
      servingSize: 1,
      servingUnit: 'cup',
      category: 'meals',
      emoji: '🧀',
      glycemicIndex: 'medium',
      keywords: ['macarrones con queso'],
    },

    // === DESSERTS ===
    {
      id: 'ice-cream',
      name: 'Ice Cream',
      nameKey: 'foodPicker.foods.iceCream',
      carbsPerServing: 22,
      servingSize: 1,
      servingUnit: 'cup',
      category: 'desserts',
      emoji: '🍦',
      glycemicIndex: 'medium',
      keywords: ['helado', 'nieve'],
    },
    {
      id: 'cake-slice',
      name: 'Cake',
      nameKey: 'foodPicker.foods.cake',
      carbsPerServing: 40,
      servingSize: 1,
      servingUnit: 'slice',
      category: 'desserts',
      emoji: '🍰',
      glycemicIndex: 'high',
      keywords: ['torta', 'pastel', 'bizcocho'],
    },
    {
      id: 'cupcake',
      name: 'Cupcake',
      nameKey: 'foodPicker.foods.cupcake',
      carbsPerServing: 30,
      servingSize: 1,
      servingUnit: 'piece',
      category: 'desserts',
      emoji: '🧁',
      glycemicIndex: 'high',
      keywords: ['magdalena', 'muffin'],
    },
    {
      id: 'chocolate',
      name: 'Chocolate',
      nameKey: 'foodPicker.foods.chocolate',
      carbsPerServing: 25,
      servingSize: 40,
      servingUnit: 'g',
      category: 'desserts',
      emoji: '🍫',
      glycemicIndex: 'medium',
      keywords: ['chocolate'],
    },
    {
      id: 'donut',
      name: 'Donut',
      nameKey: 'foodPicker.foods.donut',
      carbsPerServing: 25,
      servingSize: 1,
      servingUnit: 'piece',
      category: 'desserts',
      emoji: '🍩',
      glycemicIndex: 'high',
      keywords: ['dona', 'rosquilla'],
    },

    // === VEGETABLES (low carb options) ===
    {
      id: 'carrot',
      name: 'Carrot',
      nameKey: 'foodPicker.foods.carrot',
      carbsPerServing: 6,
      servingSize: 1,
      servingUnit: 'piece',
      category: 'vegetables',
      emoji: '🥕',
      fiber: 2,
      glycemicIndex: 'low',
      keywords: ['zanahoria'],
    },
    {
      id: 'corn',
      name: 'Corn',
      nameKey: 'foodPicker.foods.corn',
      carbsPerServing: 17,
      servingSize: 1,
      servingUnit: 'cup',
      category: 'vegetables',
      emoji: '🌽',
      fiber: 2,
      glycemicIndex: 'medium',
      keywords: ['maíz', 'choclo', 'elote'],
    },
    {
      id: 'potato',
      name: 'Potato',
      nameKey: 'foodPicker.foods.potato',
      carbsPerServing: 26,
      servingSize: 1,
      servingUnit: 'piece',
      category: 'vegetables',
      emoji: '🥔',
      fiber: 2,
      glycemicIndex: 'high',
      keywords: ['papa', 'patata'],
    },

    // === PROTEINS (very low carb) ===
    {
      id: 'egg',
      name: 'Egg',
      nameKey: 'foodPicker.foods.egg',
      carbsPerServing: 1,
      servingSize: 1,
      servingUnit: 'piece',
      category: 'proteins',
      emoji: '🥚',
      glycemicIndex: 'low',
      keywords: ['huevo'],
    },
    {
      id: 'chicken',
      name: 'Chicken',
      nameKey: 'foodPicker.foods.chicken',
      carbsPerServing: 0,
      servingSize: 100,
      servingUnit: 'g',
      category: 'proteins',
      emoji: '🍗',
      glycemicIndex: 'low',
      keywords: ['pollo'],
    },
  ];

  /**
   * Get all foods
   */
  getAllFoods(): FoodItem[] {
    return [...this.foodDatabase];
  }

  /**
   * Get foods by category
   */
  getFoodsByCategory(category: FoodCategory): FoodItem[] {
    return this.foodDatabase.filter(f => f.category === category);
  }

  /**
   * Search foods by name or keywords
   */
  searchFoods(query: string): FoodItem[] {
    const searchQuery = query.toLowerCase().trim();
    if (!searchQuery) return [];

    return this.foodDatabase.filter(food => {
      const nameMatch = food.name.toLowerCase().includes(searchQuery);
      const keywordMatch = food.keywords?.some(kw => kw.toLowerCase().includes(searchQuery));
      return nameMatch || keywordMatch;
    });
  }

  /**
   * Get a single food by ID
   */
  getFoodById(id: string): FoodItem | undefined {
    return this.foodDatabase.find(f => f.id === id);
  }

  /**
   * Add a food to selection with specified servings
   */
  addFood(food: FoodItem, servings = 1): void {
    const current = this.selectedFoodsSignal();
    const existingIndex = current.findIndex(sf => sf.food.id === food.id);

    if (existingIndex >= 0) {
      // Update existing selection
      const updated = [...current];
      const newServings = updated[existingIndex].servings + servings;
      updated[existingIndex] = {
        food,
        servings: newServings,
        totalCarbs: Math.round(food.carbsPerServing * newServings * 10) / 10,
      };
      this.selectedFoodsSignal.set(updated);
    } else {
      // Add new selection
      this.selectedFoodsSignal.set([
        ...current,
        {
          food,
          servings,
          totalCarbs: Math.round(food.carbsPerServing * servings * 10) / 10,
        },
      ]);
    }
  }

  /**
   * Update servings for a selected food
   */
  updateServings(foodId: string, servings: number): void {
    const current = this.selectedFoodsSignal();
    const updated = current.map(sf => {
      if (sf.food.id === foodId) {
        return {
          ...sf,
          servings,
          totalCarbs: Math.round(sf.food.carbsPerServing * servings * 10) / 10,
        };
      }
      return sf;
    });
    this.selectedFoodsSignal.set(updated);
  }

  /**
   * Remove a food from selection
   */
  removeFood(foodId: string): void {
    const current = this.selectedFoodsSignal();
    this.selectedFoodsSignal.set(current.filter(sf => sf.food.id !== foodId));
  }

  /**
   * Clear all selections
   */
  clearSelection(): void {
    this.selectedFoodsSignal.set([]);
  }

  /**
   * Get the current selection result
   */
  getSelectionResult(): FoodPickerResult {
    return {
      selectedFoods: this.selectedFoodsSignal(),
      totalCarbs: this.totalCarbs(),
    };
  }

  /**
   * Get sorted categories for display
   */
  getSortedCategories(): FoodCategoryInfo[] {
    return [...this.categories].sort((a, b) => a.order - b.order);
  }
}
