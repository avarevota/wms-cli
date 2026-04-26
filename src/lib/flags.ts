// Tiny helpers shared between command files. Keep this module dependency-free
// so it can be imported from any layer without import cycles.

/**
 * Split a CLI flag value like "a, b ,c" into ["a", "b", "c"], dropping empties.
 */
export function splitCsv(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Parse a JSON-array CLI value. Throws Error with a flag-tagged message so the
 * command can route it to printError.
 */
export function parseJsonArray(raw: string, flag: string): unknown[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `${flag} must be valid JSON array. Parse error: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`${flag} must be a JSON array`);
  }
  return parsed;
}

/**
 * Coerce a CLI numeric flag, throwing a flag-tagged Error on NaN.
 */
export function parseNumberFlag(value: string, flag: string): number {
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`${flag} must be a number, got: ${value}`);
  }
  return n;
}
