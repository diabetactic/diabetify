// Entry point for integration test target

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

@NgModule({
  imports: [BrowserDynamicTestingModule, LucideAngularModule.pick(appIcons)],
})
class AppIntegrationTestingModule {}

setAssetPath(document.baseURI ?? '/');

// Ensure backend-facing code uses the Docker API Gateway port (8004) during integration tests.
// This powers API_GATEWAY_BASE_URL via src/app/shared/config/api-base-url.ts
// without touching production or normal unit-test configuration.
(globalThis as any).__DIABETIFY_API_BASE_URL =
  (globalThis as any).__DIABETIFY_API_BASE_URL || 'http://localhost:8004';

getTestBed().initTestEnvironment(AppIntegrationTestingModule, platformBrowserDynamicTesting());

const integrationContext = (import.meta as any).webpackContext('./app/tests/integration', {
  recursive: true,
  regExp: /\.integration\.ts$/,
});

const integrationKeys = integrationContext.keys();

if (typeof console !== 'undefined') {
  console.log(`[karma] ${integrationKeys.length} integration specs loaded`);
}

integrationKeys.forEach(integrationContext);
