# Search Data Flow — RUPA Marketplace

This document describes the runtime execution flow when a user performs a search on the storefront.

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant Header as SiteHeader / SearchInput
    participant Hook as useCatalogFilters
    participant Catalog as HomeCatalog
    participant Svc as searchCatalogProducts
    participant Engine as SearchProvider (Algolia / Mock)
    participant DB as Supabase PostgreSQL
    participant Loc as ProductLocalization

    Customer->>Header: Types query (e.g. "chicken")
    Header->>Hook: Updates query with 300ms debounce
    Hook->>Catalog: Synchronizes URL query param (?q=chicken)
    Catalog->>Svc: searchCatalogProducts({ query: "chicken", locale: "id" })
    Svc->>Engine: searchProducts({ query: "chicken" })
    Note over Engine: Queries index across all 8 languages in searchableNames
    Engine-->>Svc: Returns hits: ["ayam-kampung-segar", ...]
    Svc->>DB: Hydrates canonical Product entities
    DB-->>Svc: Returns Product entities with all localizedContent
    Svc->>Loc: getLocalizedProducts(products, "id")
    Note over Loc: Resolves Indonesian translation ("Ayam Kampung Segar")
    Loc-->>Catalog: Returns LocalizedProduct[]
    Catalog-->>Customer: Renders ProductCard in storefront in Indonesian
```

## Key Invariants in Search Data Flow

1. **Client-Side Debouncing**: User typing is debounced at 300ms before router state updates, preventing request thrashing.
2. **URL Query Preservation**: Filter state is synced to the URL query string (`?q=...&category=...`), enabling shareable search links and browser history navigation.
3. **Locale Agnostic Querying**: Queries in Japanese, English, Indonesian, or any other supported language match the same canonical product.
4. **Active UI Locale Rendering**: The user's active browsing locale (e.g. `/id`, `/en`, `/ja`) determines how the product title and description are rendered on screen, regardless of what language the search query was typed in.
