/**
 * Ionic Angular Mock
 *
 * Mock for @ionic/angular with proper Angular NgModule support.
 * Uses Angular decorators for TestBed compatibility.
 */

import { vi } from 'vitest';
import { NgModule, Component, Directive, Injectable, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

// Base class for value accessor mocks
class MockValueAccessor implements ControlValueAccessor {
  value: unknown = null;
  writeValue(value: unknown): void {
    this.value = value;
  }
  registerOnChange(_fn: unknown): void {}
  registerOnTouched(_fn: unknown): void {}
  setDisabledState?(_isDisabled: boolean): void {}
}

// ============================================================================
// MOCK SERVICES (Injectable classes)
// ============================================================================

@Injectable({ providedIn: 'root' })
export class Platform {
  ready = vi.fn().mockResolvedValue('web');
  is = vi.fn().mockReturnValue(false);
  platforms = vi.fn().mockReturnValue(['web']);
  width = vi.fn().mockReturnValue(1024);
  height = vi.fn().mockReturnValue(768);
  isLandscape = vi.fn().mockReturnValue(true);
  isPortrait = vi.fn().mockReturnValue(false);
  isRTL = false;
  url = vi.fn().mockReturnValue('');
  testUserAgent = vi.fn().mockReturnValue(false);
  pause = { subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }) };
  resume = { subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }) };
  resize = { subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }) };
  backButton = { subscribeWithPriority: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }) };
  keyboardDidShow = { subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }) };
  keyboardDidHide = { subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }) };
}

@Injectable({ providedIn: 'root' })
export class NavController {
  navigateForward = vi.fn().mockResolvedValue(true);
  navigateBack = vi.fn().mockResolvedValue(true);
  navigateRoot = vi.fn().mockResolvedValue(true);
  back = vi.fn();
  pop = vi.fn().mockResolvedValue(true);
  setDirection = vi.fn();
  setTopOutlet = vi.fn();
}

@Injectable({ providedIn: 'root' })
export class MenuController {
  open = vi.fn().mockResolvedValue(true);
  close = vi.fn().mockResolvedValue(true);
  toggle = vi.fn().mockResolvedValue(true);
  enable = vi.fn().mockResolvedValue(true);
  isEnabled = vi.fn().mockResolvedValue(true);
  isOpen = vi.fn().mockResolvedValue(false);
  get = vi.fn().mockResolvedValue(null);
  getMenus = vi.fn().mockResolvedValue([]);
  swipeGesture = vi.fn().mockResolvedValue(true);
}

@Injectable({ providedIn: 'root' })
export class ActionSheetController {
  create = vi.fn().mockResolvedValue({
    present: vi.fn().mockResolvedValue(undefined),
    dismiss: vi.fn().mockResolvedValue(undefined),
    onDidDismiss: vi.fn().mockResolvedValue({ role: 'cancel' }),
    onWillDismiss: vi.fn().mockResolvedValue({ role: 'cancel' }),
  });
  dismiss = vi.fn().mockResolvedValue(undefined);
  getTop = vi.fn().mockResolvedValue(null);
}

@Injectable({ providedIn: 'root' })
export class AlertController {
  create = vi.fn().mockResolvedValue({
    present: vi.fn().mockResolvedValue(undefined),
    dismiss: vi.fn().mockResolvedValue(undefined),
    onDidDismiss: vi.fn().mockResolvedValue({ role: 'cancel' }),
    onWillDismiss: vi.fn().mockResolvedValue({ role: 'cancel' }),
  });
  dismiss = vi.fn().mockResolvedValue(undefined);
  getTop = vi.fn().mockResolvedValue(null);
}

@Injectable({ providedIn: 'root' })
export class LoadingController {
  create = vi.fn().mockResolvedValue({
    present: vi.fn().mockResolvedValue(undefined),
    dismiss: vi.fn().mockResolvedValue(undefined),
    onDidDismiss: vi.fn().mockResolvedValue(undefined),
    onWillDismiss: vi.fn().mockResolvedValue(undefined),
  });
  dismiss = vi.fn().mockResolvedValue(undefined);
  getTop = vi.fn().mockResolvedValue(null);
}

