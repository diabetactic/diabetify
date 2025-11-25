// This file is required by karma.conf.js and loads recursively all the .spec and framework files

import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import { NgModule } from '@angular/core';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { LucideAngularModule } from 'lucide-angular';
import { appIcons } from './app/shared/icons/lucide-icons';
import { setAssetPath } from '@ionic/core/components';

/**
 * Global testing module
 *
 * Extends the default BrowserDynamicTestingModule with shared providers
 * that should be available in all unit tests.
 *
 * - Registers Lucide icons globally so that <app-icon> and <lucide-icon>
 *   components can resolve icons like "x", "loader-circle", etc.
 */
@NgModule({
  imports: [BrowserDynamicTestingModule, LucideAngularModule.pick(appIcons)],
})
class AppTestingModule {}

// Ensure Ionic components resolve assets during unit tests
setAssetPath(document.baseURI ?? '/');

// Initialize the Angular testing environment with the extended module.
getTestBed().initTestEnvironment(AppTestingModule, platformBrowserDynamicTesting());

// Detect integration runs via Karma client config
const isIntegrationRun =
  typeof window !== 'undefined' &&
  (window as any).__karma__ &&
  (window as any).__karma__.config &&
  (window as any).__karma__.config.integration;

if (isIntegrationRun) {
  // When running the dedicated integration suite, we skip loading unit specs entirely.
  if (typeof console !== 'undefined') {
    console.log('[karma] Skipping unit specs (integration run)');
  }
} else {
  const specContext = (import.meta as any).webpackContext('./app', {
    recursive: true,
    regExp: /^(?!\.\/tests\/integration\/).*\.spec\.ts$/,
  });

  const unitKeys = specContext.keys();

  if (typeof console !== 'undefined') {
    console.log(`[karma] ${unitKeys.length} unit specs loaded`);
  }

  unitKeys.forEach(specContext);
}
