# RUPA Marketplace — REST API Specification

This document details the REST API layer implemented for the RUPA Multilingual Asian Marketplace using Next.js Route Handlers.

---

## 1. Architectural Principles

1. **Layered Architecture & Separation of Concerns**:
   - **Route Handlers** (`app/api/*`) handle HTTP parsing, query/body validation, cookie management, status codes, and JSON serialization.
   - **Domain Services & Repositories** (`features/*`) encapsulate all business logic, data models, and database access.
   - **No Direct Prisma Calls**: Route handlers, UI components, and client-side code never call Prisma directly. All database access flows through service and repository contracts.

2. **Standardized Response Envelope**:
   - Every API endpoint returns a standardized JSON envelope ensuring predictability for consumers:
     ```json
     // Success Envelope
     {
       "success": true,
       "data": { ... } | [ ... ],
       "meta": { ... } // Optional: pagination, locale, filters
     }
     ```
     ```json
     // Error Envelope
     {
       "success": false,
       "error": {
         "code": "VALIDATION_ERROR | NOT_FOUND | UNAUTHORIZED | FORBIDDEN | BAD_REQUEST | INSUFFICIENT_STOCK | INTERNAL_SERVER_ERROR",
         "message": "Human-readable explanation of error",
         "details": [ ... ] // Optional: field-level error details
       }
     }
     ```

3. **Multilingual & Currency Invariants**:
   - All catalog and search endpoints support the optional `?locale=` query parameter supporting all 8 marketplace locales (`id`, `en`, `ja`, `tl`, `vi`, `th`, `hi`, `zh`). Defaults to `id`.
   - All monetary values are integer Japanese Yen (`JPY`).

4. **Session & Authentication**:
   - **Cart**: Backed by secure, HTTP-only session cookie (`rupa_cart_api`) with live catalog hydration and stock validation.
   - **Orders**: Authenticated via Supabase Auth JWT session. Customer endpoints enforce user ownership (`userId === currentUser.id`).

---

## 2. Standard Error Response Format

| HTTP Status | Error Code | Description |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Request payload, parameters, or types failed validation. Contains `details` array. |
| `400` | `INSUFFICIENT_STOCK` | Requested quantity exceeds available live inventory. |
| `400` | `BAD_REQUEST` | Malformed JSON or invalid query structure. |
| `401` | `UNAUTHORIZED` | Authentication required but missing or expired. |
| `403` | `FORBIDDEN` | Authenticated user is not authorized to access the requested resource. |
| `404` | `NOT_FOUND` | Requested entity (product, cart item, order) was not found. |
| `500` | `INTERNAL_SERVER_ERROR` | Uncaught server exception or infrastructure failure. |

### Error Format Example:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "quantity",
        "issue": "Must be an integer greater than 0"
      }
    ]
  }
}
```

---

## 3. Endpoints Catalogue

---

### 3.1. `GET /api/products`

Retrieves a paginated list of catalog products with optional category filtering and locale projection.

#### Responsibilities
- Query catalog repository with pagination (`page`, `limit`).
- Filter by category slug (`category`).
- Project localized product title and description based on `locale` query param.

#### Query Parameters
- `page` (optional, number, default: `1`): Page number (>= 1).
- `limit` (optional, number, default: `12`, max: `100`): Products per page.
- `category` (optional, string): Category slug (e.g. `mie-pasta`, `daging-unggas`).
- `locale` (optional, string, default: `id`): Target language code.

#### Request Example
```http
GET /api/products?category=mie-pasta&page=1&limit=2&locale=en HTTP/1.1
Host: example.com
```

#### Response Example (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "id": "mie-instan-kuah-kari",
      "slug": "mie-instan-kuah-kari",
      "name": "Instant Curry Soup Noodles",
      "description": "Authentic rich curry flavored instant soup noodles.",
      "price": 180,
      "category": "mie-pasta",
      "image": "/images/products/mie-instan-kuah-kari.webp",
      "stock": 150,
      "rating": 4.9,
      "reviewCount": 320
    }
  ],
  "meta": {
    "page": 1,
    "limit": 2,
    "total": 5,
    "totalPages": 3,
    "category": "mie-pasta",
    "locale": "en"
  }
}
```

---

### 3.2. `GET /api/products/:id`

Retrieves single product details by product ID or canonical slug.

#### Responsibilities
- Find product by exact ID or slug.
- Project localized product name and description based on `locale`.
- Return `404 NOT_FOUND` if the product does not exist.

#### URL Parameters
- `id` (required, string): Product ID or slug (e.g. `ayam-kampung-segar`).

