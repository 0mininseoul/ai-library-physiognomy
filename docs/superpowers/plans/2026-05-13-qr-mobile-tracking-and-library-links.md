# QR Mobile Tracking And Library Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Track book-section QR mobile opens without Amplitude, remove mobile result sharing, and route recommendation book links to Gachon Central Library.

**Architecture:** Use the existing Supabase `service_events` table for first-party QR tracking. Keep legacy `naverBookUrl` data readable but stop rendering or generating Naver links; prefer a new Gachon library URL field with a catalog-search fallback when exact catalog detail URLs are not yet present in the books table.

**Tech Stack:** Next.js App Router, React, Vitest, Testing Library, Supabase service-role server client.

---

### Task 1: Test The Requested Behavior

**Files:**
- Modify: `tests/components/resultPage.test.tsx`
- Modify: `tests/adminMetrics.test.ts`

- [x] **Step 1: Add failing component expectations**

Add assertions that:
- `QrCard` encodes `/result/session-1?m=1&src=book_qr`.
- `ResultPage` forwards `m=1&src=book_qr` into the result API request.
- `MobileResultPage` does not render `결과 공유하기`.
- recommendation links do not contain `search.shopping.naver.com` and do contain `lib.gachon.ac.kr`.

- [x] **Step 2: Add failing admin metric expectations**

Add service event rows to `buildAdminMetrics` tests and assert:
- total QR opens are counted.
- mobile QR opens are counted separately.
- desktop/non-mobile QR opens do not inflate the mobile count.

- [x] **Step 3: Run focused tests and confirm RED**

Run: `pnpm vitest run tests/components/resultPage.test.tsx tests/adminMetrics.test.ts`

Expected: failures for missing QR source propagation, missing QR admin metrics, still-rendered share button, and Naver link expectations.

### Task 2: Implement QR Tracking

**Files:**
- Modify: `src/components/result/QrCard.tsx`
- Modify: `src/components/pages/ResultPage.tsx`
- Modify: `src/app/api/result/[id]/route.ts`
- Modify: `src/lib/admin/metrics.ts`
- Modify: `src/app/api/admin/metrics/route.ts`
- Modify: `src/components/admin/AdminDashboard.tsx`

- [x] **Step 1: Add QR source to generated QR URLs**

Set QR target search params to `m=1` and `src=book_qr`.

- [x] **Step 2: Forward tracking params to the result API**

When the page URL has `m=1&src=book_qr`, fetch `/api/result/:id?m=1&src=book_qr` so the server can log the open with the browser User-Agent.

- [x] **Step 3: Insert service event on result fetch**

In the result API route, when `src=book_qr`, insert `event_name = "book_qr_result_open"` with payload containing `source`, `view`, `isMobile`, and coarse device type. Do not block result loading if the insert fails.

- [x] **Step 4: Surface QR counts in admin metrics**

Load today's `service_events` rows for `book_qr_result_open`, pass them into `buildAdminMetrics`, and render total/mobile QR counts in dashboard metric cards.

### Task 3: Replace Book Links And Remove Share Button

**Files:**
- Modify: `src/types/session.ts`
- Modify: `src/lib/books/types.ts`
- Modify: `src/lib/books/provider.ts`
- Modify: `src/components/result/BookRecommendationCard.tsx`
- Modify: `src/components/result/ShareableTypeCard.tsx`
- Modify: `src/app/api/result/[id]/recommendations/route.ts`
- Modify: `scripts/library/fetch-gachon-covers.ts`
- Modify: `scripts/library/tag-gachon-books.ts`
- Modify: `scripts/library/import-gachon-library.ts`
- Add: `supabase/migrations/20260513000000_book_detail_urls_and_qr_events.sql`

- [x] **Step 1: Add Gachon URL fields**

Add optional `libraryDetailUrl` to `BookRecommendation` and optional `detailUrl` to `LibraryBook`; add a nullable `detail_url` database column for future imports.

- [x] **Step 2: Stop generating Naver URLs**

In recommendation generation, set `libraryDetailUrl` from `book.detailUrl` or a Gachon catalog search fallback. Remove new `naverBookUrl` generation while keeping the legacy type optional for old stored results.

- [x] **Step 3: Stop rendering Naver URLs**

In `BookRecommendationCard`, use `libraryDetailUrl` or the Gachon fallback. Never fall back to `naverBookUrl`.

- [x] **Step 4: Preserve detail URL through import scripts**

Carry metadata `detailUrl` through enrichment, tagging, and import rows so future book imports can store exact Gachon detail URLs when available.

- [x] **Step 5: Remove mobile share action**

Remove the share button and html-to-image code from `ShareableTypeCard` while leaving the visual type card intact.

### Task 4: Verify

**Files:**
- No production file edits unless tests reveal a defect.

- [x] **Step 1: Run focused tests**

Run: `pnpm vitest run tests/components/resultPage.test.tsx tests/adminMetrics.test.ts`

Expected: all focused tests pass.

- [x] **Step 2: Run broader test suite**

Run: `pnpm test`

Expected: all tests pass, except unrelated pre-existing failures if they are clearly tied to the already-dirty reading type files.
