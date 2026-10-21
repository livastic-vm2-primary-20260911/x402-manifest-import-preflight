# Install ManifestScope on every x402 manifest change

ManifestScope is a **free**, local structural checker for a public x402 merchant JSON catalog.
It does not call x402 facilitators, connect to a wallet, fetch a URL, sign transactions, or make payments.
Catalogs that are valid may still hit database-side D1 write-batch limits; large catalogs receive **INFO** only, not a false validation failure.

## Local CLI (Node 22+)

Clone the repository or use the exact tagged release from GitHub:

```sh
git clone https://github.com/livastic-vm2-primary-20260911/x402-manifest-import-preflight.git
cd x402-manifest-import-preflight
node cli.mjs path/to/public-manifest.json
node cli.mjs path/to/public-manifest.json --json
node cli.mjs path/to/public-manifest.json --strict-warnings
```

Exit codes: `0` valid under configured gates, `1` structural failures (or warnings with strict mode), `2` missing/unreadable/invalid local file or unsupported CLI arguments.
Raw user input never goes to a server. CLI prints errors, summaries, and fixed diagnostic messages—not raw payment recipients or raw manifest data.

## GitHub Actions, for a repository containing `.well-known/x402.json`

Save this as `.github/workflows/x402-manifest.yml` in the **merchant's own repository**:

```yaml
name: x402 manifest safety gate
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
      - uses: livastic-vm2-primary-20260911/x402-manifest-import-preflight@v1
        with:
          manifest: '.well-known/x402.json'
          strict-warnings: 'false'
```

`strict-warnings: 'false'` deliberately keeps advisory network-identifier or unusual-token warnings out of the hard CI-failure path. Switch to `true` only after reviewing warnings on your own public catalogs.
GitHub Actions infrastructure fetches the referenced source during checkout, but **the ManifestScope checker does no outbound network requests** and does not post the contents of the file anywhere.
Do not put secrets, credentials, payment signatures, private customer records or live client financial exports in the committed manifest.

## Independent real problem and example

A real unrelated x402 merchant's 123-resource / 492-payment-option manifest was structurally valid and still failed one registry write with `D1_ERROR: too many SQL variables`.
See the [independent reporter issue](https://github.com/SaylorInnovations/open-x402-bazaar/issues/5) and [proposed standalone fix](https://github.com/SaylorInnovations/open-x402-bazaar/pull/6).
The public browser tool includes a fictional 123/492 example, but the validator **cannot prove production Cloudflare D1 imports or successful paid settlement**.

## Feedback and optional commercial work

Report a **public, nonsecret** usability problem via [GitHub issue feedback form](https://github.com/livastic-vm2-primary-20260911/x402-manifest-import-preflight/issues/new?template=feedback.yml).
Do not post API keys, seed phrases, signed payment headers or private user data in public issues.
Optional fixed 19 native Base Circle USDC single-manifest manual technical review is a separate explicitly priced [Clawlancer listing](https://clawlancer.ai/marketplace/3afdccb7-ecd3-471b-b3b0-8983543cfce7).
Price shown is not evidence of a sold report or independently finalized owner wallet receipt. Buyer and operator must agree public scope, AI assistance, acceptance criteria, delivery, price and refund/cancellation terms in writing before paid work.

No claims of actual independent customer usage, checkout, settlement or profits are made by publishing this CLI/Action.


## Validation caps (fail closed)

To keep browser and CI checks bounded, a catalog exceeding 2,500 resources or 50 payment choices per resource reports a hard structural FAIL rather than silently passing unchecked entries. `exact` payment choices without a nonnegative atomic integer amount or without an asset also fail. Verify out-of-cap files separately and do not treat a green result as a payment/settlement/import certification.
