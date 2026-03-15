# Automated Testing Guide

Quick reference for running tests during the interview.

## One Command (Recommended)

```bash
npm run test
```

Runs **8 E2E tests** with Playwright. The dev server starts automatically — no need to run `npm run dev` first. Tests cover: page load, prices, search, category dropdown, pagination, product links, detail page, navigation.

---

## Individual Test Suites

### E2E (entire application)

```bash
npm run test:e2e
```

Same as `npm run test`. Tests:
- Home page loads with products and title
- Product prices display
- Search (Presto) doesn't crash
- Category filter works
- Pagination works
- Product links use SKU-based URLs (no JSON in URL)
- Product detail page has price and Add to Cart button

### API (backend only)

```bash
# Terminal 1: start server
npm run dev

# Terminal 2: run API tests
npm run test:api
```

Tests API routes directly:
- `/api/categories` — returns categories
- `/api/subcategories` — all + filtered by category
- `/api/products` — pagination, filters, input validation (limit clamped)
- `/api/products/[sku]` — get by SKU, 404 for invalid

---

## During the Interview

1. After adding a feature, run `npm run test` to verify nothing broke.
2. If API tests fail with "fetch failed", ensure `npm run dev` is running in another terminal, then run `npm run test:api`.
3. To run only E2E: `npm run test` (no server needed — it starts automatically).

---

## Files

| File | Purpose |
|------|---------|
| `tests/api.test.mjs` | API route tests (Node built-in test runner) |
| `tests/e2e.spec.ts` | E2E tests (Playwright) |
| `playwright.config.ts` | Playwright config (auto-starts dev server) |
