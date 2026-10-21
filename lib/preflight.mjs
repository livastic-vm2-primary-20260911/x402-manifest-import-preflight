// Browser-local only: no fetch, storage, wallets, or blockchain interaction.
export const MAX_MANIFEST_BYTES = 1_500_000;
const UTF8 = new TextEncoder();
const isRecord = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isString = (v) => typeof v === 'string' && v.trim().length > 0;
function looksLikeHttpsUrl(value) {
  if (!isString(value)) return false;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && Boolean(u.hostname) && !u.username && !u.password;
  } catch { return false; }
}
const findings = (level, code, path, message) => ({level, code, path, message});

export function analyzeManifest(input) {
  const problems = [];
  const add = (level, code, path, message) => problems.push(findings(level, code, path, message));
  if (!isRecord(input)) {
    return {valid:false, summary:{resourceCount:0, acceptsCount:0, networks:[], estimatedPreparedInsertBindings:0}, findings:[findings('error','INVALID_ROOT','$','Expected a JSON object with a resources array.')], notes:[]};
  }
  if (input.x402Version !== 1 && input.x402Version !== 2) {
    add('warning','VERSION_UNKNOWN','$.x402Version','Expected an x402Version of 1 or 2. Verify the publisher’s schema.');
  }
  if (!Array.isArray(input.resources)) {
    add('error','RESOURCES_NOT_ARRAY','$.resources','Expected resources to be an array.');
  }
  const resources = Array.isArray(input.resources) ? input.resources : [];
  if (resources.length === 0) add('error','NO_RESOURCES','$.resources','No paid resources found; most catalogs will reject an empty manifest.');
  const networks = new Set(), seen = new Set();
  // Count all declared rails even if per-entry validation must stop at a bounded cap.
  // This keeps the import-size estimate honest while marking the partial scan invalid.
  const acceptsCount = resources.reduce((total, row) => total + (Array.isArray(row?.accepts) ? row.accepts.length : 0), 0);
  let unusualRailCount = 0, warnings = 0;
  const maxExamined = Math.min(2500, resources.length);
  if (resources.length > maxExamined) {
    add('error','ANALYSIS_TRUNCATED','$.resources','Structural review incomplete: more than 2,500 resources; narrow the file and rerun before treating the catalog as valid.');
  }
  for (let i=0; i<maxExamined; i++) {
    const row = resources[i], base = '$.resources[' + i + ']';
    if (!isRecord(row)) { add('error','RESOURCE_NOT_OBJECT',base,'Resource must be an object.'); continue; }
    const url = row.url ?? row.resource;
    if (!looksLikeHttpsUrl(url)) add('error','INVALID_RESOURCE_URL',base+'.url','A public paid resource requires a valid HTTPS URL.');
    else {
      if (seen.has(url)) add('warning','DUPLICATE_RESOURCE_URL',base+'.url','Duplicate resource URL; importer deduplication may be lossy.');
      seen.add(url);
    }
    if (!Array.isArray(row.accepts) || row.accepts.length === 0) {
      add('error','NO_PAYMENT_RAILS',base+'.accepts','No payment choices: this is not a usable paid resource.');
      continue;
    }
    for (let j=0; j<row.accepts.length && j<50; j++) {
      const a=row.accepts[j], p=base+'.accepts['+j+']';
      if (!isRecord(a)) {add('error','PAYMENT_RAIL_NOT_OBJECT',p,'Payment entry must be an object.');continue;}
      if (!isString(a.scheme)) add('error','MISSING_SCHEME',p+'.scheme','Missing payment scheme.');
      if (!isString(a.network)) add('error','MISSING_NETWORK',p+'.network','Missing chain/network.');
      else {
        networks.add(a.network);
        if (input.x402Version===2 && !a.network.includes(':')) {
          unusualRailCount++;
          if (unusualRailCount<=5) add('warning','NETWORK_ID_REVIEW',p+'.network','For x402 v2, confirm the facilitator expects a CAIP-2 network such as eip155:8453.');
        }
      }
      if (!isString(a.payTo)) add('error','MISSING_PAYEE',p+'.payTo','Missing payment recipient.');
      if (a.scheme === 'exact' && (a.amount === undefined || a.amount === null || String(a.amount).trim() === '')) {
        add('error','MISSING_AMOUNT',p+'.amount','Exact payment entry is missing its atomic-unit amount.');
      } else if (a.amount !== undefined && a.amount !== null && !/^\d+$/.test(String(a.amount))) {
        add(a.scheme === 'exact' ? 'error' : 'warning','AMOUNT_FORMAT',p+'.amount','Amount should be a nonnegative integer in token atomic units (not a decimal USD display).');
      }
      if (a.asset === undefined || a.asset === null || !isString(a.asset)) {
        add(a.scheme === 'exact' ? 'error' : 'warning','MISSING_ASSET',p+'.asset','Missing asset identifier; exact schemes require an explicit payment asset.');
      }
    }
    if (row.accepts.length>50) add('error','RAILS_TRUNCATED',base+'.accepts','Structural review incomplete: only the first 50 rails were individually checked; split the catalog before treating it as valid.');
  }
  const errCount = problems.filter(x=>x.level==='error').length;
  warnings=problems.filter(x=>x.level==='warning').length;
  // Diagnostic *estimate* for the pre-fix importer only, not a known SQLite limit.
  const estimatedPreparedInsertBindings = resources.length*10 + acceptsCount*8;
  const notes = [
    'Browser-local structural review only; does not prove signatures, balance, payouts, on-chain settlement, chain support, import success, or wallet control.',
    'A valid catalog can still fail server-side. Large batched SQL writes and non-atomic replacement are registry implementation issues, not evidence that the publisher’s manifest is invalid.',
    'Do not paste seeds, private keys, real customer records, bearer tokens, payment signatures, or secret merchant details.'
  ];
  if(resources.length>=100 || acceptsCount>=300) {
    add('info','LARGE_BATCH_CATALOG','$.resources',
      'Large catalog: '+resources.length+' resources and '+acceptsCount+' rails. If your registry uses one prepared INSERT per row in a single batch, test SQL/D1 limits, chunk sizes, and atomic replacement with a temporary database.');
  }
  return {
    valid:errCount===0,
    summary:{resourceCount:resources.length, acceptsCount, networks:[...networks].sort(), estimatedPreparedInsertBindings, errors:errCount, warnings},
    // Show errors first even when 200+ advisory findings would otherwise hide them.
    findings:problems.sort((a,b)=>({error:0,warning:1,info:2}[a.level]-{error:0,warning:1,info:2}[b.level])).slice(0,200),
    notes,
    truncatedFindings:problems.length>200
  };
}
export function parseAndAnalyze(text) {
  if (typeof text!=='string') throw new TypeError('Manifest content must be text.');
  if (UTF8.encode(text).length>MAX_MANIFEST_BYTES) throw new RangeError('File exceeds 1.5 MB; redact and narrow before inspection.');
  let input;
  try { input=JSON.parse(text); }
  catch {throw new SyntaxError('Invalid JSON. Export a valid JSON manifest first.');}
  return analyzeManifest(input);
}
export function fictionalSample() {
  return {
    x402Version:2,
    name:'Entirely fictional: large x402 catalog smoke fixture',
    resources:Array.from({length:123},(_,i)=>({
      url:'https://example.org/api/fictional-'+String(i+1).padStart(3,'0'),
      description:'Fictional example; no route exists',
      accepts:Array.from({length:4},(_,j)=>({
        scheme:'exact',
        network:j%2?'eip155:42161':'eip155:8453',
        payTo:'0x1111111111111111111111111111111111111111',
        asset:j%2?'0xaf88d065e77c8cC2239327C5EDb3A432268e5831':'0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913',
        amount:'5000'
      }))
    }))
  };
}