#### Query Parameters
- `locale` (optional, string, default: `id`): Target language code.

#### Request Example
```http
GET /api/products/ayam-kampung-segar?locale=ja HTTP/1.1
Host: example.com
```

#### Response Example (`200 OK`)
```json
{
  "success": true,
  "data": {
    "id": "ayam-kampung-segar",
    "slug": "ayam-kampung-segar",
    "name": "新鮮な地鶏",
    "description": "放し飼いで育てられた高品質でジューシーな地鶏の丸ごと肉。",
    "price": 1200,
    "category": "daging-unggas",
    "image": "/images/products/ayam-kampung-segar.webp",
    "stock": 50,
    "rating": 4.8,
    "reviewCount": 124
  },
  "meta": {
    "locale": "ja"
  }
}
```

#### Error Example (`404 NOT_FOUND`)
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Product \"invalid-id\" not found"
  }
}
```

---

### 3.3. `GET /api/search`

Executes cross-language semantic and lexical search across product concepts.

#### Responsibilities
- Validates that non-empty `q` search parameter is provided.
- Executes search via `searchCatalogProducts()` (Algolia or deterministic Mock fallback).
- Returns canonical matching products across all 8 supported languages.

#### Query Parameters
- `q` (required, string): Search query string.
- `locale` (optional, string, default: `id`): Target display locale.
- `limit` (optional, number, default: `20`): Maximum results to return.

#### Request Example
```http
GET /api/search?q=chicken&locale=en HTTP/1.1
Host: example.com
```

#### Response Example (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "id": "ayam-kampung-segar",
      "slug": "ayam-kampung-segar",
      "name": "Fresh Free-Range Chicken",
      "description": "Premium whole free-range chicken, juicy and nutritious.",
      "price": 1200,
      "category": "daging-unggas",
      "image": "/images/products/ayam-kampung-segar.webp",
      "stock": 50
    }
  ],
  "meta": {
    "query": "chicken",
    "total": 1,
    "locale": "en"
  }
}
```

---

### 3.4. `GET /api/cart`

Retrieves the current user's session cart with authoritative pricing and live inventory checks.

#### Responsibilities
- Reads cart items from the session cookie (`rupa_cart_api`).
- Hydrates items with authoritative prices from the database.
- Checks live inventory stock availability (`inStock`, `availableStock`).
- Calculates line item subtotals and overall cart subtotal.

#### Query Parameters
- `locale` (optional, string, default: `id`): Target language for item names.

#### Request Example
```http
GET /api/cart?locale=en HTTP/1.1
Host: example.com
Cookie: rupa_cart_api=[{"itemId":"item_ayam-kampung-segar","productId":"ayam-kampung-segar","quantity":2}]
```

#### Response Example (`200 OK`)
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "itemId": "item_ayam-kampung-segar",
        "productId": "ayam-kampung-segar",
        "productName": "Fresh Free-Range Chicken",
        "productPrice": 1200,
        "productImage": "/images/products/ayam-kampung-segar.webp",
        "quantity": 2,
        "subtotal": 2400,
        "availableStock": 50,
        "inStock": true
      }
    ],
    "itemCount": 2,
    "subtotal": 2400,
    "currency": "JPY"
  },
  "meta": {
    "locale": "en"
  }
}
```

---

### 3.5. `POST /api/cart`

Adds an item to the session cart or increments its quantity.

#### Responsibilities
- Validates `productId` and positive integer `quantity`.
- Checks product existence and verifies stock availability.
- Updates session cookie.

#### Request Body
```json
{
  "productId": "ayam-kampung-segar",
  "quantity": 2
}
```

#### Response Example (`201 Created`)
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "itemId": "item_ayam-kampung-segar",
        "productId": "ayam-kampung-segar",
        "productName": "Ayam Kampung Segar",
        "productPrice": 1200,
        "productImage": "/images/products/ayam-kampung-segar.webp",
        "quantity": 2,
        "subtotal": 2400,
        "availableStock": 50,
        "inStock": true
      }
    ],
    "itemCount": 2,
    "subtotal": 2400,
    "currency": "JPY"
  },
  "meta": {
    "locale": "id"
  }
}
```

---

### 3.6. `PATCH /api/cart/:itemId`

Updates quantity of an existing item in the cart.

#### Responsibilities
- Validates item existence in cart.
- Validates `quantity` is a non-negative integer.
- If `quantity === 0`, removes the item.
- Verifies stock limits before increasing quantity.

#### Request Body
```json
{
  "quantity": 3
}
```

