# StackShop — Bug Fix Assessment

A sample eCommerce application built with Next.js 15, React 19, Tailwind CSS v4, and shadcn/ui. This document details every bug identified, how each was fixed, and the reasoning behind each approach.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Bugs Identified & Fixed

Each bug was fixed in its own branch and merged sequentially. Fixes are listed in priority order.

### P0 — Critical (App-Breaking)

#### 1. Unconfigured Image Hostname Crashes the Page

**Bug:** `next.config.ts` only whitelisted `m.media-amazon.com`, but 4 products (21 image URLs) use `images-na.ssl-images-amazon.com`. When Next.js `<Image>` encountered those URLs, it threw an uncaught runtime error that crashed the entire page.

**Repro:** Search "Presto" or "Mastercard" → page crashes with _"Invalid src prop ... hostname not configured"_.

**Fix:** Added the missing hostname to `remotePatterns` in `next.config.ts`.

**Why this approach:** The simplest correct fix. The images are legitimate Amazon CDN URLs — they just need to be whitelisted. No code changes to components were needed.

**Branch:** `fix/image-hostname-crash`

---

#### 2. React Hydration Mismatch + Controlled/Uncontrolled Select

**Bug:** Two related console errors:
- Hydration mismatch: Radix UI Select generates different `aria-controls` IDs on server vs client, and the SSR output didn't match the client's initial loading state.
- _"Select is changing from uncontrolled to controlled"_: Category Select `value` started as `undefined` (uncontrolled) then became a string (controlled).

**Fix:**
1. Added a `mounted` guard that renders a simple loading shell during SSR, deferring interactive UI (Selects, data) until after hydration.
2. Replaced `undefined` state values with a sentinel constant (`"__all__"`) so Select is always controlled.

**Why this approach:** The mounted pattern is the standard Next.js solution for client-only components that use libraries (Radix) with server/client ID mismatches. The sentinel value keeps React happy by never switching between controlled/uncontrolled modes.

**Branch:** `fix/hydration-and-select-warning`

---

### P1 — High Priority (Core Functionality)

#### 3. Subcategory Filter Ignores Selected Category

**Bug:** When a category was selected, the subcategory fetch called `/api/subcategories` without passing `?category=`. This returned all 203 subcategories instead of the 2 relevant ones (e.g., for "Tablets").

**Fix:** Changed the fetch URL to include the selected category as a query parameter:
```
/api/subcategories?category=${encodeURIComponent(selectedCategory)}
```

**Why this approach:** The API already supported the `category` parameter — the frontend simply wasn't passing it. One-line fix.

**Branch:** `fix/subcategory-filter`

---

#### 4. Product Detail Page Uses Insecure URL JSON Serialization

**Bug:** Product data was passed to the detail page via `JSON.stringify(product)` in the query string. This created URLs 2000+ characters long that were:
- Tamper-prone (users could modify prices, titles, etc.)
- Not shareable or bookmarkable in a meaningful way
- Bypassing the existing `/api/products/[sku]` endpoint entirely

**Fix:** Replaced the query-string approach with clean `/product/[sku]` dynamic routes. The detail page now fetches product data from the API using the SKU in the URL, which also makes the previously unused `GET /api/products/[sku]` endpoint finally serve its purpose.

**Why this approach:** This is the standard Next.js pattern for detail pages — clean URLs, server-authoritative data, no client-side data tampering possible. URLs like `/product/E8ZVY2BP3` are short, shareable, and bookmarkable.

**Branch:** `fix/product-detail-sku-routing`

---

#### 5. No Retail Price Displayed

**Bug:** The API returns `retailPrice` for every product (e.g., `$149.99`) but it was never rendered on either the product list or detail page. An eCommerce site without prices.

**Fix:** Added `retailPrice` to the frontend Product interface and rendered it on both pages — below the title on product cards, and prominently on the detail page.

**Why this approach:** The data was already available from the API. This was purely a frontend rendering omission.

**Branch:** `fix/display-retail-price`

---

#### 6. No Pagination — Only First 20 of 500 Products Visible

**Bug:** The app hardcoded `limit=20` with no way to change `offset`. The dataset has 500 products but only the first 20 were ever shown. The count text misleadingly said "Showing 20 products" without indicating a total.

**Fix:**
- Added Previous/Next pagination controls with page indicator
- Updated the count to show "Showing 1–20 of 500 products" using the `total` from the API
- Pagination resets to page 1 when filters change

**Why this approach:** Simple offset-based pagination matches the existing API design (`limit` + `offset` parameters) and doesn't require infinite scroll complexity or URL state management.