@Injectable({ providedIn: 'root' })
export class ModalController {
  create = vi.fn().mockResolvedValue({
    present: vi.fn().mockResolvedValue(undefined),
    dismiss: vi.fn().mockResolvedValue(undefined),
    onDidDismiss: vi.fn().mockResolvedValue({ data: null, role: 'cancel' }),
    onWillDismiss: vi.fn().mockResolvedValue({ data: null, role: 'cancel' }),
  });
  dismiss = vi.fn().mockResolvedValue(undefined);
  getTop = vi.fn().mockResolvedValue(null);
}

@Injectable({ providedIn: 'root' })
export class PickerController {
  create = vi.fn().mockResolvedValue({
    present: vi.fn().mockResolvedValue(undefined),
    dismiss: vi.fn().mockResolvedValue(undefined),
    onDidDismiss: vi.fn().mockResolvedValue({ role: 'cancel' }),
  });
  dismiss = vi.fn().mockResolvedValue(undefined);
  getTop = vi.fn().mockResolvedValue(null);
}

@Injectable({ providedIn: 'root' })
export class PopoverController {
  create = vi.fn().mockResolvedValue({
    present: vi.fn().mockResolvedValue(undefined),
    dismiss: vi.fn().mockResolvedValue(undefined),
    onDidDismiss: vi.fn().mockResolvedValue({ data: null, role: 'backdrop' }),
    onWillDismiss: vi.fn().mockResolvedValue({ data: null, role: 'backdrop' }),
  });
  dismiss = vi.fn().mockResolvedValue(undefined);
  getTop = vi.fn().mockResolvedValue(null);
}

@Injectable({ providedIn: 'root' })
export class ToastController {
  create = vi.fn().mockResolvedValue({
    present: vi.fn().mockResolvedValue(undefined),
    dismiss: vi.fn().mockResolvedValue(undefined),
    onDidDismiss: vi.fn().mockResolvedValue(undefined),
    onWillDismiss: vi.fn().mockResolvedValue(undefined),
  });
  dismiss = vi.fn().mockResolvedValue(undefined);
  getTop = vi.fn().mockResolvedValue(null);
}

@Injectable({ providedIn: 'root' })
export class AnimationController {
  create = () => {
    const animation = {
      addElement: () => animation,
      addAnimation: () => animation,
      keyframes: () => animation,
      duration: () => animation,
      delay: () => animation,
      easing: () => animation,
      iterations: () => animation,
      fill: () => animation,
      direction: () => animation,
      fromTo: () => animation,
      play: () => Promise.resolve(),
      stop: () => {},
      destroy: () => {},
      pause: () => {},
      progressStart: () => {},
      progressStep: () => {},
      progressEnd: () => Promise.resolve(),
    };
    return animation;
  };
}

@Injectable({ providedIn: 'root' })
export class GestureController {
  create = () => ({
    enable: () => {},
    destroy: () => {},
  });
  createGesture = () => ({
    enable: () => {},
    destroy: () => {},
  });
}

@Injectable({ providedIn: 'root' })
export class Config {
  get = vi.fn().mockReturnValue(null);
  getBoolean = vi.fn().mockReturnValue(false);
  getNumber = vi.fn().mockReturnValue(0);
  set = vi.fn();
}

@Injectable({ providedIn: 'root' })
export class DomController {
  read = vi.fn((cb: () => void) => cb());
  write = vi.fn((cb: () => void) => cb());
}

// ============================================================================
// IONIC COMPONENT STUBS (Standalone components)
// ============================================================================

@Component({ selector: 'ion-app', template: '<ng-content></ng-content>', standalone: true })
export class IonApp {}

@Directive({ selector: 'ion-router-outlet', standalone: true })
export class IonRouterOutlet {}

