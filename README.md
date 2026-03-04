# StackShop — Bug Fix Assessment

A sample eCommerce application built with Next.js 15, React 19, Tailwind CSS v4, and shadcn/ui.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## My Approach

I started by reading through the codebase to understand the architecture before running anything — the data flow from `sample-products.json` → `lib/products.ts` (ProductService) → API route handlers → React frontend. This gave me a mental model of where bugs could live: in the data layer, the API layer, or the UI layer.

Then I ran the app and used it as a real user would: browsed products, clicked into detail pages, searched, filtered by category, and watched the browser console throughout. I also audited the API directly with `curl` to compare what was being returned vs. what the UI was displaying. That gap — API returns data the UI ignores — turned out to be a recurring theme.

After collecting all the issues, I categorized them by type (functionality, security, UX, design) and prioritized within each category by severity. Each fix lives on its own branch and was merged sequentially so every change is isolated and reviewable independently.

I found and fixed **14 bugs** across all four categories outlined in the assessment.

---

## Functionality Bugs

These are core features that are broken or missing — things that prevent the app from working as an eCommerce site should.

### 1. Unconfigured Image Hostname Crashes the Entire Page

**Branch:** `fix/image-hostname-crash` · **Severity:** Critical

**How I found it:** While testing search, I typed "Presto" and the entire page crashed with a runtime error: _"Invalid src prop ... hostname 'images-na.ssl-images-amazon.com' is not configured."_ This isn't just a broken image — it's a full React error boundary crash that takes down the whole app. Any user who happens to encounter one of the affected products loses the entire page.

**Root cause:** `next.config.ts` whitelisted `m.media-amazon.com` for the Next.js `<Image>` component, but I scanned the JSON dataset and found that 4 products (21 image URLs total) use a different Amazon CDN domain: `images-na.ssl-images-amazon.com`. Next.js intentionally throws on unconfigured hosts as a security measure, but in this case the images are legitimate — just from a second CDN domain that was overlooked during initial setup.

**How I fixed it:** Added the missing hostname to the `remotePatterns` array in `next.config.ts`. I considered using a wildcard pattern like `*.ssl-images-amazon.com` but decided against it — explicitly listing known hosts is more secure, and there are only two Amazon CDN domains in the dataset. If more surface later, they can be added individually.

**Verification:** Searched "Presto" after the fix — page renders correctly, product image loads, no crash.

---

### 2. Subcategory Filter Ignores the Selected Category

**Branch:** `fix/subcategory-filter` · **Severity:** High

**How I found it:** When I selected "Tablets" as the category, the subcategory dropdown appeared — but it listed over 200 options spanning every category in the dataset, not just the 2 tablet-specific subcategories ("E-Readers" and "Tablets"). I verified by hitting the API directly: `GET /api/subcategories` returned all 203 subcategories, while `GET /api/subcategories?category=Tablets` correctly returned just 2.

**Root cause:** The frontend's `useEffect` that fetches subcategories was calling `/api/subcategories` without appending the selected category as a query parameter. The API already supported filtering — the frontend just wasn't using it.

**How I fixed it:** A one-line change to the fetch URL:
```
/api/subcategories?category=${encodeURIComponent(selectedCategory)}
```
I used `encodeURIComponent` to handle category names with special characters (e.g., "3D Printers & Supplies" has an ampersand that would break the query string without encoding).

**Why not a bigger refactor?** The API contract was already correct. When the backend is fine and the frontend is just not using it properly, the fix should be minimal — change the call site, not the architecture.

---

### 3. No Retail Price Displayed Anywhere

**Branch:** `fix/display-retail-price` · **Severity:** High

**How I found it:** While auditing the API response vs. what the UI actually renders, I noticed every product in the JSON has a `retailPrice` field (e.g., `149.99`), but the frontend's TypeScript `Product` interface didn't include it, and the JSX never rendered it. An eCommerce product grid without prices is a fundamental gap — users can't make any purchase decisions.

**How I fixed it:** Added `retailPrice: number` to the `Product` interface in both `app/page.tsx` (list page) and `app/product/[sku]/page.tsx` (detail page). On the list page, each card now shows the price below the title. On the detail page, the price is rendered prominently in a larger font. I used `.toFixed(2)` to ensure consistent formatting ($15.00, not $15), and wrapped the display in a `> 0` check to handle any hypothetical zero-priced items gracefully.