#### Response Example (`200 OK`)
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "itemId": "item_ayam-kampung-segar",
        "productId": "ayam-kampung-segar",
        "productName": "Ayam Kampung Segar",
        "productPrice": 1200,
        "productImage": "/images/products/ayam-kampung-segar.webp",
        "quantity": 3,
        "subtotal": 3600,
        "availableStock": 50,
        "inStock": true
      }
    ],
    "itemCount": 3,
    "subtotal": 3600,
    "currency": "JPY"
  },
  "meta": {
    "locale": "id"
  }
}
```

---

### 3.7. `DELETE /api/cart/:itemId`

Removes a specific item from the cart.

#### Responsibilities
- Identifies item by `itemId` or `productId`.
- Removes item from session cookie.
- Returns updated cart state.

#### Request Example
```http
DELETE /api/cart/item_ayam-kampung-segar HTTP/1.1
Host: example.com
```

#### Response Example (`200 OK`)
```json
{
  "success": true,
  "data": {
    "items": [],
    "itemCount": 0,
    "subtotal": 0,
    "currency": "JPY"
  },
  "meta": {
    "locale": "id"
  }
}
```

---

### 3.8. `POST /api/orders`

Places an order, reserves inventory atomically, creates historical item snapshots, and clears the cart.

#### Responsibilities
- Validates recipient shipping address and non-empty items payload.
- Validates payment method and shipping method.
- Invokes domain service `createOrderService`.
- Reserves stock in database and creates `OrderItem` snapshots.
- Clears session cart upon success.

#### Request Body
```json
{
  "items": [
    {
      "productId": "ayam-kampung-segar",
      "quantity": 1
    }
  ],
  "address": {
    "name": "Budi Santoso",
    "phone": "08123456789",
    "address": "Jl. Sudirman No. 45",
    "city": "Jakarta",
    "postalCode": "10220"
  },
  "shippingId": "regular",
  "payment": "qris",
  "couponCode": "WELCOME10",
  "locale": "id"
}
```

#### Response Example (`201 Created`)
```json
{
  "success": true,
  "data": {
    "id": "ORD-20260919-4821",
    "status": "PENDING_PAYMENT",
    "total": 1700,
    "subtotal": 1200,
    "shippingFee": 500,
    "discount": 0,
    "currency": "JPY",
    "paymentMethod": "qris",
    "recipientName": "Budi Santoso",
    "createdAt": "2026-09-19T21:19:30.000Z"
  }
}
```

---

### 3.9. `GET /api/orders`

Retrieves a list of orders belonging to the currently authenticated user.

#### Responsibilities
- Authenticates request via Supabase Auth session (`getCurrentUser`).
- Returns `401 UNAUTHORIZED` if unauthenticated.
- Queries orders repository filtered by user ID (`orderRepository.getOrdersByUserId`).
- Supports pagination (`page`, `limit`).

#### Request Example
```http
GET /api/orders?page=1&limit=10 HTTP/1.1
Host: example.com
Authorization: Bearer <supabase_access_token>
```

#### Response Example (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "id": "ORD-20260919-4821",
      "status": "PENDING_PAYMENT",
      "total": 1700,
      "itemCount": 1,
      "recipientName": "Budi Santoso",
      "createdAt": "2026-09-19T21:19:30.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### 3.10. `GET /api/orders/:id`

Retrieves detailed order information including items, shipping, payment status, and tracking events.

#### Responsibilities
- Authenticates request.
- Retrieves order by public ID (`ORD-...`) or internal ID.
- Enforces customer ownership (`order.userId === user.id`) unless user is admin.
- Returns `404 NOT_FOUND` if order does not exist.
- Returns `403 FORBIDDEN` if accessing another customer's order.

#### Request Example
```http
GET /api/orders/ORD-20260919-4821 HTTP/1.1
Host: example.com
```

#### Response Example (`200 OK`)
```json
{
  "success": true,
  "data": {
    "id": "ORD-20260919-4821",
    "status": "PENDING_PAYMENT",
    "items": [
      {
        "id": "item_123",
        "productId": "ayam-kampung-segar",
        "productName": "Ayam Kampung Segar",
        "price": 1200,
        "quantity": 1,
        "subtotal": 1200
      }
    ],
    "subtotal": 1200,
    "shippingFee": 500,
    "discount": 0,
    "total": 1700,
    "shippingMethod": "regular",
    "paymentMethod": "qris",
    "address": {
      "recipientName": "Budi Santoso",
      "recipientPhone": "08123456789",
      "shippingAddress": "Jl. Sudirman No. 45",
      "city": "Jakarta",
      "postalCode": "10220"
    },
    "createdAt": "2026-09-19T21:19:30.000Z"
  }
}
```
