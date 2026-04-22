import { ApiError } from './client.js';
import { printError } from './output.js';

export function handleError(err: unknown): never {
  if (err instanceof ApiError) {
    printError(err.message);
    for (const e of err.errors) printError(`  - ${e}`);
  } else {
    printError(err instanceof Error ? err.message : 'Unknown error');
  }
  process.exit(1);
}
