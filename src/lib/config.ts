import Conf from 'conf';
import { chmodSync } from 'fs';

interface UserInfo {
  id: string;
  email: string;
  username?: string;
}

interface ConfigSchema {
  apiUrl: string;
  token: string;
  user?: UserInfo;
}

const config = new Conf<ConfigSchema>({
  projectName: 'revota-wms',
  configName: 'config',
  fileExtension: 'json',
  defaults: {
    apiUrl: 'http://localhost:3030',
    token: '',
  },
});

function lockdown(): void {
  try {
    chmodSync(config.path, 0o600);
  } catch {
    // File may not exist yet; conf creates it lazily on first write.
  }
}

lockdown();

export function getConfig(): ConfigSchema {
  return {
    apiUrl: config.get('apiUrl'),
    token: config.get('token'),
    user: config.get('user'),
  };
}

export function setConfig<K extends keyof ConfigSchema>(key: K, value: ConfigSchema[K]): void {
  config.set(key, value);
  lockdown();
}

// Clears auth state but preserves apiUrl so staging/prod selection survives logout.
export function clearAuth(): void {
  config.delete('token');
  config.delete('user');
}

export function getConfigPath(): string {
  return config.path;
}

// Accepts both camelCase ("apiUrl") and kebab-case ("api-url").
export function normalizeConfigKey(key: string): keyof ConfigSchema | null {
  const map: Record<string, keyof ConfigSchema> = {
    apiurl: 'apiUrl',
    'api-url': 'apiUrl',
    apiUrl: 'apiUrl',
  };
  return map[key] ?? map[key.toLowerCase()] ?? null;
}

export const USER_SETTABLE_KEYS = ['apiUrl'] as const;
