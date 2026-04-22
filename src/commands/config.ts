import { Command } from 'commander';
import {
  getConfig,
  setConfig,
  normalizeConfigKey,
  USER_SETTABLE_KEYS,
} from '../lib/config.js';
import { printError, printSuccess, printInfo, printJson } from '../lib/output.js';

export function registerConfigCommands(program: Command): void {
  const configCmd = program.command('config').description('Manage CLI configuration');

  configCmd
    .command('get <key>')
    .description(`Get a config value (${USER_SETTABLE_KEYS.join(', ')})`)
    .option('--json', 'Output raw JSON')
    .action((key: string, options) => {
      const normalized = normalizeConfigKey(key);
      if (!normalized) {
        printError(
          `Unknown config key: ${key}. Valid keys: ${USER_SETTABLE_KEYS.join(', ')}`
        );
        process.exit(1);
      }
      const value = getConfig()[normalized];
      if (options.json) {
        printJson({ [normalized]: value });
      } else {
        printInfo(`${normalized}: ${value ?? ''}`);
      }
    });

  configCmd
    .command('set <key> <value>')
    .description(`Set a config value (${USER_SETTABLE_KEYS.join(', ')})`)
    .action((key: string, value: string) => {
      const normalized = normalizeConfigKey(key);
      if (!normalized || !USER_SETTABLE_KEYS.includes(normalized as any)) {
        printError(
          `Unknown config key: ${key}. Valid keys: ${USER_SETTABLE_KEYS.join(', ')}`
        );
        process.exit(1);
      }
      setConfig(normalized, value as never);
      printSuccess(`Set ${normalized} = ${value}`);
    });
}