**Branch:** `fix/pagination-and-count`

---

### P2 — Medium Priority (UX Improvements)

#### 7. Search Fires API Request on Every Keystroke

**Bug:** Typing in the search box fired a fetch request for every character, flooding the server with unnecessary requests.

**Fix:** Added a 300ms debounce using `useRef`/`setTimeout`. The API is only called after the user stops typing.

**Why this approach:** 300ms debounce is the industry standard for search-as-you-type. Used native `setTimeout` with a ref to avoid adding a dependency (lodash/debounce) for a single use case.

**Branch:** `fix/search-debounce`

---

#### 8. Category Dropdown Has No "All" Option

**Bug:** Once a category was selected, there was no way to deselect it from the dropdown. The only reset path was the "Clear Filters" button.

**Fix:** Added an "All Categories" option at the top of the category dropdown, and "All Subcategories" at the top of the subcategory dropdown.

**Why this approach:** This is the standard UX pattern for optional filter dropdowns. Users expect to be able to reset individual filters from the dropdown itself.

**Branch:** `fix/category-deselect`

---

#### 9. No Error Handling on Fetch Calls

**Bug:** All three fetch chains (categories, subcategories, products) had no `.catch()` handlers. If any API call failed, the app would show undefined errors or crash silently.

**Fix:** Added `.catch()` to all fetches, an error state with a user-visible message, and a "Retry" button that reloads the page.

**Why this approach:** Graceful error handling is essential for production apps. The retry button gives users a recovery path without needing to manually refresh.

**Branch:** `fix/fetch-error-handling`

---

#### 10. No API Input Validation

**Bug:** The `/api/products` endpoint used `parseInt` on `limit`/`offset` without validating the result. Non-numeric strings produced `NaN`, and no upper bound existed — `?limit=999999` would dump the entire dataset.

**Fix:** Added validation: NaN falls back to defaults, limit is clamped to 1–100, offset is clamped to >= 0.

**Why this approach:** Server-side input validation is a basic security practice. The 100-item cap prevents abuse while being generous enough for reasonable use.

**Branch:** `fix/api-input-validation`

---

### P3 — Low Priority (Polish)

#### 11. Page Title Shows "Create Next App"

**Bug:** The default Next.js boilerplate metadata was never updated.

**Fix:** Changed title to "StackShop" and description to something meaningful.

**Branch:** `fix/page-title`

---

#### 12. LCP Image Missing Priority Attribute

**Bug:** The first product image (Largest Contentful Paint element) lacked the `priority` prop, causing a console error and degraded Core Web Vitals.

**Fix:** Added `priority={index < 4}` to mark the first 4 product images (above the fold) as priority.

**Why this approach:** Next.js `<Image>` with `priority` preloads the image, improving LCP scores. Only the first 4 images (visible without scrolling) get priority to avoid over-fetching.

**Branch:** `fix/lcp-image-priority`

---

#### 13. No "Add to Cart" Button

**Bug:** An eCommerce site called "StackShop" had no purchase actions — no cart, no buy button, nothing.

**Fix:** Added a prominent "Add to Cart" button with a shopping cart icon on the product detail page.

**Branch:** `feat/add-to-cart`

---

#### 14. Next.js Security Vulnerability (CVE-2025-66478)

**Bug:** Next.js 15.5.4 had a known critical security vulnerability flagged by npm audit.

**Fix:** Upgraded to Next.js 15.5.12 which includes the security patch, staying on the same minor version to avoid breaking changes.

**Branch:** `fix/upgrade-nextjs`

---

## Architecture

```
app/
├── api/
│   ├── categories/route.ts      # GET all category names
│   ├── subcategories/route.ts   # GET subcategories (optionally by category)
│   └── products/
│       ├── route.ts             # GET paginated/filtered product list
│       └── [sku]/route.ts       # GET single product by SKU
├── layout.tsx                   # Root layout with fonts and metadata
├── page.tsx                     # Home: product grid with search/filter/pagination
└── product/
    └── [sku]/page.tsx           # Product detail page (fetches by SKU)

components/ui/                   # shadcn/ui components (Badge, Button, Card, etc.)
lib/
├── products.ts                  # ProductService — data access layer
└── utils.ts                     # Utility helpers
```

## Tech Stack

- **Framework:** Next.js 15.5.12 (App Router + Turbopack)
- **UI:** React 19, Tailwind CSS v4, shadcn/ui (Radix primitives)
- **Language:** TypeScript 5
- **Data:** Static JSON (500 products) served via Next.js Route Handlers