@Component({ selector: 'ion-content', template: '<ng-content></ng-content>', standalone: true })
export class IonContent {
  scrollToTop = () => Promise.resolve();
  scrollToBottom = () => Promise.resolve();
  scrollToPoint = () => Promise.resolve();
  scrollByPoint = () => Promise.resolve();
  getScrollElement = () => Promise.resolve(document.createElement('div'));
}

@Component({ selector: 'ion-header', template: '<ng-content></ng-content>', standalone: true })
export class IonHeader {}

@Component({ selector: 'ion-footer', template: '<ng-content></ng-content>', standalone: true })
export class IonFooter {}

@Component({ selector: 'ion-toolbar', template: '<ng-content></ng-content>', standalone: true })
export class IonToolbar {}

@Component({ selector: 'ion-title', template: '<ng-content></ng-content>', standalone: true })
export class IonTitle {}

@Component({ selector: 'ion-buttons', template: '<ng-content></ng-content>', standalone: true })
export class IonButtons {}

@Component({ selector: 'ion-button', template: '<ng-content></ng-content>', standalone: true })
export class IonButton {}

@Component({ selector: 'ion-back-button', template: '', standalone: true })
export class IonBackButton {}

@Component({ selector: 'ion-icon', template: '', standalone: true })
export class IonIcon {}

@Component({ selector: 'ion-list', template: '<ng-content></ng-content>', standalone: true })
export class IonList {}

@Component({ selector: 'ion-item', template: '<ng-content></ng-content>', standalone: true })
export class IonItem {}

@Component({ selector: 'ion-label', template: '<ng-content></ng-content>', standalone: true })
export class IonLabel {}

@Component({ selector: 'ion-list-header', template: '<ng-content></ng-content>', standalone: true })
export class IonListHeader {}

@Component({ selector: 'ion-item-divider', template: '<ng-content></ng-content>', standalone: true })
export class IonItemDivider {}

@Component({ selector: 'ion-item-group', template: '<ng-content></ng-content>', standalone: true })
export class IonItemGroup {}

@Component({ selector: 'ion-item-sliding', template: '<ng-content></ng-content>', standalone: true })
export class IonItemSliding {}

@Component({ selector: 'ion-item-options', template: '<ng-content></ng-content>', standalone: true })
export class IonItemOptions {}

@Component({ selector: 'ion-item-option', template: '<ng-content></ng-content>', standalone: true })
export class IonItemOption {}

@Component({
  selector: 'ion-input',
  template: '<input>',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => IonInput), multi: true }],
})
export class IonInput extends MockValueAccessor {
  setFocus = () => Promise.resolve();
  getInputElement = () => Promise.resolve(document.createElement('input'));
}

@Component({
  selector: 'ion-textarea',
  template: '<textarea></textarea>',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => IonTextarea), multi: true }],
})
export class IonTextarea extends MockValueAccessor {}

@Component({
  selector: 'ion-checkbox',
  template: '',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => IonCheckbox), multi: true }],
})
export class IonCheckbox extends MockValueAccessor {}

@Component({
  selector: 'ion-radio',
  template: '',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => IonRadio), multi: true }],
})
export class IonRadio extends MockValueAccessor {}

@Component({
  selector: 'ion-radio-group',
  template: '<ng-content></ng-content>',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => IonRadioGroup), multi: true }],
})
export class IonRadioGroup extends MockValueAccessor {}

@Component({
  selector: 'ion-toggle',
  template: '',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => IonToggle), multi: true }],
})
export class IonToggle extends MockValueAccessor {}

@Component({
  selector: 'ion-select',
  template: '<ng-content></ng-content>',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => IonSelect), multi: true }],
})
export class IonSelect extends MockValueAccessor {}

@Component({ selector: 'ion-select-option', template: '<ng-content></ng-content>', standalone: true })
export class IonSelectOption {}

@Component({
  selector: 'ion-range',
  template: '',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => IonRange), multi: true }],
})
export class IonRange extends MockValueAccessor {}

