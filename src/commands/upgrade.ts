import { Command } from 'commander';
import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { printSuccess, printError, printJson } from '../lib/output.js';

function loadPackageJson(): { version: string; name: string } {
  const paths = [
    resolve(dirname(fileURLToPath(import.meta.url)), '../package.json'),
    resolve(process.cwd(), 'package.json'),
    resolve(dirname(fileURLToPath(import.meta.url)), '../../package.json'),
  ];
  for (const p of paths) {
    if (existsSync(p)) {
      return JSON.parse(readFileSync(p, 'utf-8'));
    }
  }
  return { version: '0.0.0', name: '@revota/wms-cli' };
}

const pkg = loadPackageJson();

interface UpgradeOptions {
  json?: boolean;
}

function runNpm(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn('npm', args, { shell: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => { stdout += data; });
    child.stderr.on('data', (data) => { stderr += data; });
    child.on('close', (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

async function getLatestVersion(): Promise<string | null> {
  try {
    const { stdout } = await runNpm(['view', pkg.name, 'version']);
    return stdout.trim();
  } catch {
    return null;
  }
}

export function registerUpgradeCommand(program: Command): void {
  program
    .command('upgrade')
    .description('Upgrade wms CLI to the latest version')
    .option('--json', 'Output raw JSON')
    .action(async (options: UpgradeOptions) => {
      const currentVersion = pkg.version;
      const latestVersion = await getLatestVersion();

      if (options.json) {
        printJson({
          current: currentVersion,
          latest: latestVersion,
          upToDate: latestVersion === currentVersion,
        });
        return;
      }

      console.log(`Current version: ${currentVersion}`);

      if (!latestVersion) {
        printError('Failed to check for updates. Please try again later.');
        process.exit(1);
      }

      console.log(`Latest version:  ${latestVersion}`);

      if (latestVersion === currentVersion) {
        printSuccess('Already up to date!');
        return;
      }

      console.log(`\nUpdating to ${latestVersion}...`);
      const { code, stderr } = await runNpm([
        'install',
        '-g',
        `${pkg.name}@${latestVersion}`,
      ]);

      if (code !== 0) {
        printError(`Update failed: ${stderr}`);
        process.exit(1);
      }

      printSuccess(`Successfully updated to ${latestVersion}!`);
      console.log(`Run 'wms --version' to verify.`);
    });
}
