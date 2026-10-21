import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeManifest,fictionalSample,parseAndAnalyze } from '../lib/preflight.mjs';

const good = () => structuredClone(fictionalSample().resources[0]);
const wrap = (r) => ({x402Version:2,resources:[r]});

test('exact x402 rails missing atomic amount are invalid, never silently green',()=>{
 const row=good();
 delete row.accepts[0].amount;
 const r=analyzeManifest(wrap(row));
 assert.equal(r.valid,false);
 assert.ok(r.summary.errors>=1);
 assert.ok(r.findings.some(f=>f.code==='MISSING_AMOUNT'&&f.level==='error'));
});

test('invalid decimal amount in exact scheme is hard error, not merely warning',()=>{
 const row=good();row.accepts[0].amount='0.001';
 const r=analyzeManifest(wrap(row));
 assert.equal(r.valid,false);
 assert.ok(r.findings.some(f=>f.code==='AMOUNT_FORMAT'&&f.level==='error'));
});

test('missing exact payment asset is hard error',()=>{
 const row=good();delete row.accepts[0].asset;
 const r=analyzeManifest(wrap(row));
 assert.equal(r.valid,false);
 assert.ok(r.findings.some(f=>f.code==='MISSING_ASSET'&&f.level==='error'));
});

test('advisory network-warning with otherwise valid exact fields remains warning-only',()=>{
 const row=good();row.accepts[0].network='base';
 const r=analyzeManifest(wrap(row));
 assert.equal(r.valid,true);
 assert.equal(r.summary.errors,0);
 assert.ok(r.findings.some(f=>f.code==='NETWORK_ID_REVIEW'&&f.level==='warning'));
});

test('51 rails refuses incompletely scanned catalog and counts all 51 rails',()=>{
 const row=good();
 row.accepts=Array.from({length:51},()=>({...row.accepts[0]}));
 const r=analyzeManifest(wrap(row));
 assert.equal(r.valid,false);
 assert.equal(r.summary.acceptsCount,51);
 assert.ok(r.findings.some(f=>f.code==='RAILS_TRUNCATED'&&f.level==='error'));
});

test('2501 resources refuses unexamined resource and counts all declared rails',()=>{
 const sample=fictionalSample();
 sample.resources=Array.from({length:2501},(_,i)=>({url:'https://example.org/resource/'+i,accepts:[{...sample.resources[0].accepts[0]}]}));
 const r=analyzeManifest(sample);
 assert.equal(r.valid,false);
 assert.equal(r.summary.resourceCount,2501);
 assert.equal(r.summary.acceptsCount,2501);
 assert.ok(r.findings.some(f=>f.code==='ANALYSIS_TRUNCATED'&&f.level==='error'));
});

test('hard errors are prioritized ahead of >200 advisory warnings',()=>{
 const sample=fictionalSample();
 sample.resources=Array.from({length:240},(_,i)=>{
   const row=structuredClone(sample.resources[0]);
   row.url='https://example.org/deduped';
   row.accepts[0].network='base';
   if(i===239)delete row.accepts[0].amount;
   return row;
 });
 const r=analyzeManifest(sample);
 assert.equal(r.valid,false);
 assert.equal(r.truncatedFindings,true);
 assert.ok(r.findings.some(f=>f.code==='MISSING_AMOUNT'&&f.level==='error'));
 assert.ok(r.findings.findIndex(f=>f.level==='error') < r.findings.findIndex(f=>f.level==='warning'));
});

test('real 123/492 fiction remains valid, zero errors',()=>{
 const r=parseAndAnalyze(JSON.stringify(fictionalSample()));
 assert.equal(r.valid,true);
 assert.equal(r.summary.acceptsCount,492);
 assert.equal(r.summary.errors,0);
 assert.equal(r.summary.warnings,0);
});