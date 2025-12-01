/**
 * Food database models for carbohydrate counting
 * Used by the food picker in the bolus calculator
 */

/**
 * Food category for organizing foods
 */
export type FoodCategory =
  | 'fruits'
  | 'vegetables'
  | 'grains'
  | 'dairy'
  | 'proteins'
  | 'snacks'
  | 'drinks'
  | 'meals'
  | 'desserts';

/**
 * Portion size unit types
 */
export type PortionUnit =
  | 'g'
  | 'ml'
  | 'cup'
  | 'piece'
  | 'slice'
  | 'tablespoon'
  | 'teaspoon'
  | 'serving';

/**
 * Single food item in the database
 */
export interface FoodItem {
  /** Unique identifier */
  id: string;

  /** Display name (localized key or literal) */
  name: string;

  /** Translation key for the name */
  nameKey: string;

  /** Carbohydrates in grams per standard serving */
  carbsPerServing: number;

  /** Standard serving size amount */
  servingSize: number;

  /** Unit for the serving size */
  servingUnit: PortionUnit;

  /** Food category for filtering */
  category: FoodCategory;

  /** Emoji icon for visual identification */
  emoji: string;

  /** Optional fiber content in grams (for net carb calculations) */
  fiber?: number;

  /** Optional glycemic index */
  glycemicIndex?: 'low' | 'medium' | 'high';

  /** Whether this is a favorite/frequently used food */
  isFavorite?: boolean;

  /** Search keywords for better matching */
  keywords?: string[];
}

/**
 * Selected food with quantity for carb calculation
 */
export interface SelectedFood {
  /** The food item */
  food: FoodItem;

  /** Number of servings selected */
  servings: number;

  /** Calculated total carbs for this selection */
  totalCarbs: number;
}

/**
 * Food selection result from the picker
 */
export interface FoodPickerResult {
  /** All selected foods */
  selectedFoods: SelectedFood[];

  /** Total carbohydrates from all selections */
  totalCarbs: number;
}

/**
 * Category metadata for display
 */
export interface FoodCategoryInfo {
  /** Category key */
  key: FoodCategory;

  /** Translation key for category name */
  nameKey: string;

  /** Emoji for category */
  emoji: string;

  /** Sort order */
  order: number;
}
