# Step 13 — Multilingual Search & Product Discovery

## 1. Overview
Step 13 introduces a production-ready **Multilingual Search & Product Discovery** subsystem to the RUPA marketplace. It guarantees that customers searching in any of the 8 supported languages (`id`, `en`, `ja`, `tl`, `vi`, `th`, `hi`, `zh`) will discover products whose names represent the same product concept across all languages.

> **Active Integration Note:** The provider layer, multilingual search documents, Algolia indexing flow, automated tests, and storefront UI integration are active end-to-end. The storefront calls `searchCatalogProducts` via Server Actions and page parameters, querying Algolia (or the zero-dependency in-memory mock engine when Algolia keys are not set), while pairing with client-side fallback for instant 0ms feedback.

## 2. Core Business Requirement
When a customer searches for:
- `"ayam"` (Indonesian)
- `"chicken"` (English)
- `"鶏"` (Japanese)
- `"manok"` (Tagalog)
- `"gà"` (Vietnamese)
- `"ไก่"` (Thai)
- `"मुर्गा"` (Hindi)
- `"走地鸡"` (Chinese)

All queries resolve to the same canonical product entity:
```text
productId = "ayam-kampung-segar"
```

The returned product is projected and rendered in the **user's active UI locale**:
- If the user is on `/id`, the title is displayed as `"Ayam Kampung Segar"`.
- If the user is on `/en`, the title is displayed as `"Fresh Free-Range Chicken"`.
- If the user is on `/ja`, the title is displayed as `"新鮮な地鶏（丸鶏）"`.

## 3. Architecture & Data Flow
```text
User enters query
       ↓
Search Service (features/search)
       ↓
SearchProvider (Algolia / Mock)
       ↓
Matches across searchableNames (all 8 languages)
       ↓
Returns Canonical Product IDs
       ↓
CatalogRepository (PostgreSQL / Prisma)
       ↓
ProductLocalizationService
       ↓
LocalizedProduct (rendered in user's UI locale)
```

## 4. Provider Abstractions & Local Development
- **Search Provider**: `AlgoliaSearchProvider` for production, with zero-dependency `MockSearchProvider` for local development and testing.
- **Translation Provider**: `GoogleTranslateProvider` (server-side Cloud Translation REST v2) and `MockTranslationProvider` for offline testing.
- When credentials are not supplied, the system cleanly and automatically falls back to mock providers.

## 5. Administration & Synchronization
- **CLI Synchronization**:
  ```bash
  npm run search:index
  ```
- **Admin Management Portal**:
  - Accessible at `/[locale]/admin/search`
  - Shows active provider status, target index name, and total indexed documents.
  - Interactive "Trigger Full Reindex" button executing server-authoritative `reindexCatalogAction()`.
  - Protected with `requireAdmin()` check.

## 6. Security
- `ALGOLIA_ADMIN_API_KEY` and `GOOGLE_TRANSLATE_API_KEY` are strictly server-side runtime secrets.
- Browser code never receives administrative indexing privileges.
