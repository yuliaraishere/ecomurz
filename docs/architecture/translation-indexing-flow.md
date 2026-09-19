# Translation & Indexing Synchronization Flow — RUPA Marketplace

This document details how catalog changes and translations synchronize with the search engine index.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Merchant / Admin
    participant CatalogSvc as AdminCatalogService
    participant TransSvc as ensureProductTranslations
    participant TransProvider as TranslationProvider (Google / Mock)
    participant DB as PostgreSQL (Product + ProductTranslation)
    participant SearchIndexer as SearchIndexProvider (Algolia / Mock)

    Admin->>CatalogSvc: Creates or updates product
    CatalogSvc->>TransSvc: Validates 8-language completeness
    opt Missing Translations Detected
        TransSvc->>TransProvider: translate(text, "id", missingLocale)
        TransProvider-->>TransSvc: Returns translated text
        TransSvc->>DB: Persists child ProductTranslation record
    end
    TransSvc->>SearchIndexer: indexProduct(canonicalProduct)
    Note over SearchIndexer: Builds ProductSearchDocument with all 8 localized names
    SearchIndexer-->>SearchIndexer: Upserts document into Algolia / Mock search index
    SearchIndexer-->>CatalogSvc: Synchronization complete
```

## Batch Reindexing Pipeline

In addition to event-driven single product indexing, full batch reindexing can be triggered at any time:

1. **CLI Execution**:
   ```bash
   npm run search:index
   ```
2. **Admin Operations Portal**:
   - URL: `/[locale]/admin/search`
   - Invokes `reindexCatalogAction()` server action protected with `requireAdmin()`.
   - Iterates through all active products, batches documents in chunks of 100, and updates the search index idempotently.