@Component({
  selector: 'ion-searchbar',
  template: '<input>',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => IonSearchbar), multi: true }],
})
export class IonSearchbar extends MockValueAccessor {}

@Component({ selector: 'ion-segment', template: '<ng-content></ng-content>', standalone: true })
export class IonSegment {}

@Component({ selector: 'ion-segment-button', template: '<ng-content></ng-content>', standalone: true })
export class IonSegmentButton {}

@Component({ selector: 'ion-datetime', template: '', standalone: true })
export class IonDatetime {}

@Component({ selector: 'ion-datetime-button', template: '', standalone: true })
export class IonDatetimeButton {}

@Component({ selector: 'ion-card', template: '<ng-content></ng-content>', standalone: true })
export class IonCard {}

@Component({ selector: 'ion-card-header', template: '<ng-content></ng-content>', standalone: true })
export class IonCardHeader {}

@Component({ selector: 'ion-card-title', template: '<ng-content></ng-content>', standalone: true })
export class IonCardTitle {}

@Component({ selector: 'ion-card-subtitle', template: '<ng-content></ng-content>', standalone: true })
export class IonCardSubtitle {}

@Component({ selector: 'ion-card-content', template: '<ng-content></ng-content>', standalone: true })
export class IonCardContent {}

@Component({ selector: 'ion-grid', template: '<ng-content></ng-content>', standalone: true })
export class IonGrid {}

@Component({ selector: 'ion-row', template: '<ng-content></ng-content>', standalone: true })
export class IonRow {}

@Component({ selector: 'ion-col', template: '<ng-content></ng-content>', standalone: true })
export class IonCol {}

@Component({ selector: 'ion-tabs', template: '<ng-content></ng-content>', standalone: true })
export class IonTabs {}

@Component({ selector: 'ion-tab-bar', template: '<ng-content></ng-content>', standalone: true })
export class IonTabBar {}

@Component({ selector: 'ion-tab-button', template: '<ng-content></ng-content>', standalone: true })
export class IonTabButton {}

@Component({ selector: 'ion-fab', template: '<ng-content></ng-content>', standalone: true })
export class IonFab {}

@Component({ selector: 'ion-fab-button', template: '<ng-content></ng-content>', standalone: true })
export class IonFabButton {}

@Component({ selector: 'ion-fab-list', template: '<ng-content></ng-content>', standalone: true })
export class IonFabList {}

@Component({ selector: 'ion-spinner', template: '', standalone: true })
export class IonSpinner {}

@Component({ selector: 'ion-ripple-effect', template: '', standalone: true })
export class IonRippleEffect {}

@Component({ selector: 'ion-skeleton-text', template: '', standalone: true })
export class IonSkeletonText {}

@Component({ selector: 'ion-badge', template: '<ng-content></ng-content>', standalone: true })
export class IonBadge {}

@Component({ selector: 'ion-chip', template: '<ng-content></ng-content>', standalone: true })
export class IonChip {}

@Component({ selector: 'ion-avatar', template: '<ng-content></ng-content>', standalone: true })
export class IonAvatar {}

@Component({ selector: 'ion-thumbnail', template: '<ng-content></ng-content>', standalone: true })
export class IonThumbnail {}

@Component({ selector: 'ion-img', template: '<img>', standalone: true })
export class IonImg {}

@Component({ selector: 'ion-note', template: '<ng-content></ng-content>', standalone: true })
export class IonNote {}

@Component({ selector: 'ion-text', template: '<ng-content></ng-content>', standalone: true })
export class IonText {}

@Component({ selector: 'ion-progress-bar', template: '', standalone: true })
export class IonProgressBar {}

@Component({ selector: 'ion-refresher', template: '<ng-content></ng-content>', standalone: true })
export class IonRefresher {
  complete = () => Promise.resolve();
  cancel = () => Promise.resolve();
}

@Component({ selector: 'ion-refresher-content', template: '', standalone: true })
export class IonRefresherContent {}

