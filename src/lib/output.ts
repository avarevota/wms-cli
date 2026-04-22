import Table from 'cli-table3';
import kleur from 'kleur';

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function printTable(
  headers: string[],
  rows: (string | number | null | undefined)[][]
): void {
  const table = new Table({
    head: headers.map((h) => kleur.cyan().bold(h)),
    style: {
      border: ['grey'],
    },
  });

  for (const row of rows) {
    table.push(row.map((cell) => cell ?? '-'));
  }

  console.log(table.toString());
}

export function printError(message: string): void {
  console.error(kleur.red(`Error: ${message}`));
}

export function printSuccess(message: string): void {
  console.log(kleur.green(message));
}

export function printInfo(message: string): void {
  console.log(kleur.blue(message));
}
