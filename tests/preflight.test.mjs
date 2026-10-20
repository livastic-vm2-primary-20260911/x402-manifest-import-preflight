import test from 'node:test';
import assert from 'node:assert/strict';
import {fictionalSample,parseAndAnalyze,analyzeManifest,MAX_MANIFEST_BYTES} from '../lib/preflight.mjs';
test('123 resources and 492 rails remain structurally valid',()=>{
 const r=parseAndAnalyze(JSON.stringify(fictionalSample()));
 assert.equal(r.valid,true);
 assert.equal(r.summary.resourceCount,123);
 assert.equal(r.summary.acceptsCount,492);
 assert.equal(r.summary.errors,0);
 assert.ok(r.findings.some(x=>x.code==='LARGE_BATCH_CATALOG'));
 assert.equal(r.summary.estimatedPreparedInsertBindings,123*10+492*8);
});
test('invalid input and oversized text are rejected',()=>{
 assert.throws(()=>parseAndAnalyze('{'),/Invalid JSON/);
 assert.throws(()=>parseAndAnalyze('x'.repeat(MAX_MANIFEST_BYTES+1)),/exceeds 1.5 MB/);
 assert.equal(analyzeManifest(null).valid,false);
 assert.equal(analyzeManifest({resources:'bad'}).valid,false);
});
test('invalid payee, insecure URL, nonCAIP2 chain and empty accepts are caught',()=>{
 const out=analyzeManifest({x402Version:2,resources:[
   {url:'http://example.com/unsafe',accepts:[{scheme:'exact',network:'base',amount:'5.1',asset:'usdc'}]},
   {url:'https://example.org/route',accepts:[]}
 ]});
 assert.equal(out.valid,false);
 for(const code of ['INVALID_RESOURCE_URL','MISSING_PAYEE','NO_PAYMENT_RAILS','NETWORK_ID_REVIEW','AMOUNT_FORMAT']) assert.ok(out.findings.some(x=>x.code===code),code);
});
test('duplicate URLs produce warnings, without suggesting real payment',()=>{
 const input=fictionalSample();input.resources[1].url=input.resources[0].url;
 const out=analyzeManifest(input);
 assert.equal(out.valid,true);
 assert.ok(out.findings.some(x=>x.code==='DUPLICATE_RESOURCE_URL'));
 assert.ok(out.notes.some(x=>x.includes('does not prove signatures')));
});
test('empty manifests, unknown versions and malformed rails return messages',()=>{
 const scenarios=[{x402Version:2,resources:[]},{x402Version:7,resources:[12]},{x402Version:1,resources:[{url:'https://example.org',accepts:[null]}]}];
 for(const x of scenarios) assert.ok(analyzeManifest(x).findings.length>0);
});
test('HTML disables outbound requests for editor content', async()=>{
 const fs=await import('node:fs');
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.ok(html.includes("connect-src 'none'"));
 assert.ok(html.includes('No server upload.'));
 assert.ok(html.includes('x402 manifest QA 19 USDC'));
 assert.ok(html.includes('https://clawlancer.ai/marketplace/3afdccb7-ecd3-471b-b3b0-8983543cfce7'));
 assert.ok(html.includes('Ask scope before ordering'));
 assert.ok(html.includes('The FREE tool never charges'));
 assert.ok(html.includes('times_purchased')===false);
 assert.ok(html.includes('https://livastic-vm3-primary-tmp-260920.github.io/x402-contract-check/'));
 assert.ok(!html.includes('window.ethereum'));
});