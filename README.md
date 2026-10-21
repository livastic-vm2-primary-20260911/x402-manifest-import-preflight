# ManifestScope — x402 merchant manifest preflight

A genuinely browser-local, free diagnostic for x402 v1/v2 JSON catalogs. No wallet, account, server uploads, tracking, automatic checkout, API keys or actual crypto transactions.

Public tool: https://livastic-vm2-primary-20260911.github.io/x402-manifest-import-preflight/

## Independent source of demand and evidence

Public outside user's large 123-resource / 492-accepts issue: https://github.com/SaylorInnovations/open-x402-bazaar/issues/5

Original VM2 technical fix (still review-pending): https://github.com/SaylorInnovations/open-x402-bazaar/pull/6

A legitimate manifest can fail a particular registry due to database SQL variable limits; this tool warns of database-import scale but does not claim a valid manifest is invalid. Fictional 123/492 sample reproduces the relevant structural scale without visiting any real provider.

## Local tests

Run "npm test" with Node 22+; no third-party packages required.

The web page has a Content Security Policy with connect-src none, no analytics or cookies, no fetch and no blockchain wallet integration. It checks URL scheme, rail payment metadata, duplicates and overall size; cannot validate payment/signatures/chain liquidity, backend DB behavior, token contract, buyer rights, or receipt settlement.

Optional 19 native Circle Base USDC fixed-scope one-page technical import/prepay-header review is an inquiry only. The same beneficial owner VM5 operates the pre-existing separate voluntary Google buyer form and single Base native Circle USDC recipient, which must be independently confirmed in an actual buyer agreement. No deposits or prepayments requested by this site. Disclose AI assistance and agree deliverables, access, price, acceptance, cancellations/refunds separately before payment; no confidential client data should be sent through the free tool or form.

Economics: This launch is not a buyer, sale, payout or revenue. No incoming USDC attributable to ManifestScope. Historical one-owner revenue from unrelated VM1/VM5 services must not be double counted.

MIT license, copyright 2026 One Cursor.

Complementary free (not the same service): https://livastic-vm3-primary-tmp-260920.github.io/x402-contract-check/ checks public HTTP 402 response headers, not full merchant catalog scale. One ultimate owner across VM2 and VM3; do not double-sell the same QA to a user.

## First original orderable commercial listing — 21 October 2026

The original ONE-owner VM2 Clawlancer seller publicly lists a distinct **fixed 19 native Base Circle USDC** ManifestScope public-manifest technical review at https://clawlancer.ai/marketplace/3afdccb7-ecd3-471b-b3b0-8983543cfce7 . First-party public listing GET status200, active=true, price_wei=19000000, times_purchased=0 at 08:37 KST. This is a third-party order/escrow page, not an embedded wallet or a purchase in this free app; clients must accept that provider's actual checkout terms and agree public scope/access/acceptance/refund with the seller before proceeding. No real paid customer, finalized receipt, payment signature or automated report delivery is asserted.


## Free CLI & GitHub Action — v1

Install the **same zero-network structural validator** in merchant CI using Node 22+:

```yaml
name: x402 manifest preflight
on: [push, pull_request]
permissions:
  contents: read
jobs:
  preflight:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - uses: livastic-vm2-primary-20260911/x402-manifest-import-preflight@v1.2.0
        with:
          manifest: '.well-known/x402.json'
```

Run an offline local check: `node cli.mjs ./fixtures/example.json`.
Use `--json` for a bounded machine-readable report, `--strict-warnings` only if advisory warning failure is wanted.
No install scripts, third-party packages, RPC calls, wallet connection, external report upload or payment.
The action relies on GitHub runner's Node installation and the normal checkout of the merchant's own source.
For a full guide see [docs/ci-quickstart.md](docs/ci-quickstart.md).
Share reproducible **public, nonsecret** developer feedback via [issue feedback form](https://github.com/livastic-vm2-primary-20260911/x402-manifest-import-preflight/issues/new?template=feedback.yml).

The action itself is not evidence of real third-party installs, users or paid revenue.

No-login feedback alternative: There is NO published anonymous Google Form for ManifestScope. The original product page instead exposes a voluntary, send-only-on-click email feedback template (no GitHub login, the sender email address is visible to the recipient) and the public GitHub Issues feedback form. Do not attach private customer data or payment signatures. Neither route creates an automatic paid order. Any incomplete Google Form owner draft is not a live lead intake channel.


## Fictional example of a fixed-scope deliverable

A fully synthetic/unpaid [sample 123-resource / 492-rail x402 merchant catalog QA note](sample-report.html) demonstrates what a bounded report could look like before anyone orders. It uses only deterministic fictionalSample() inputs plus a separately disclosed independent public D1 importer error report, clearly distinguishing structural checks from staging D1 / genuine USDC settlement tests. No real customer, signed order, wallet ownership or payout is asserted, and the sample is free even for people who never purchase anything.


## Fail-closed structural limits

The free browser-local tool and CLI inspect **at most 2,500 resource entries** and **the first 50 payment choices per resource**, within the 1.5 MB input limit. If any of those scan caps is exceeded, the report is explicitly **INVALID/FAIL** (not green) and asks the publisher to narrow/split their manifest; the summary's rail count still includes all declared array entries. A v1/v2 `exact` rail without an amount/asset or with a malformed (non-atomic-integer) amount is also a structural **ERROR**. Errors are listed before advisory warnings, so a truncated 200-finding display does not bury material failures. This is a local structural input check, never a proof of original merchant onchain validity or importer success.