**What I looked for beyond prices:** I audited all 10 fields in the product data to check for any other unused data. `featureBullets` and `retailerSku` are already used on the detail page. `categoryId` and `subCategoryId` are internal IDs with no display value. The only actionable gap was `retailPrice`.

---

### 4. Only First 20 of 500 Products Visible — No Pagination

**Branch:** `fix/pagination-and-count` · **Severity:** High

**How I found it:** The product count text said "Showing 20 products" which seemed low. I hit the API directly with `curl` and discovered `"total": 500` — the dataset has 500 products but the UI only showed the first 20 with no way to see the rest. The count text was also misleading because it displayed the page size (20), not the total (500), making it look like the store only carried 20 items.

**How I fixed it:** Three changes working together:
1. **Accurate count:** "Showing 1–20 of 500 products" using the `total` field the API already returns
2. **Previous/Next buttons:** Simple offset-based pagination using `page` state. The API already supports `limit` and `offset` parameters, so no backend changes were needed.
3. **Page reset:** When the user changes their search query or category filter, the page resets to 0 so they don't end up on a stale page number with no results.

**Why offset-based pagination over infinite scroll?** Infinite scroll is great for social feeds but awkward for product catalogs where users want to compare, go back, and know "how many are there?" Previous/Next with a page indicator ("Page 3 of 25") gives users a clear sense of scope. It also maps cleanly to the API's existing `limit`/`offset` contract without any additional backend work.

---

### 5. No Error Handling on Any Fetch Call

**Branch:** `fix/fetch-error-handling` · **Severity:** Medium

**How I found it:** Code review — all three `fetch()` call chains (categories, subcategories, products) used `.then()` only with no `.catch()`. This means any network failure, API error, or server downtime would result in either a silent failure (no products shown, no explanation) or an unhandled promise rejection in the console. The user would see an empty page with no way to understand what happened.

**How I fixed it:** Added `.catch()` handlers that set an `error` state with a human-readable message. When error is set, the UI shows the message with a "Retry" button that reloads the page. I chose a page reload for retry rather than re-triggering the specific failed fetch because it resets all state cleanly — simpler and more reliable than trying to resume from a partial state.

---

## Security Vulnerabilities

Issues that expose the application to data tampering, abuse, or known CVEs.

### 6. Product Detail Page Passes Full JSON in the URL (Data Tampering)

**Branch:** `fix/product-detail-sku-routing` · **Severity:** High

**How I found it:** When I clicked a product card, I noticed the URL looked like `/product?product=%7B%22stacklineSku%22%3A%22E8ZVY2BP3%22%2C%22title...` — the entire product object was being `JSON.stringify`'d and passed through the query string. This jumped out as a significant problem for three reasons:

1. **Data tampering:** A user could modify the URL to change the product title, price, or any other field. The detail page would happily display whatever was in the URL since it never validated against the server. In a real app with a checkout flow, this could let someone change the price.
2. **URL length:** Some products have long titles and 6+ image URLs. The resulting URLs exceeded 2000 characters, which can break in some browsers and proxies.
3. **Usability:** These URLs are impossible to share, bookmark, or read.

I also noticed the codebase already had an unused API endpoint at `app/api/products/[sku]/route.ts` — someone had built the server-side lookup but it was never wired to the frontend.

**How I fixed it:** I replaced the entire flow:
- Deleted the old `app/product/page.tsx` that parsed JSON from the query string
- Created `app/product/[sku]/page.tsx` — a proper Next.js dynamic route that extracts the SKU from the URL and fetches the product from `/api/products/${sku}`
- Updated product card links from the JSON approach to simple `/product/${product.stacklineSku}`

The detail page now has its own loading and error states. If someone navigates to a bad SKU like `/product/FAKE123`, they get a "Product not found" message instead of a crash.

**Trade-offs considered:** I considered server-side rendering the detail page (using `generateStaticParams` or server components) for better SEO and instant load. I kept it as a client component for consistency with the existing patterns in the codebase, but this would be a natural next step for a production app.

---

### 7. No API Input Validation — Unlimited Data Dump Possible

**Branch:** `fix/api-input-validation` · **Severity:** Medium

