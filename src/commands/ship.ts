import { Command } from 'commander';
import { apiRequest } from '../lib/client.js';
import { printError, printJson, printSuccess } from '../lib/output.js';
import { handleError } from '../lib/errors.js';

interface CreateOptions {
  awb: string;
  json?: boolean;
}

interface ProofOptions {
  proof: string;
  json?: boolean;
}

export function registerShipCommands(program: Command): void {
  const group = program
    .command('ship')
    .alias('shipment')
    .description('Ship workflow (create from AWB, proof-of-delivery, completed)');

  group
    .command('create')
    .description('Create a ship order from an AWB')
    .requiredOption('--awb <code>', 'Air-waybill code')
    .option('--json', 'Output raw JSON')
    .action(async (options: CreateOptions) => {
      try {
        const result = await apiRequest<any>('/ship', {
          method: 'POST',
          body: { awb: options.awb },
        });
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(`Created ship order for AWB ${options.awb}${result?.id ? ` (id ${result.id})` : ''}`);
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('proof-of-delivery <shipId>')
    .description('Attach proof-of-delivery (typically a signed-receipt URL or filename)')
    .requiredOption('--proof <value>', 'Proof of delivery (URL / filename / reference)')
    .option('--json', 'Output raw JSON')
    .action(async (shipId: string, options: ProofOptions) => {
      try {
        if (!options.proof) {
          printError('--proof is required');
          process.exit(1);
        }
        const result = await apiRequest<any>(
          `/ship/${encodeURIComponent(shipId)}/proof-of-delivery`,
          { method: 'PATCH', body: { proofOfDelivery: options.proof } }
        );
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(`Recorded proof-of-delivery on ship ${shipId}`);
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('completed <shipId>')
    .description('Mark a ship order as completed (delivered)')
    .option('--json', 'Output raw JSON')
    .action(async (shipId: string, options: { json?: boolean }) => {
      try {
        const result = await apiRequest<any>(
          `/ship/${encodeURIComponent(shipId)}/completed`,
          { method: 'PATCH' }
        );
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(`Ship ${shipId} marked completed`);
      } catch (err) {
        handleError(err);
      }
    });
}
