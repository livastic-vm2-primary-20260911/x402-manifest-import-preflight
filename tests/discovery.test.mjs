import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectPostDiscovery,parsePostDiscovery,fictionalPostDiscovery,fictionalMissingBodyDiscovery,MAX_DISCOVERY_BYTES} from '../lib/discovery.mjs';

const codes=x=>x.findings.map(y=>y.code);
test('real buyer difficulty: explicit POST missing body example is warning, not x402 manifest invalidation',()=>{
 const x=inspectPostDiscovery(fictionalMissingBodyDiscovery());
 assert.equal(x.valid,true);
 assert.equal(x.summary.method,'POST');
 assert.equal(x.summary.errors,0);
 assert(codes(x).includes('POST_BODY_EXAMPLE_DISCOVERY_GAP'));
 assert.equal(x.summary.hasInlinePostExample,false);
 assert.match(x.findings.find(y=>y.code==='POST_BODY_EXAMPLE_DISCOVERY_GAP').message,/Missing this optional wrapper field does NOT invalidate/);
 assert.match(x.notes.join(' '),/before payment/);
});
test('valid nonsecret POST body example plus HTTPS discovery metadata is informative only, NEVER payment proof',()=>{
 const x=parsePostDiscovery(JSON.stringify(fictionalPostDiscovery()));
 assert.equal(x.valid,true);
 assert.equal(x.summary.method,'POST');
 assert.equal(x.summary.hasInlinePostExample,true);
 assert.equal(x.summary.hasExampleUrl,true);
 assert.equal(x.summary.hasOpenApiPointer,true);
 assert.equal(x.summary.warnings,0);
 assert.deepEqual(codes(x),['INLINE_JSON_SHAPE_PRESENT']);
 assert(x.notes.some(v=>v.includes('No URL, OpenAPI document')));
 assert(!JSON.stringify(x).includes('fictional,example'),'Cannot echo customer-supplied raw body');
});
test('official vendor-style nested discovery allows link only but cannot claim it verified body validity',()=>{
 const x=inspectPostDiscovery({
  resource:{method:'POST',url:'https://example.org/price',
   contentType:'application/json',
   requestBodyExampleUrl:'https://example.org/example-body.json'}
 });
 assert.equal(x.summary.hasInlinePostExample,false);
 assert.equal(x.summary.hasExampleUrl,true);
 assert(codes(x).includes('POST_EXAMPLE_LINK_NOT_FETCHED'));
 assert(!codes(x).includes('POST_BODY_EXAMPLE_DISCOVERY_GAP'));
});
test('a plain native x402 manifest must not inherit wrong POST expectations',()=>{
 const x=inspectPostDiscovery({
  x402Version:2,resources:[{url:'https://example.org/pay',accepts:[{scheme:'exact',amount:'5000'}]}]
 });
 assert.equal(x.summary.method,'unspecified');
 assert(!codes(x).includes('POST_BODY_EXAMPLE_DISCOVERY_GAP'));
 assert(codes(x).includes('HTTP_METHOD_NOT_SPECIFIED'));
 assert.equal(x.valid,false); // No top-level method/resource URL in a vendor discovery document.
});
test('explicit GET does not require POST JSON body sample',()=>{
 const x=inspectPostDiscovery({resource:{method:'GET',url:'https://example.org/quote'}});
 assert.equal(x.valid,true);
 assert.equal(x.summary.method,'GET');
 assert.equal(x.summary.warnings,0);
 assert(!codes(x).includes('POST_BODY_EXAMPLE_DISCOVERY_GAP'));
});
test('malformed inline JSON example and absent content type produce advisory warnings',()=>{
 const x=inspectPostDiscovery({resource:{method:'POST',url:'https://example.org/check',
  requestBodyExample:[],contentType:null}});
 assert.equal(x.valid,true);
 assert(codes(x).includes('POST_INLINE_EXAMPLE_INVALID'));
 assert(codes(x).includes('POST_CONTENT_TYPE_UNSPECIFIED'));
 assert(codes(x).includes('POST_BODY_EXAMPLE_DISCOVERY_GAP'));
});
test('OpenAPI-shaped application/json example is structurally recognized',()=>{
 const x=inspectPostDiscovery({method:'POST',url:'https://example.org/write',contentType:'application/json',
  requestBody:{content:{'application/json':{example:{sample:'invented'}}}}});
 assert.equal(x.summary.hasInlinePostExample,true);
 assert(!codes(x).includes('POST_BODY_EXAMPLE_DISCOVERY_GAP'));
});
test('OpenAPI named example collection is recognized, but empty examples fail as warning',()=>{
 const opts={resource:{method:'POST',url:'https://example.org/abc',contentType:'application/json',
  requestBody:{content:{'application/json':{examples:{valid:{value:{hello:'world'}}}}}}}};
 assert.equal(inspectPostDiscovery(opts).summary.hasInlinePostExample,true);
 opts.resource.requestBody.content['application/json'].examples={zero:{value:{}}};
 const fail=inspectPostDiscovery(opts);
 assert.equal(fail.summary.hasInlinePostExample,false);
 assert(codes(fail).includes('POST_INLINE_EXAMPLE_INVALID'));
});
test('URLs without HTTPS or with embedded credentials are structural errors; no network calls',()=>{
 const cases=['http://example.org/path','https://alice:secret@example.org/','not url','','//localhost'];
 for(const url of cases) {
  const r=inspectPostDiscovery({method:'POST',url});
  assert.equal(r.valid,false,url);
  assert(codes(r).includes('INVALID_DISCOVERY_URL'),url);
 }
 const input={method:'POST',url:'https://example.org',requestBodyExampleUrl:'http://unsafe.example.com'};
 const out=inspectPostDiscovery(input);
 assert(codes(out).includes('POST_EXAMPLE_LINK_INVALID'));
 assert(codes(out).includes('POST_BODY_EXAMPLE_DISCOVERY_GAP'));
 assert.equal(out.valid,true);
});
test('bounded safe malformed input; no raw private user data echoed in findings',()=>{
 assert.throws(()=>parsePostDiscovery('x'.repeat(MAX_DISCOVERY_BYTES+1)),/16 KiB/);
 assert.throws(()=>parsePostDiscovery('{'),/valid public JSON/);
 const out=parsePostDiscovery(JSON.stringify({method:'POST',url:'https://example.org',
   requestBodyExample:{privateAPIKEY:'THIS-IS-SECRET',record:{customerID:'ALICE'}}}));
 assert.equal(out.valid,true);
 assert(!JSON.stringify(out).includes('THIS-IS-SECRET'));
 assert(!JSON.stringify(out).includes('ALICE'));
 assert(!JSON.stringify(out).includes('privateAPIKEY'));
 assert.match(out.notes.join(' '),/No customer records/);
});
test('non record returns safe failure',()=>{
 const o=inspectPostDiscovery(null);
 assert.equal(o.valid,false);
 assert(codes(o).includes('INVALID_DISCOVERY_ROOT'));
});
test('original manifest schema is unchanged and fully fictional 123/492 stable',async()=>{
 const {analyzeManifest,fictionalSample}=await import('../lib/preflight.mjs');
 const r=analyzeManifest(fictionalSample());
 assert.equal(r.valid,true);
 assert.equal(r.summary.resourceCount,123);
 assert.equal(r.summary.acceptsCount,492);
 assert(!r.findings.some(v=>v.code.includes('POST')));
});
test('offline UI and packaged source advertise distinct vendor metadata check without server-upload traps',async()=>{
 const {readFileSync}=await import('node:fs');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
 assert(html.includes('id="discovery-source"'));
 assert(html.includes('id="discovery-analyze"'));
 assert(html.includes('id="discovery-results"'));
 assert(html.includes('No server upload.'));
 assert(html.includes("connect-src 'none'"));
 assert(/optional vendor discovery/i.test(html));
 assert(!app.includes('fetch('));
 assert(!app.includes('XMLHttpRequest'));
 assert(!app.includes('navigator.sendBeacon'));
 assert(!app.includes('innerHTML'));
});
