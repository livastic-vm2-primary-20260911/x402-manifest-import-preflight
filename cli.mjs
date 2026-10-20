#!/usr/bin/env node
// Offline, read-only Node CLI for x402 manifest files checked into a repository.
// No network requests, crypto operations, telemetry, credentials, or raw manifest logs.
import { readFileSync, statSync } from 'node:fs';
import { parseAndAnalyze, MAX_MANIFEST_BYTES } from './lib/preflight.mjs';

const usage = 'ManifestScope — x402 manifest preflight\n'
  + 'Usage: node cli.mjs <local-manifest.json> [--json] [--strict-warnings]\n'
  + 'Checks local JSON only. No wallet, RPC, network, uploads, or payment.\n'
  + 'Exit 0: no structural errors; 1: invalid manifest; 2: usage/read error.\n'
  + '--strict-warnings treats warnings (but not informational size notices) as exit 1.\n';
function fail(message) {
  process.stderr.write('ManifestScope: ' + message + '\n');
  process.exitCode = 2;
}
function main(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(usage);
    return;
  }
  const allowed = new Set(['--json', '--strict-warnings']);
  const options = argv.filter((a) => a.startsWith('-'));
  if (options.some((x) => !allowed.has(x))) return fail('Unknown option. Use --help.');
  const args = argv.filter((a) => !a.startsWith('-'));
  if (args.length !== 1) return fail('Provide exactly one local JSON file. Use --help.');
  const [path] = args;
  let text;
  try {
    const st = statSync(path);
    if (!st.isFile()) return fail('Input must be a local regular file.');
    if (st.size > MAX_MANIFEST_BYTES) return fail('Input is larger than 1.5 MB.');
    text = readFileSync(path, 'utf8');
  } catch {
    return fail('Unable to read the local manifest file.');
  }
  let result;
  try {
    result = parseAndAnalyze(text);
  } catch (e) {
    return fail(e.message || 'Malformed JSON.');
  }
  const warnStrict = argv.includes('--strict-warnings') || process.env.MANIFESTSCOPE_STRICT_WARNINGS === 'true';
  const failed = !result.valid || (warnStrict && result.summary.warnings > 0);
  if (argv.includes('--json')) {
    process.stdout.write(JSON.stringify({ ...result, status: failed ? 'FAIL' : 'PASS' }, null, 2) + '\n');
  } else {
    const s = result.summary;
    process.stdout.write('ManifestScope ' + (failed ? 'FAIL' : 'PASS')
      + ': resources=' + s.resourceCount + ', paymentChoices=' + s.acceptsCount
      + ', errors=' + s.errors + ', warnings=' + s.warnings + '.\n');
    for (const f of result.findings) {
      process.stdout.write('  ' + f.level.toUpperCase() + ' ' + f.code + ': '
        + f.path + ' — ' + f.message + '\n');
    }
    if (result.truncatedFindings) process.stdout.write('  Other findings were truncated to 200; fix these and rerun.\n');
    process.stdout.write('Local structural check only: not a payment, audit, or actual registry import.\n');
  }
  if (failed) process.exitCode = 1;
}
main(process.argv.slice(2));
