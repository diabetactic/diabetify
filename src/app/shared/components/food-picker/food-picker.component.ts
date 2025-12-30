import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  Input,
  Output,
  EventEmitter,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  HostListener,
  OnInit,
} from '@angular/core';
import { BarcodeScannerService } from '@services/barcode-scanner.service';

import { FormsModule } from '@angular/forms';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IonButton, IonSearchbar, ToastController } from '@ionic/angular/standalone';
import { FoodService } from '@services/food.service';
import {
  FoodItem,
  FoodCategory,
  FoodCategoryInfo,
  SelectedFood,
  FoodPickerResult,
} from '@core/models/food.model';
import { AppIconComponent } from '../app-icon/app-icon.component';

/**
 * Food Picker Component
 * A modal for selecting foods and calculating total carbohydrates.
 * Used in the bolus calculator to help with carb counting.
 */
@Component({
  selector: 'app-food-picker',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [FormsModule, TranslateModule, AppIconComponent, IonButton, IonSearchbar],
  templateUrl: './food-picker.component.html',
  styleUrl: './food-picker.component.scss',
  animations: [
    trigger('slideUp', [
      state('closed', style({ transform: 'translateY(100%)', opacity: 0 })),
      state('open', style({ transform: 'translateY(0)', opacity: 1 })),
      transition('closed => open', [animate('300ms cubic-bezier(0.16, 1, 0.3, 1)')]),
      transition('open => closed', [animate('250ms cubic-bezier(0.4, 0, 1, 1)')]),
    ]),
    trigger('fadeInOut', [
      state('hidden', style({ opacity: 0 })),
      state('visible', style({ opacity: 1 })),
      transition('hidden => visible', [animate('200ms ease-out')]),
      transition('visible => hidden', [animate('150ms ease-in')]),
    ]),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FoodPickerComponent implements OnInit {
  private foodService = inject(FoodService);
  private translate = inject(TranslateService);
  private barcodeScannerService = inject(BarcodeScannerService);
  private toastController = inject(ToastController);
  showManualEntry = false;
  manualFoodName = '';
  manualCarbs = null;

  /** Whether the picker is open */
  @Input() isOpen = false;

  /** Emitted when the picker is closed without selection */
  @Output() readonly closed = new EventEmitter<void>();

  /** Emitted when foods are confirmed */
  @Output() readonly confirmed = new EventEmitter<FoodPickerResult>();

  /** Current search query */
  searchQuery = signal('');

  /** Selected category */
  selectedCategory = signal<FoodCategory | 'recent' | 'favorites'>('fruits');

  /** Categories for tabs */
  categories: FoodCategoryInfo[] = [];

  /** Foods to display based on category/search */
  displayedFoods = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (query.length >= 2) {
      return this.foodService.searchFoods(query);
    }
    if (this.selectedCategory() === 'recent') {
      return this.foodService.getRecentFoods();
    }
    if (this.selectedCategory() === 'favorites') {
      return this.foodService.getFavoriteFoods();
    }
    // At this point, we know it's a valid FoodCategory (not 'recent' or 'favorites')
    return this.foodService.getFoodsByCategory(this.selectedCategory() as FoodCategory);
  });

  /** Selected foods from service */
  selectedFoods = this.foodService.selectedFoods;

  /** Total carbs from service */
  totalCarbs = this.foodService.totalCarbs;

  /** Number of selected items */
  selectedCount = computed(() => this.selectedFoods().length);

  ngOnInit(): void {
    this.categories = this.foodService.getSortedCategories();
  }

  /** Close on escape key */
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isOpen) {
      this.cancel();
    }
  }

  /** Handle backdrop click */
  onBackdropClick(): void {
    this.cancel();
  }

  /** Handle search input */
  onSearchChange(event: CustomEvent): void {
    this.searchQuery.set(event.detail.value || '');
  }

  /** Handle category change */
  onCategoryChange(event: CustomEvent): void {
    this.selectedCategory.set(event.detail.value as FoodCategory | 'recent' | 'favorites');
    this.searchQuery.set(''); // Clear search when changing category
  }

  /** Check if food is selected */
  isSelected(foodId: string): boolean {
    return this.selectedFoods().some(sf => sf.food.id === foodId);
  }

  /** Get selected food by ID */
  getSelectedFood(foodId: string): SelectedFood | undefined {
    return this.selectedFoods().find(sf => sf.food.id === foodId);
  }

  /** Add food with default serving */
  addFood(food: FoodItem): void {
    this.foodService.addFood(food, 1);
  }

  /** Remove food */
  removeFood(foodId: string): void {
    this.foodService.removeFood(foodId);
  }

  /** Update servings for a food */
  updateServings(foodId: string, delta: number): void {
    const selected = this.getSelectedFood(foodId);
    if (selected) {
      const newServings = Math.max(0.5, selected.servings + delta);
      if (newServings <= 0) {
        this.removeFood(foodId);
      } else {
        this.foodService.updateServings(foodId, newServings);
      }
    }
  }

  /** Cancel and close without confirming */
  cancel(): void {
    this.foodService.clearSelection();
    this.searchQuery.set('');
    this.selectedCategory.set('fruits');
    this.closed.emit();
  }

  /** Confirm selection */
  confirm(): void {
    const result = this.foodService.getSelectionResult();
    this.confirmed.emit(result);
    this.searchQuery.set('');
    this.selectedCategory.set('fruits');
    // Keep selection for use in calculator
  }

  /** Clear all selections */
  clearAll(): void {
    this.foodService.clearSelection();
  }

  /** Scan a barcode */
  async scanBarcode(): Promise<void> {
    const barcode = await this.barcodeScannerService.scan();
    if (barcode) {
      this.foodService.lookupFoodByBarcode(barcode).subscribe(async foodItem => {
        if (foodItem) {
          this.foodService.addFood(foodItem);
        } else {
          const toast = await this.toastController.create({
            message: this.translate.instant('foodPicker.barcodeNotFound'),
            duration: 3000,
            position: 'top',
          });
          toast.present();
        }
      });
    }
  }

  addManualFood(): void {
    if (this.manualFoodName && this.manualCarbs) {
      const newFood: FoodItem = {
        id: `manual-${Date.now()}`,
        name: this.manualFoodName,
        nameKey: this.manualFoodName,
        carbsPerServing: this.manualCarbs,
        servingSize: 1,
        servingUnit: 'serving',
        category: 'meals',
        emoji: '🍽️',
      };
      this.foodService.addFood(newFood);
      this.showManualEntry = false;
      this.manualFoodName = '';
      this.manualCarbs = null;
    }
  }

  /** Get serving display text */
  getServingText(food: FoodItem): string {
    const size = food.servingSize;
    const unit = food.servingUnit;

    // Translate unit
    const unitKey = `foodPicker.units.${unit}`;
    const translatedUnit = this.translate.instant(unitKey);

    if (size === 1) {
      return `1 ${translatedUnit}`;
    }
    return `${size} ${translatedUnit}`;
  }
}
