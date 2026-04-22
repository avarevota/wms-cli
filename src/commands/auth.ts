import { Command } from 'commander';
import { apiRequest } from '../lib/client.js';
import { getConfig, setConfig, clearAuth, getConfigPath } from '../lib/config.js';
import { printError, printSuccess, printInfo, printJson } from '../lib/output.js';
import { handleError } from '../lib/errors.js';
import { createInterface } from 'readline';
import { Writable } from 'stream';

async function prompt(question: string, { mask = false } = {}): Promise<string> {
  if (!mask) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }

  // Masked input for passwords: suppress echo by writing a muted line to stdout.
  const muted = new Writable({
    write(_chunk, _enc, cb) {
      cb();
    },
  });
  process.stdout.write(question);
  const rl = createInterface({ input: process.stdin, output: muted, terminal: true });
  return new Promise((resolve) => {
    rl.question('', (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer.trim());
    });
  });
}

interface LoginResponse {
  token: string;
  users: { id: string; email: string; username?: string };
  modules?: unknown;
}

export function registerAuthCommands(program: Command): void {
  program
    .command('login')
    .description('Authenticate with the WMS API')
    .option('-e, --email <email>', 'Email address')
    .option('-p, --password <password>', 'Password')
    .action(async (options) => {
      try {
        const email = options.email || (await prompt('Email: '));
        const password = options.password || (await prompt('Password: ', { mask: true }));

        if (!email || !password) {
          printError('Email and password are required');
          process.exit(1);
        }

        const result = await apiRequest<LoginResponse>('/auth/login', {
          method: 'POST',
          body: { email, password },
        });

        setConfig('token', result.token);
        setConfig('user', {
          id: result.users.id,
          email: result.users.email,
          username: result.users.username,
        });

        printSuccess(`Logged in as ${result.users.email}`);
        printInfo(`Token saved to: ${getConfigPath()}`);
      } catch (err) {
        handleError(err);
      }
    });

  program
    .command('logout')
    .description('Clear authentication token (apiUrl is preserved)')
    .action(() => {
      clearAuth();
      printSuccess('Logged out');
    });

  program
    .command('whoami')
    .description('Show current user information')
    .option('--json', 'Output raw JSON')
    .action(async (options) => {
      try {
        const { token, user } = getConfig();

        if (!token) {
          printError("Not authenticated — run 'wms login'");
          process.exit(1);
        }

        // Endpoint is Public and takes the token in the BODY, not via Bearer.
        const result = await apiRequest<unknown>('/auth/token-validation', {
          method: 'POST',
          body: { token },
        });

        if (options.json) {
          printJson(result);
          return;
        }

        printInfo('Authenticated');
        if (user) {
          console.log(`  ID:       ${user.id}`);
          console.log(`  Email:    ${user.email}`);
          if (user.username) console.log(`  Username: ${user.username}`);
        } else {
          console.log('  (no local user info — run `wms login` to refresh)');
        }
      } catch (err) {
        handleError(err);
      }
    });
}
