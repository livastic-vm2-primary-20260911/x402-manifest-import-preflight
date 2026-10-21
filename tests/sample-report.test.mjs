import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fictionalSample, analyzeManifest } from '../lib/preflight.mjs';

const read=(f)=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('free sample report is not a fabricated paid customer testimonial or production D1 result',()=>{
 const report=read('sample-report.html');
 for(const needle of [
  'SYNTHETIC • NOT A COMMISSIONED AUDIT',
  'unpaid demonstration',
  'not submitted to Cloudflare D1',
  '123',
  '492',
  'unmerged proposed registry importer fix',
  'No security or income promises',
  'there is no',
 ].slice(0,-1))assert.ok(report.includes(needle),needle);
 assert.ok(!/verified paying client|has purchased this report/i.test(report));
 assert.ok(report.includes('actual 19 USDC scope'));
});
test('reported fixture counts and structural observations are true for shipped fictionalSample()',()=>{
 const d=fictionalSample();
 const actual=analyzeManifest(d);
 assert.equal(actual.summary.resourceCount,123);
 assert.equal(actual.summary.acceptsCount,492);
 assert.equal(actual.summary.errors,0);
 assert.equal(actual.summary.warnings,0);
 assert.equal(actual.valid,true);
 assert.ok(actual.findings.some(f=>f.level==='info'&&f.code==='LARGE_BATCH_CATALOG'));
});
test('sample report uses no script, inline CSS, remote content or payment execution',()=>{
 const page=read('sample-report.html');
 assert.ok(page.includes("connect-src 'none'"));
 assert.ok(page.includes("script-src 'none'"));
 assert.ok(page.includes("style-src 'self'"));
 assert.ok(page.includes('href="./style.css"'));
 assert.ok(!/<script|style=|<form|window\.ethereum|x-payment-signature/i.test(page));
 assert.ok(page.includes('This example is AI-assisted'));
 assert.ok(page.includes('independent public real-world incident'));
});
test('free index links sample before separately priced fixed-scope external order',()=>{
 const site=read('index.html');
 const sampleLink=site.indexOf('href="./sample-report.html"');
 const order=site.indexOf('href="https://clawlancer.ai/marketplace/3afdccb7');
 assert.ok(sampleLink>0&&order>sampleLink);
 assert.ok(site.includes('This is a demonstration, not a past customer'));
 assert.ok(site.includes('The FREE tool never charges.'));
 assert.ok(site.includes('Send free feedback by email — no GitHub login'));
});
test('source manifest sitemap publishes both the free checker and fictional sample page',()=>{
 const sitemap=read('sitemap.xml');
 assert.equal((sitemap.match(/<url>/g)||[]).length,2);
 assert.ok(sitemap.includes('/x402-manifest-import-preflight/</loc>'));
 assert.ok(sitemap.includes('/x402-manifest-import-preflight/sample-report.html</loc>'));
 assert.ok(!sitemap.includes('private')&&!sitemap.includes('credentials'));
});


test('hero shows free evidence before optional priced buyer link, without implying a payment or real customer',()=>{
 const site=read('index.html');
 const hero=site.slice(site.indexOf('<section class="hero">'),site.indexOf('</section>',site.indexOf('<section class="hero">')));
 const free=hero.indexOf('href="./sample-report.html"');
 const paid=hero.indexOf('href="https://clawlancer.ai/marketplace/3afdccb7-ecd3-471b-b3b0-8983543cfce7"');
 assert.ok(free>=0 && paid>free,'free sample visibly precedes optional paid link');
 assert.ok(hero.includes('only public or fictional inputs'));
 assert.ok(hero.includes('before payment'));
 assert.ok(hero.includes('No wallet connection or payment occurs'));
 assert.ok(!/verified customers|guaranteed (audit|returns|settlement)/i.test(hero));
});