**How I found it:** Code review of `app/api/products/route.ts`. The route uses `parseInt()` on the `limit` and `offset` query parameters but never validates the output. I tested manually: `?limit=abc` produced `NaN` (which could cause downstream bugs), `?limit=-5` returned zero products, and `?limit=999999` returned all 500 products in a single response — a potential denial-of-service vector if the dataset were larger or the endpoint was public.

**How I fixed it:** Added server-side clamping:
- `NaN` falls back to sensible defaults (20 for limit, 0 for offset)
- `limit` clamped to range 1–100 (MAX_LIMIT constant)
- `offset` clamped to >= 0

I chose to clamp rather than reject with 400 errors because the API is consumed by our own frontend — graceful degradation is more appropriate than strict validation errors here. For a public-facing API, I'd return 400 with a descriptive message instead.

---

### 8. Known Next.js Security Vulnerability (CVE-2025-66478)

**Branch:** `fix/upgrade-nextjs` · **Severity:** Low (but important)

**How I found it:** `npm audit` flagged a known vulnerability in Next.js 15.5.4 during `npm install`.

**How I fixed it:** Upgraded to Next.js 15.5.12 — the latest patch release in the 15.5.x line. I specifically stayed on the same minor version to avoid introducing any breaking changes while still picking up the security fix. Verified the app still builds and runs correctly after the upgrade.

---

## UX Issues

Problems that don't crash the app but make it frustrating or confusing to use.

### 9. React Hydration Mismatch + Controlled/Uncontrolled Select Warning

**Branch:** `fix/hydration-and-select-warning` · **Severity:** High

**How I found it:** On every page load, the browser console showed two warnings. The first was a React hydration mismatch — the server-rendered HTML didn't match what React produced on the client. The second was _"A component is changing an uncontrolled input to be controlled"_ pointing at the category Select dropdown. While these are "just" console warnings, hydration mismatches can cause visual glitches and unpredictable behavior in production.

**Root cause:** Two symptoms of the same underlying problem. The `<Select>` components from Radix UI generate dynamic `aria-controls` IDs that differ between server and client renders, causing the hydration mismatch. Separately, the category state was initialized as `undefined` (making the Select uncontrolled), but as soon as data loaded it became a string (making it controlled). React doesn't allow this switch mid-lifecycle.

**How I fixed it:** Two changes that work together:

1. **Mounted guard:** I added a `mounted` state that starts `false` and flips to `true` in a `useEffect`. During SSR, the component renders a simple static loading shell (just the title and "Loading products..." text). The interactive UI — Selects, product grid, pagination — only renders after mount. This is a well-established Next.js pattern for components that rely on client-only libraries like Radix. The loading shell is intentionally styled to match the full UI's layout so there's no jarring shift.

2. **Sentinel value:** Instead of initializing `selectedCategory` as `undefined`, I used a constant `"__all__"` as a sentinel meaning "no filter selected." This keeps the Select in controlled mode from the very first render. I chose a dunder-prefixed string that could never collide with a real category name, rather than an empty string (which could be ambiguous).

**Trade-offs considered:** I could have used `dynamic(() => import(...), { ssr: false })` to skip SSR entirely, but that would hurt SEO and cause a larger flash of empty content. The mounted guard preserves SSR for the page shell while deferring only the interactive parts.

---

### 10. Search Fires API Request on Every Keystroke

**Branch:** `fix/search-debounce` · **Severity:** Medium

**How I found it:** While typing in the search box with the browser's Network tab open, I saw a new `GET /api/products?search=...` request fire for every single character. Typing "Kindle" produced 6 requests in rapid succession, 5 of which were immediately superseded by the next one. This wastes bandwidth, puts unnecessary load on the server, and can cause flickering as stale responses arrive out of order.

