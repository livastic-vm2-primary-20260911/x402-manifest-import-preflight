import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fictionalSample } from '../lib/preflight.mjs';

const CLI = fileURLToPath(new URL('../cli.mjs', import.meta.url));
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const example = fileURLToPath(new URL('../fixtures/example.json', import.meta.url));
function run(args,env={}) {
  return spawnSync(process.execPath,[CLI,...args],{cwd:ROOT,encoding:'utf8',timeout:8000,env:{...process.env,...env}});
}
function withTemp(fn) {
  const dir=mkdtempSync(join(tmpdir(),'manifest-scope-test-'));
  try { return fn(dir); } finally { rmSync(dir,{recursive:true,force:true}); }
}

test('default local fictional sample passes without secrets or network calls',()=>{
  const r=run([example]);
  assert.equal(r.status,0,r.stderr);
  assert.match(r.stdout,/ManifestScope PASS: resources=1, paymentChoices=1, errors=0/);
  assert.match(r.stdout,/not a payment, audit, or actual registry import/);
  assert.equal(r.stderr,'');
});
test('JSON report on entire fake 123 by 4 scale remains valid and warns only as info',()=>withTemp((dir)=>{
  const input=join(dir,'big.json');
  writeFileSync(input,JSON.stringify(fictionalSample()));
  const r=run([input,'--json','--strict-warnings']);
  assert.equal(r.status,0,r.stderr);
  const parsed=JSON.parse(r.stdout);
  assert.equal(parsed.status,'PASS');
  assert.equal(parsed.summary.resourceCount,123);
  assert.equal(parsed.summary.acceptsCount,492);
  assert.equal(parsed.summary.errors,0);
  assert.equal(parsed.summary.warnings,0);
  assert.ok(parsed.findings.some((f)=>f.code==='LARGE_BATCH_CATALOG'&&f.level==='info'));
  assert.ok(!r.stdout.includes('privateKey'));
}));
test('real structural defects fail CI with exit 1, no raw input in output',()=>withTemp((dir)=>{
  const input=join(dir,'broken.json');
  writeFileSync(input,JSON.stringify({x402Version:2,resources:[{url:'http://invalid.example/secret-sentinel-data',accepts:[]}]}));
  const r=run([input]);
  assert.equal(r.status,1);
  assert.match(r.stdout,/INVALID_RESOURCE_URL/);
  assert.match(r.stdout,/NO_PAYMENT_RAILS/);
  assert.ok(!r.stdout.includes('secret-sentinel-data'));
}));
test('optional warnings become CI failures only with explicit strict flag',()=>withTemp((dir)=>{
  const input=join(dir,'warning.json');
  writeFileSync(input,JSON.stringify({x402Version:2,resources:[{url:'https://example.org/fake',accepts:[{scheme:'exact',network:'base',payTo:'0x1234',amount:'5000'}]}]}));
  assert.equal(run([input]).status,0);
  assert.equal(run([input,'--strict-warnings']).status,1);
  assert.equal(run([input],{MANIFESTSCOPE_STRICT_WARNINGS:'true'}).status,1);
}));
test('malformed JSON, oversize, no file and wrong args are exit 2 without crashing',()=>withTemp((dir)=>{
  const broken=join(dir,'bad.json');
  writeFileSync(broken,'{ invalid');
  assert.equal(run([broken]).status,2);
  const large=join(dir,'huge.json');
  writeFileSync(large,'x'.repeat(1_500_001));
  assert.equal(run([large]).status,2);
  assert.equal(run([join(dir,'absent')]).status,2);
  assert.equal(run(['--json']).status,2);
  assert.equal(run([example,'--unknown']).status,2);
  assert.equal(run(['--help']).status,0);
}));
test('action file uses local path env, not shell-interpolated inputs or secrets',()=>{
  const action=readFileSync(new URL('../action.yml', import.meta.url),'utf8');
  const ci=readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url),'utf8');
  assert.ok(action.includes('using: \'composite\''));
  assert.ok(action.includes('MANIFEST_PATH: ' + '$' + '{{ inputs.manifest }}'));
  assert.ok(action.includes('node "$GITHUB_ACTION_PATH/cli.mjs" "$MANIFEST_PATH"'));
  assert.ok(!action.includes('--token')&&!action.includes('curl '));
  assert.ok(ci.includes('uses: ./'));
  assert.ok(ci.includes('permissions:\n  contents: read'));
});
