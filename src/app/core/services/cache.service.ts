import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { FoodItem } from '@models/food.model';

@Injectable({
  providedIn: 'root'
})
export class CacheService extends Dexie {
  foodItems!: Table<FoodItem, string>;

  constructor() {
    super('diabetactic-cache');
    this.version(1).stores({
      foodItems: 'id, name'
    });
  }

  async getFoodItem(id: string): Promise<FoodItem | undefined> {
    return this.foodItems.get(id);
  }

  async addFoodItem(foodItem: FoodItem): Promise<void> {
    await this.foodItems.put(foodItem);
  }
}
