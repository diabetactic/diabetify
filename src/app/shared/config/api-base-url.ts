import { environment } from '../../../environments/environment';

const globalScope: any = typeof globalThis !== 'undefined' ? globalThis : {};
const windowScope: any = typeof window !== 'undefined' ? window : {};

const runtimeOverride: string | undefined =
  windowScope.__DIABETIFY_API_BASE_URL || globalScope.__DIABETIFY_API_BASE_URL;

const processOverride: string | undefined =
  globalScope.process && globalScope.process.env
    ? globalScope.process.env.API_GATEWAY_URL
    : undefined;

const explicitOverride = runtimeOverride || processOverride || null;

const defaultBase =
  environment.backendServices?.apiGateway?.baseUrl?.trim() || 'http://localhost:8000';

export const API_GATEWAY_BASE_URL = explicitOverride || defaultBase;

export function getApiGatewayOverride(): string | null {
  return explicitOverride;
}
