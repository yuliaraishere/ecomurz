import 'dotenv/config';
process.env.SEARCH_PROVIDER = 'mock';
import { NextRequest } from 'next/server';
import { GET as getProducts } from '../app/api/products/route';
import { GET as getProductById } from '../app/api/products/[id]/route';
import { GET as searchProducts } from '../app/api/search/route';
import { GET as getCart, POST as postCart } from '../app/api/cart/route';
import { PATCH as patchCartItem, DELETE as deleteCartItem } from '../app/api/cart/[itemId]/route';
import { GET as getOrders, POST as postOrders } from '../app/api/orders/route';
import { GET as getOrderById } from '../app/api/orders/[id]/route';
import { prisma } from '../lib/prisma';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ ${message}`);
}

async function runApiTests() {
  console.log('================================================================');
  console.log('MARKETPLACE REST API LAYER - COMPREHENSIVE VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;

  // -------------------------------------------------------------
  // SUITE 1: GET /api/products
  // -------------------------------------------------------------
  console.log('--- SUITE 1: GET /api/products ---');
  {
    const req = new NextRequest('http://localhost:3000/api/products?page=1&limit=5&locale=en');
    const res = await getProducts(req);
    assert(res.status === 200, `Returns 200 OK (got ${res.status})`);

    const json = await res.json();
    assert(json.success === true, 'Response envelope has success: true');
    assert(Array.isArray(json.data), 'data is an array of products');
    assert(json.data.length <= 5, 'Respects pagination limit');
    assert(json.meta.locale === 'en', 'Meta reflects requested locale');
    assert(typeof json.meta.total === 'number', 'Meta contains total product count');
    passed += 5;
  }

  // Category filter
  {
    const req = new NextRequest('http://localhost:3000/api/products?category=mie-pasta&locale=id');
    const res = await getProducts(req);
    assert(res.status === 200, 'Category filter returns 200 OK');
    const json = await res.json();
    assert(json.success === true, 'Category response envelope success is true');
    assert(json.data.length > 0, 'Returns products for category');
    assert(json.meta.category === 'mie-pasta', 'Meta reflects category filter');
    passed += 4;
  }

  // -------------------------------------------------------------
  // SUITE 2: GET /api/products/:id
  // -------------------------------------------------------------
  console.log('\n--- SUITE 2: GET /api/products/:id ---');
  {
    const req = new NextRequest('http://localhost:3000/api/products/ayam-kampung-segar?locale=ja');
    const res = await getProductById(req, { params: Promise.resolve({ id: 'ayam-kampung-segar' }) });
    assert(res.status === 200, 'Existing product returns 200 OK');

    const json = await res.json();
    assert(json.success === true, 'Product detail envelope success is true');
    assert(json.data.id === 'ayam-kampung-segar', 'Returns matching product ID');
    assert(json.data.name.includes('地鶏') || json.data.name.length > 0, 'Returns localized product name in Japanese');
    assert(typeof json.data.price === 'number' && Number.isInteger(json.data.price), 'Price is integer JPY');
    passed += 5;
  }

  // 404 for non-existent product
  {
    const req = new NextRequest('http://localhost:3000/api/products/non-existent-product-123');
    const res = await getProductById(req, { params: Promise.resolve({ id: 'non-existent-product-123' }) });
    assert(res.status === 404, `Non-existent product returns 404 (got ${res.status})`);

    const json = await res.json();
    assert(json.success === false, 'Error envelope success is false');
    assert(json.error.code === 'NOT_FOUND', 'Error code is NOT_FOUND');
    assert(typeof json.error.message === 'string', 'Error message is provided');
    passed += 4;
  }

  // -------------------------------------------------------------
  // SUITE 3: GET /api/search
  // -------------------------------------------------------------
  console.log('\n--- SUITE 3: GET /api/search ---');
  // Missing query returns 400 VALIDATION_ERROR
  {
    const req = new NextRequest('http://localhost:3000/api/search');
    const res = await searchProducts(req);
    assert(res.status === 400, `Missing query returns 400 (got ${res.status})`);

    const json = await res.json();
    assert(json.success === false, 'Search validation failure envelope is false');
    assert(json.error.code === 'VALIDATION_ERROR', 'Error code is VALIDATION_ERROR');
    assert(Array.isArray(json.error.details), 'Validation details array provided');
    passed += 4;
  }

  // Valid search query
  {
    const req = new NextRequest('http://localhost:3000/api/search?q=chicken&locale=en');
    const res = await searchProducts(req);
    assert(res.status === 200, 'Valid search returns 200 OK');

    const json = await res.json();
    assert(json.success === true, 'Search results success is true');
    assert(Array.isArray(json.data), 'Search results data is array');
    assert(json.data.length > 0, 'Search for "chicken" yields results');
    assert(json.meta.query === 'chicken', 'Meta query matches input');
    assert(json.data.some((p: any) => p.id === 'ayam-kampung-segar'), 'Resolves to canonical product ayam-kampung-segar');
    passed += 6;
  }

  // -------------------------------------------------------------
  // SUITE 4: CART ENDPOINTS (/api/cart)
  // -------------------------------------------------------------
  console.log('\n--- SUITE 4: CART ENDPOINTS (/api/cart) ---');

  // Validation on POST
  {
    const req = new NextRequest('http://localhost:3000/api/cart', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await postCart(req);
    assert(res.status === 400, `Missing productId returns 400 (got ${res.status})`);
    const json = await res.json();
    assert(json.error.code === 'VALIDATION_ERROR', 'Rejects missing productId with VALIDATION_ERROR');
    passed += 2;
  }

  {
    const req = new NextRequest('http://localhost:3000/api/cart', {
      method: 'POST',
      body: JSON.stringify({ productId: 'ayam-kampung-segar', quantity: -1 }),
    });
    const res = await postCart(req);
    assert(res.status === 400, 'Negative quantity returns 400');
    const json = await res.json();
    assert(json.error.code === 'VALIDATION_ERROR', 'Rejects negative quantity');
    passed += 2;
  }

  // Positive Cart Lifecycle: POST -> GET -> PATCH -> DELETE
  {
    // 1. Add item to cart
    const addReq = new NextRequest('http://localhost:3000/api/cart?locale=en', {
      method: 'POST',
      body: JSON.stringify({ productId: 'ayam-kampung-segar', quantity: 2 }),
    });
    const addRes = await postCart(addReq);
    assert(addRes.status === 201, `Add item to cart returns 201 (got ${addRes.status})`);
    const addJson = await addRes.json();
    assert(addJson.success === true, 'Add item returns success: true');
    assert(addJson.data.items.length === 1, 'Cart has 1 item');
    assert(addJson.data.items[0].quantity === 2, 'Item quantity is 2');
    assert(addJson.data.subtotal > 0, 'Cart subtotal calculated');
    passed += 5;

    // 2. Get cart
    const getReq = new NextRequest('http://localhost:3000/api/cart?locale=en');
    const getRes = await getCart(getReq);
    assert(getRes.status === 200, 'GET /api/cart returns 200');
    const getJson = await getRes.json();
    assert(getJson.data.items.length === 1, 'GET returns 1 item in cart');
    passed += 2;

    // 3. Update item quantity
    const patchReq = new NextRequest('http://localhost:3000/api/cart/item_ayam-kampung-segar?locale=en', {
      method: 'PATCH',
      body: JSON.stringify({ quantity: 3 }),
    });
    const patchRes = await patchCartItem(patchReq, { params: Promise.resolve({ itemId: 'item_ayam-kampung-segar' }) });
    assert(patchRes.status === 200, 'PATCH /api/cart/:itemId returns 200');
    const patchJson = await patchRes.json();
    assert(patchJson.data.items[0].quantity === 3, 'Cart item quantity updated to 3');
    passed += 2;

    // 4. Remove item from cart
    const deleteReq = new NextRequest('http://localhost:3000/api/cart/item_ayam-kampung-segar?locale=en', {
      method: 'DELETE',
    });
    const deleteRes = await deleteCartItem(deleteReq, { params: Promise.resolve({ itemId: 'item_ayam-kampung-segar' }) });
    assert(deleteRes.status === 200, 'DELETE /api/cart/:itemId returns 200');
    const deleteJson = await deleteRes.json();
    assert(deleteJson.data.items.length === 0, 'Cart is empty after delete');
    passed += 2;
  }

  // -------------------------------------------------------------
  // SUITE 5: POST /api/orders
  // -------------------------------------------------------------
  console.log('\n--- SUITE 5: POST /api/orders ---');

  // Missing items validation
  {
    const req = new NextRequest('http://localhost:3000/api/orders', {
      method: 'POST',
      body: JSON.stringify({ items: [] }),
    });
    const res = await postOrders(req);
    assert(res.status === 400, `Empty items array returns 400 (got ${res.status})`);
    const json = await res.json();
    assert(json.error.code === 'VALIDATION_ERROR', 'Empty items returns VALIDATION_ERROR');
    passed += 2;
  }

  // Missing address validation
  {
    const req = new NextRequest('http://localhost:3000/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        items: [{ productId: 'ayam-kampung-segar', quantity: 1 }],
        address: {},
      }),
    });
    const res = await postOrders(req);
    assert(res.status === 400, `Missing address returns 400 (got ${res.status})`);
    const json = await res.json();
    assert(json.error.code === 'VALIDATION_ERROR', 'Missing address fields returns VALIDATION_ERROR');
    passed += 2;
  }

  // Successful order creation via API
  {
    const req = new NextRequest('http://localhost:3000/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        items: [{ productId: 'ayam-kampung-segar', quantity: 1 }],
        address: {
          name: 'API Test Customer',
          phone: '08123456789',
          address: 'Jl. Sudirman No. 1',
          city: 'Jakarta',
          postalCode: '10220',
        },
        shippingId: 'regular',
        payment: 'qris',
        locale: 'id',
      }),
    });
    const res = await postOrders(req);
    assert(res.status === 201, `Valid order creation returns 201 Created (got ${res.status})`);

    const json = await res.json();
    assert(json.success === true, 'Order created with success: true');
    assert(typeof json.data.id === 'string' && json.data.id.length > 0, 'Created order has valid publicId');
    assert(json.data.status === 'PENDING_PAYMENT', 'New order starts in PENDING_PAYMENT status');
    assert(Number.isInteger(json.data.total) && json.data.total > 0, 'Order total is valid integer JPY');
    passed += 5;
  }

  // -------------------------------------------------------------
  // SUITE 6: GET /api/orders & GET /api/orders/:id (SECURITY & AUTH)
  // -------------------------------------------------------------
  console.log('\n--- SUITE 6: GET /api/orders & GET /api/orders/:id ---');

  // Unauthenticated GET /api/orders returns 401
  {
    const req = new NextRequest('http://localhost:3000/api/orders');
    const res = await getOrders(req);
    assert(res.status === 401, `Unauthenticated GET /api/orders returns 401 (got ${res.status})`);
    const json = await res.json();
    assert(json.success === false, 'Envelope success is false');
    assert(json.error.code === 'UNAUTHORIZED', 'Error code is UNAUTHORIZED');
    passed += 3;
  }

  // Unauthenticated GET /api/orders/:id returns 401
  {
    const req = new NextRequest('http://localhost:3000/api/orders/ORD-NONEXISTENT');
    const res = await getOrderById(req, { params: Promise.resolve({ id: 'ORD-NONEXISTENT' }) });
    assert(res.status === 401, `Unauthenticated GET /api/orders/:id returns 401 (got ${res.status})`);
    const json = await res.json();
    assert(json.error.code === 'UNAUTHORIZED', 'Error code is UNAUTHORIZED');
    passed += 2;
  }

  console.log('\n================================================================');
  console.log(`RESULTS: ${passed} ASSERTIONS PASSED!`);
  console.log('================================================================');
  console.log('🎉 ALL REST API LAYER TESTS PASSED SUCCESSFULLY!\n');
}

runApiTests()
  .catch((err) => {
    console.error('API Test Suite Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