@Component({ selector: 'ion-infinite-scroll', template: '<ng-content></ng-content>', standalone: true })
export class IonInfiniteScroll {
  complete = () => Promise.resolve();
  disabled = false;
}

@Component({ selector: 'ion-infinite-scroll-content', template: '', standalone: true })
export class IonInfiniteScrollContent {}

@Component({ selector: 'ion-menu', template: '<ng-content></ng-content>', standalone: true })
export class IonMenu {}

@Component({ selector: 'ion-menu-button', template: '', standalone: true })
export class IonMenuButton {}

@Component({ selector: 'ion-split-pane', template: '<ng-content></ng-content>', standalone: true })
export class IonSplitPane {}

@Component({ selector: 'ion-menu-toggle', template: '<ng-content></ng-content>', standalone: true })
export class IonMenuToggle {}

@Component({ selector: 'ion-modal', template: '<ng-content></ng-content>', standalone: true })
export class IonModal {}

@Component({ selector: 'ion-popover', template: '<ng-content></ng-content>', standalone: true })
export class IonPopover {}

@Component({ selector: 'ion-picker', template: '<ng-content></ng-content>', standalone: true })
export class IonPicker {}

@Component({ selector: 'ion-picker-column', template: '<ng-content></ng-content>', standalone: true })
export class IonPickerColumn {}

@Component({ selector: 'ion-picker-column-option', template: '<ng-content></ng-content>', standalone: true })
export class IonPickerColumnOption {}

@Component({ selector: 'ion-reorder', template: '<ng-content></ng-content>', standalone: true })
export class IonReorder {}

@Component({ selector: 'ion-reorder-group', template: '<ng-content></ng-content>', standalone: true })
export class IonReorderGroup {}

@Component({ selector: 'ion-accordion', template: '<ng-content></ng-content>', standalone: true })
export class IonAccordion {}

@Component({ selector: 'ion-accordion-group', template: '<ng-content></ng-content>', standalone: true })
export class IonAccordionGroup {}

@Component({ selector: 'ion-breadcrumb', template: '<ng-content></ng-content>', standalone: true })
export class IonBreadcrumb {}

@Component({ selector: 'ion-breadcrumbs', template: '<ng-content></ng-content>', standalone: true })
export class IonBreadcrumbs {}

@Component({ selector: 'ion-virtual-scroll', template: '<ng-content></ng-content>', standalone: true })
export class IonVirtualScroll {}

@Component({ selector: 'ion-nav', template: '<ng-content></ng-content>', standalone: true })
export class IonNav {}

@Directive({ selector: '[ionNavLink]', standalone: true })
export class IonNavLink {}

@Component({ selector: 'ion-action-sheet', template: '<ng-content></ng-content>', standalone: true })
export class IonActionSheet {}

@Component({ selector: 'ion-alert', template: '<ng-content></ng-content>', standalone: true })
export class IonAlert {}

@Component({ selector: 'ion-loading', template: '<ng-content></ng-content>', standalone: true })
export class IonLoading {}

@Component({ selector: 'ion-toast', template: '<ng-content></ng-content>', standalone: true })
export class IonToast {}

@Directive({ selector: '[routerLink]', standalone: true })
export class IonRouterLink {}

// ============================================================================
// IONIC MODULE
// ============================================================================

const allProviders = [
  Platform,
  NavController,
  MenuController,
  ActionSheetController,
  AlertController,
  LoadingController,
  ModalController,
  PickerController,
  PopoverController,
  ToastController,
  AnimationController,
  GestureController,
  Config,
  DomController,
];

@NgModule({
  imports: [],
  exports: [],
  providers: allProviders,
})
export class IonicModule {
  static forRoot(_config?: unknown) {
    return {
      ngModule: IonicModule,
      providers: allProviders,
    };
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

export const provideIonicAngular = (_config?: unknown) => allProviders;
export const withIonicComponents = () => [];

// Re-export vi for testing utilities
export { vi } from 'vitest';
