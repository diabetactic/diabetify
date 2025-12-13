import { environment } from '@env/environment';

interface GlobalWithOverride {
  __DIABETACTIC_API_BASE_URL?: string;
  process?: {
    env?: {
      API_GATEWAY_URL?: string;
    };
  };
}

const globalScope: GlobalWithOverride = (
  typeof globalThis !== 'undefined' ? globalThis : {}
) as GlobalWithOverride;
const windowScope: GlobalWithOverride = (
  typeof window !== 'undefined' ? window : {}
) as GlobalWithOverride;

const runtimeOverride: string | undefined =
  windowScope.__DIABETACTIC_API_BASE_URL || globalScope.__DIABETACTIC_API_BASE_URL;

const processOverride: string | undefined = globalScope.process?.env
  ? globalScope.process.env.API_GATEWAY_URL
  : undefined;

const explicitOverride = runtimeOverride || processOverride || null;

const defaultBase =
  environment.backendServices?.apiGateway?.baseUrl?.trim() || 'http://localhost:8000';

export const API_GATEWAY_BASE_URL = explicitOverride || defaultBase;

export function getApiGatewayOverride(): string | null {
  return explicitOverride;
}
