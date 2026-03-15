/**
 * API tests — run against http://localhost:3000 (start dev server first: npm run dev)
 * Or: BASE_URL=http://localhost:3000 node --test tests/api.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

async function fetchJSON(path) {
  const res = await fetch(`${BASE}${path}`);
  const data = await res.json();
  return { status: res.status, data };
}

describe('API: /api/categories', () => {
  it('returns categories array', async () => {
    const { status, data } = await fetchJSON('/api/categories');
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(data.categories));
    assert.ok(data.categories.length > 0);
    assert.ok(data.categories.includes('Tablets'));
  });
});

describe('API: /api/subcategories', () => {
  it('returns all subcategories without category param', async () => {
    const { status, data } = await fetchJSON('/api/subcategories');
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(data.subCategories));
    assert.ok(data.subCategories.length > 1);
  });

  it('returns filtered subcategories when category=Tablets', async () => {
    const { status, data } = await fetchJSON('/api/subcategories?category=Tablets');
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(data.subCategories));
    assert.ok(data.subCategories.length >= 1);
    assert.ok(data.subCategories.length <= 5);
  });
});

describe('API: /api/products', () => {
  it('returns products with total', async () => {
    const { status, data } = await fetchJSON('/api/products');
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(data.products));
    assert.strictEqual(typeof data.total, 'number');
    assert.ok(data.total > 0);
  });

  it('returns products with retailPrice', async () => {
    const { status, data } = await fetchJSON('/api/products?limit=1');
    assert.strictEqual(status, 200);
    assert.ok(data.products[0]);
    assert.ok('retailPrice' in data.products[0]);
    assert.ok(data.products[0].retailPrice > 0);
  });

  it('respects limit and offset (pagination)', async () => {
    const { data: page1 } = await fetchJSON('/api/products?limit=5&offset=0');
    const { data: page2 } = await fetchJSON('/api/products?limit=5&offset=5');
    assert.strictEqual(page1.products.length, 5);
    assert.strictEqual(page2.products.length, 5);
    assert.notStrictEqual(page1.products[0].stacklineSku, page2.products[0].stacklineSku);
  });

  it('clamps limit to max 100 (input validation)', async () => {
    const { data } = await fetchJSON('/api/products?limit=999999');
    assert.ok(data.products.length <= 100);
  });

  it('filters by search=Presto', async () => {
    const { status, data } = await fetchJSON('/api/products?search=Presto');
    assert.strictEqual(status, 200);
    assert.ok(data.total >= 1);
    assert.ok(data.products.some(p => p.title.toLowerCase().includes('presto')));
  });

  it('filters by category=Tablets', async () => {
    const { status, data } = await fetchJSON('/api/products?category=Tablets');
    assert.strictEqual(status, 200);
    assert.ok(data.products.every(p => p.categoryName === 'Tablets'));
  });
});

describe('API: /api/products/[sku]', () => {
  it('returns product by valid SKU', async () => {
    const { status, data } = await fetchJSON('/api/products/E8ZVY2BP3');
    assert.strictEqual(status, 200);
    assert.strictEqual(data.stacklineSku, 'E8ZVY2BP3');
    assert.ok(data.retailPrice);
    assert.ok(data.title);
  });

  it('returns 404 for invalid SKU', async () => {
    const { status } = await fetchJSON('/api/products/INVALID_SKU_12345');
    assert.strictEqual(status, 404);
  });
});