**How I fixed it:** I split the search state into two: `searchInput` (tracks what's in the text field, updates on every keystroke for a responsive feel) and `debouncedSearch` (triggers the API call, only updates 300ms after the user stops typing). The timer is managed with `useRef` so it persists across renders and gets properly cleared.

**Why 300ms?** It's the widely-accepted sweet spot — Google's Material Design guidelines recommend 200–500ms for search debounce. Below 200ms you still get wasted requests; above 500ms the UI feels sluggish. 300ms is the middle ground.

**Why not lodash.debounce?** Adding a dependency for a single `setTimeout` wrapper felt excessive. The native implementation is 5 lines and has zero bundle cost.

---

### 11. Category Filter Has No Way to Reset

**Branch:** `fix/category-deselect` · **Severity:** Medium

**How I found it:** After selecting "Tablets" to test filtering, I wanted to go back to seeing all products. But the category dropdown had no "All" or "None" option — once you picked a category, the only way to clear it was the "Clear Filters" button (which also clears your search term, a destructive side effect). This is a common UX trap in filter interfaces that leaves users feeling stuck.

**How I fixed it:** Added "All Categories" as the first option in the category dropdown (mapped to the `"__all__"` sentinel value from fix #9), and "All Subcategories" as the first option in the subcategory dropdown. Selecting either one clears that specific filter without affecting other active filters.

---

### 12. No "Add to Cart" or Purchase Action

**Branch:** `feat/add-to-cart` · **Severity:** Low

**How I found it:** Using the product detail page as a customer would — there was no call-to-action anywhere. The page showed product info but had no way to take action on it. For an eCommerce site called "StackShop," not having an "Add to Cart" button is a fundamental UX gap — the user journey has no next step.

**How I fixed it:** Added a full-width "Add to Cart" button with a `ShoppingCart` icon (from lucide-react, already in the project's dependencies) on the product detail page. Currently it's a UI placeholder — clicking it doesn't persist to any cart state. In a production app, this would connect to cart state management (React Context or Zustand) and potentially a backend cart API. I scoped this to the button itself because building a full cart system is beyond the scope of a bug-fix assessment, but having the CTA present is essential for the UX to feel complete.

---

## Design Problems

Visual and metadata issues that don't affect functionality but make the app feel unfinished.

### 13. Page Title Shows "Create Next App"

**Branch:** `fix/page-title` · **Severity:** Low

**How I found it:** Immediately visible in the browser tab. The default Next.js scaffold metadata was never updated, so the tab reads "Create Next App" instead of the application's actual name.

**How I fixed it:** Updated the `metadata` export in `app/layout.tsx` — changed the title to "StackShop" and added a meaningful description ("Browse and shop from our curated product catalog"). A small change, but it's the first thing anyone reviewing the app in a browser will notice, and it signals attention to detail.

---

### 14. LCP Image Missing Priority Attribute (Performance)

**Branch:** `fix/lcp-image-priority` · **Severity:** Low

**How I found it:** Console warning on every page load: _"Image with src ... was detected as the Largest Contentful Paint (LCP). Please add the 'priority' property."_ This is Next.js telling us the most visually important image on the page is being lazy-loaded, which delays the Largest Contentful Paint metric — a key Core Web Vital that affects both user experience and search rankings.

**How I fixed it:** Added `priority={index < 4}` to the `<Image>` component in the product grid. The first 4 images (typically visible above the fold in a 2-column grid) get preloaded immediately; the rest remain lazy-loaded. I parameterized it with `index < 4` rather than hardcoding `priority={true}` on just the first image, because viewport sizes vary and 4 covers most common screen sizes without over-fetching.

---

## Summary

| Category | # | Bug | Severity | Branch |
|----------|---|-----|----------|--------|
| **Functionality** | 1 | Image hostname crashes page | Critical | `fix/image-hostname-crash` |
| | 2 | Subcategory filter broken | High | `fix/subcategory-filter` |
| | 3 | No prices displayed | High | `fix/display-retail-price` |
| | 4 | No pagination (20/500 shown) | High | `fix/pagination-and-count` |
| | 5 | No fetch error handling | Medium | `fix/fetch-error-handling` |
| **Security** | 6 | JSON in URL (data tampering) | High | `fix/product-detail-sku-routing` |
| | 7 | No API input validation | Medium | `fix/api-input-validation` |
| | 8 | Known CVE in Next.js | Low | `fix/upgrade-nextjs` |
| **UX** | 9 | Hydration mismatch warnings | High | `fix/hydration-and-select-warning` |
| | 10 | Search on every keystroke | Medium | `fix/search-debounce` |
| | 11 | No way to reset category filter | Medium | `fix/category-deselect` |
| | 12 | No "Add to Cart" button | Low | `feat/add-to-cart` |
| **Design** | 13 | Wrong page title | Low | `fix/page-title` |
| | 14 | LCP image not prioritized | Low | `fix/lcp-image-priority` |

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
