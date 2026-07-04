# Hive — Bounty Findings

Running log of doc/tooling gaps hit while integrating with BOT Chain, filed for the
independent PR / Bug / Optimization Bounty (50–100 USDT each, judged separately from
the track award). Each is written to be reproducible: title, steps, impact, fix.

---

## Finding 1 — Developer docs and marketing site return HTTP 403 to non-browser clients

**Severity:** Medium (blocks automated integration + tooling)

**Summary:** `https://dev-docs.botchain.ai` and `https://www.botchain.ai` return
`HTTP 403 Forbidden` to any non-browser HTTP client (curl, CI fetchers, doc
scrapers, LLM/agent tooling). This blocks programmatic access to the network
config (RPC URL, chain ID, explorer base, faucet) that every integration needs at
build time.

**Reproduction:**
```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://dev-docs.botchain.ai
# → 403

curl -sS -o /dev/null -w "%{http_code}\n" https://www.botchain.ai
# → 403
```
Both return 403 even for `GET /` with a standard `Accept: text/html` header. A real
desktop browser loads the same URLs fine, indicating a WAF/bot rule keyed on
User-Agent or JS challenge rather than genuine auth.

**Impact:**
- CI pipelines and IaC that fetch the chain config at build time fail.
- Agent/LLM-assisted development (increasingly common, and the literal audience of
  an "AI + DePIN" chain) cannot read the docs to self-configure.
- New builders must copy the RPC/chain-id/explorer/faucet values by hand from a
  browser, which is error-prone and undermines the "look it up, don't guess" rule.

**Proposed fix (any one):**
1. Allow-list `GET` on public docs pages for common non-browser User-Agents, or
2. Expose a small static, unauthenticated JSON at a stable path
   (e.g. `https://dev-docs.botchain.ai/network.json`) containing
   `{ rpcUrl, chainId, nativeSymbol, explorerBase, faucetUrl, blockTimeMs }`, or
3. Relax the WAF challenge for the docs subdomain specifically.

Option 2 is ideal for an AI/agent chain: it lets agents self-configure against the
network without scraping HTML.

**Links / evidence:** repro commands above; observed 2026-07-04.

---

<!-- Add further findings below as they come up (faucet quirks, explorer verify
     endpoint gaps, RPC/chain-id friction, etc.). -->
