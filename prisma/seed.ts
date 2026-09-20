import { PrismaClient } from '@prisma/client';
import { mockProducts } from '../features/catalog/data/mock-products';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, delay = 500): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      if (i === maxRetries - 1) throw err;
      console.warn(`[Seed] Operation failed (${err?.message || err}). Retrying (${i + 1}/${maxRetries})...`);
      await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
    }
  }
  throw new Error('Unreachable');
}

async function main() {
  console.log('Starting Asian Mart database seeding...');

  // Clean dependent order records in correct FK dependency order
  await withRetry(() => prisma.returnItem.deleteMany());
  await withRetry(() => prisma.return.deleteMany());
  await withRetry(() => prisma.refund.deleteMany());
  await withRetry(() => prisma.cancellation.deleteMany());
  await withRetry(() => prisma.shipment.deleteMany());
  await withRetry(() => prisma.promotionUsage.deleteMany());
  await withRetry(() => prisma.orderStatusHistory.deleteMany());
  await withRetry(() => prisma.payment.deleteMany());
  await withRetry(() => prisma.inventoryReservation.deleteMany());
  await withRetry(() => prisma.orderItem.deleteMany());
  await withRetry(() => prisma.order.deleteMany());
  console.log('Cleaned old test orders and order items.');

  // 2. Remove old products and translations not present in the new Asian Mart catalog
  const newProductIds = mockProducts.map((p) => p.id);
  await prisma.productTranslation.deleteMany({
    where: {
      productId: {
        notIn: newProductIds,
      },
    },
  });
  await prisma.product.deleteMany({
    where: {
      id: {
        notIn: newProductIds,
      },
    },
  });
  console.log('Removed old demo products.');

  // 3. Upsert all current Categories first so products can reference them
  const categoryNames = Array.from(new Set(mockProducts.map((p) => p.category)));
  const newCategoryIds = categoryNames.map((name) => name.toLowerCase());

  for (const name of categoryNames) {
    const id = name.toLowerCase();
    const slug = id.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    await withRetry(() =>
      prisma.category.upsert({
        where: { id },
        create: { id, name, slug, status: 'ACTIVE' },
        update: { name, slug, status: 'ACTIVE' },
      })
    );
    console.log(`Upserted category: ${name} (${id})`);
  }

  // 4. Seed Products and Localized Translations
  let index = 1;
  for (const product of mockProducts) {
    const categoryId = product.category.toLowerCase();
    const sku = `RUPA-ASIAN-${String(index++).padStart(3, '0')}`;
    const slug = product.id;

    await withRetry(() =>
      prisma.product.upsert({
        where: { id: product.id },
        create: {
          id: product.id,
          sku,
          slug,
          status: 'ACTIVE',
          currency: 'JPY',
          categoryId,
          price: product.price,
          rating: product.rating,
          reviews: product.reviews,
          stock: product.stock,
          image: product.image,
          accent: product.accent,
        },
        update: {
          sku,
          slug,
          status: 'ACTIVE',
          currency: 'JPY',
          categoryId,
          price: product.price,
          rating: product.rating,
          reviews: product.reviews,
          stock: product.stock,
          image: product.image,
          accent: product.accent,
        },
      })
    );

    for (const [locale, content] of Object.entries(product.localizedContent)) {
      if (!content) continue;
      await withRetry(() =>
        prisma.productTranslation.upsert({
          where: {
            productId_locale: {
              productId: product.id,
              locale,
            },
          },
          create: {
            productId: product.id,
            locale,
            name: content.name,
            description: content.description,
          },
          update: {
            name: content.name,
            description: content.description,
          },
        })
      );
    }

    // Upsert Inventory record for product
    await withRetry(() =>
      prisma.inventory.upsert({
        where: { productId: product.id },
        create: {
          productId: product.id,
          availableQty: product.stock,
          reservedQty: 0,
        },
        update: {
          // preserve current availableQty and reservedQty if inventory exists, or ensure availableQty is initialized
        },
      })
    );

    console.log(`Upserted Asian Mart product, translations, and inventory: ${product.id}`);
  }

  // 5. Seed Realistic Multilingual Marketplace Transaction History
  console.log('Seeding transaction history (Orders, OrderItems, Payments, Shipments, Histories)...');

  // Ensure default demo users exist
  const demoUsers = [
    { id: 'demo-customer-tokyo', role: 'CUSTOMER' },
    { id: 'demo-customer-osaka', role: 'CUSTOMER' },
    { id: 'demo-customer-yokohama', role: 'CUSTOMER' },
    { id: 'demo-admin-system', role: 'ADMIN' },
  ];

  for (const user of demoUsers) {
    await withRetry(() =>
      prisma.user.upsert({
        where: { id: user.id },
        create: { id: user.id, role: user.role },
        update: { role: user.role },
      })
    );
  }

  // Define 6 realistic past orders in Japanese Yen (JPY)
  const seededOrders = [
    {
      publicId: 'ORD-JP-2026-001',
      userId: 'demo-customer-tokyo',
      recipientName: 'Kenji Sato (佐藤 健二)',
      recipientPhone: '+81-90-1234-5678',
      recipientAddress: 'Shinjuku-ku, Nishi-Shinjuku 2-8-1, Park Tower 14F',
      recipientCity: 'Tokyo',
      recipientPostalCode: '160-0023',
      shippingMethodId: 'yamato-cool-express',
      shippingMethodName: 'Yamato Cool TA-Q-BIN (ヤマトクール便)',
      shippingMethodEta: '1-2 business days',
      shippingPrice: 850,
      paymentMethod: 'credit_card',
      status: 'DELIVERED',
      createdAt: new Date('2026-09-15T10:30:00Z'),
      shippedAt: new Date('2026-09-15T16:00:00Z'),
      deliveredAt: new Date('2026-09-16T11:45:00Z'),
      completedAt: new Date('2026-09-16T12:00:00Z'),
      trackingNumber: 'YAMATO-7829-1049-2819',
      items: [
        { productId: 'ayam-kampung-segar', quantity: 2, productName: 'Ayam Kampung Segar / 新鮮な地鶏（丸鶏）', productPrice: 680, productImage: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=1200&q=85' },
        { productId: 'bumbu-rendang-otentik', quantity: 3, productName: 'Bumbu Rendang Otentik / 本格インドネシア レンダンカレーの素', productPrice: 350, productImage: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1200&q=85' },
        { productId: 'beras-pandan-wangi-5kg', quantity: 1, productName: 'Beras Pandan Wangi Cianjur 5kg / 高級アジアン香り米', productPrice: 2150, productImage: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=1200&q=85' },
      ],
      paymentStatus: 'PAID',
      shipmentStatus: 'DELIVERED',
      carrierName: 'Yamato Transport',
    },
    {
      publicId: 'ORD-JP-2026-002',
      userId: 'demo-customer-osaka',
      recipientName: 'Siti Rahmawati',
      recipientPhone: '+81-80-9876-5432',
      recipientAddress: 'Osaka-shi, Chuo-ku, Dotonbori 1-5-10, Grand Heights 502',
      recipientCity: 'Osaka',
      recipientPostalCode: '542-0071',
      shippingMethodId: 'sagawa-regular',
      shippingMethodName: 'Sagawa Express (佐川急便)',
      shippingMethodEta: '2-3 business days',
      shippingPrice: 650,
      paymentMethod: 'stripe',
      status: 'SHIPPED',
      createdAt: new Date('2026-09-18T14:15:00Z'),
      shippedAt: new Date('2026-09-19T09:30:00Z'),
      trackingNumber: 'SAGAWA-9921-3829-1029',
      items: [
        { productId: 'indomie-goreng-spesial', quantity: 10, productName: 'Indomie Mi Goreng Spesial 85g / インドネシア風焼きそば', productPrice: 120, productImage: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=1200&q=85' },
        { productId: 'kecap-manis-kedelai-hitam', quantity: 2, productName: 'Kecap Manis Kedelai Hitam Kental / 特選 黒大豆ケチャップマニス', productPrice: 380, productImage: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1200&q=85' },
        { productId: 'kerupuk-udang-sidoarjo', quantity: 2, productName: 'Kerupuk Udang Sidoarjo Asli / 本場 プレミアム生えびせんべい', productPrice: 360, productImage: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=1200&q=85' },
      ],
      paymentStatus: 'PAID',
      shipmentStatus: 'SHIPPED',
      carrierName: 'Sagawa Express',
    },
    {
      publicId: 'ORD-JP-2026-003',
      userId: 'demo-customer-tokyo',
      recipientName: 'Mei-Ling Chen (陳 美玲)',
      recipientPhone: '+81-90-5555-8888',
      recipientAddress: 'Yokohama-shi, Naka-ku, Yamashitacho 120, Chinatown View 801',
      recipientCity: 'Yokohama',
      recipientPostalCode: '231-0023',
      shippingMethodId: 'yamato-cool-express',
      shippingMethodName: 'Yamato Cool TA-Q-BIN (ヤマトクール便)',
      shippingPrice: 850,
      paymentMethod: 'credit_card',
      status: 'PROCESSING',
      createdAt: new Date('2026-09-19T18:45:00Z'),
      items: [
        { productId: 'daging-slice-shabu', quantity: 2, productName: 'Daging Sapi Slice Shabu-Shabu 300g / 極上牛バラ薄切り肉', productPrice: 980, productImage: 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=1200&q=85' },
        { productId: 'sanuki-udon-segar', quantity: 4, productName: 'Sanuki Udon Segar / 本場香川の手打ち讃岐うどん生麺', productPrice: 180, productImage: 'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=1200&q=85' },
        { productId: 'baby-pakcoy-segar', quantity: 2, productName: 'Baby Pakcoy Segar Hidroponik / 朝採れフレッシュ ミニ青梗菜', productPrice: 120, productImage: 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?auto=format&fit=crop&w=1200&q=85' },
        { productId: 'minyak-wijen-murni', quantity: 1, productName: 'Minyak Wijen Murni 100% / 一番搾り 濃厚純正ごま油', productPrice: 480, productImage: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=1200&q=85' },
      ],
      paymentStatus: 'PAID',
      shipmentStatus: 'PENDING',
      carrierName: 'Yamato Transport',
    },
    {
      publicId: 'ORD-JP-2026-004',
      userId: 'demo-customer-yokohama',
      recipientName: 'Nguyen Van Minh',
      recipientPhone: '+81-70-3344-5566',
      recipientAddress: 'Kawasaki-shi, Saiwai-ku, Horikawa-cho 580',
      recipientCity: 'Kawasaki',
      recipientPostalCode: '212-0013',
      shippingMethodId: 'japan-post-yu-pack',
      shippingMethodName: 'Japan Post Yu-Pack (ゆうパック)',
      shippingPrice: 700,
      paymentMethod: 'konbini',
      status: 'PENDING_PAYMENT',
      createdAt: new Date('2026-09-20T08:00:00Z'),
      items: [
        { productId: 'udang-windu-segar', quantity: 2, productName: 'Udang Windu Segar Laut 500g / 特大天然ブラックタイガー海老', productPrice: 1100, productImage: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=1200&q=85' },
        { productId: 'pasta-tom-yum-thailand', quantity: 2, productName: 'Pasta Tom Yum Asli Thailand / 本格タイ トムヤムクンペースト', productPrice: 320, productImage: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=85' },
        { productId: 'bihun-jagung-premium', quantity: 3, productName: 'Bihun Jagung Pilihan / プレミアム極細米粉ビーフン', productPrice: 150, productImage: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=85' },
      ],
      paymentStatus: 'PENDING',
      shipmentStatus: 'PENDING',
      carrierName: 'Japan Post',
    },
    {
      publicId: 'ORD-JP-2026-005',
      userId: 'demo-customer-tokyo',
      recipientName: 'Aarav Patel',
      recipientPhone: '+81-90-7777-1111',
      recipientAddress: 'Edogawa-ku, Nishi-Kasai 3-15-2',
      recipientCity: 'Tokyo',
      recipientPostalCode: '134-0088',
      shippingMethodId: 'yamato-regular',
      shippingMethodName: 'Yamato TA-Q-BIN (ヤマト宅急便)',
      shippingPrice: 650,
      paymentMethod: 'credit_card',
      status: 'COMPLETED',
      createdAt: new Date('2026-09-12T09:00:00Z'),
      shippedAt: new Date('2026-09-12T15:00:00Z'),
      deliveredAt: new Date('2026-09-13T14:30:00Z'),
      completedAt: new Date('2026-09-14T10:00:00Z'),
      trackingNumber: 'YAMATO-3312-8492-9102',
      items: [
        { productId: 'garam-masala-india', quantity: 2, productName: 'Garam Masala Asli India / 本場インド直輸入 芳醇ガラムマサラ', productPrice: 390, productImage: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1200&q=85' },
        { productId: 'daging-kambing-muda', quantity: 2, productName: 'Daging Kambing Muda Potong 500g / 子羊肉・マトン角切り', productPrice: 1550, productImage: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=1200&q=85' },
        { productId: 'beras-jepang-koshihikari-5kg', quantity: 1, productName: 'Beras Jepang Koshihikari 5kg / 新潟県産コシヒカリ', productPrice: 2450, productImage: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=1200&q=85' },
        { productId: 'teh-melati-celup', quantity: 2, productName: 'Teh Celup Melati Asli / 本格アジアン ジャスミンティー', productPrice: 220, productImage: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=1200&q=85' },
      ],
      paymentStatus: 'PAID',
      shipmentStatus: 'DELIVERED',
      carrierName: 'Yamato Transport',
    },
    {
      publicId: 'ORD-JP-2026-006',
      userId: 'demo-customer-osaka',
      recipientName: 'Maria Santos',
      recipientPhone: '+81-80-1122-3344',
      recipientAddress: 'Osaka-shi, Naniwa-ku, Nipponbashi 4-12-8',
      recipientCity: 'Osaka',
      recipientPostalCode: '556-0005',
      shippingMethodId: 'sagawa-regular',
      shippingMethodName: 'Sagawa Express (佐川急便)',
      shippingPrice: 650,
      paymentMethod: 'credit_card',
      status: 'CANCELLED',
      createdAt: new Date('2026-09-17T11:20:00Z'),
      cancelledAt: new Date('2026-09-17T12:00:00Z'),
      items: [
        { productId: 'ikan-bandeng-presto', quantity: 2, productName: 'Ikan Bandeng Duri Lunak / 骨まで柔らかいサバヒー', productPrice: 850, productImage: 'https://images.unsplash.com/photo-1534948216015-843149f72be3?auto=format&fit=crop&w=1200&q=85' },
        { productId: 'biskuit-kelapa-renyah', quantity: 3, productName: 'Biskuit Kelapa Renyah / サクサク香ばしいココナッツビスケット', productPrice: 220, productImage: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=1200&q=85' },
      ],
      paymentStatus: 'REFUNDED',
      shipmentStatus: 'PENDING',
      carrierName: 'Sagawa Express',
    },
  ];

  for (const o of seededOrders) {
    const subtotal = o.items.reduce((sum, item) => sum + item.productPrice * item.quantity, 0);
    const total = subtotal + o.shippingPrice;

    const createdOrder = await withRetry(() =>
      prisma.order.upsert({
        where: { publicId: o.publicId },
        create: {
          publicId: o.publicId,
          userId: o.userId,
          recipientName: o.recipientName,
          recipientPhone: o.recipientPhone,
          recipientAddress: o.recipientAddress,
          recipientCity: o.recipientCity,
          recipientPostalCode: o.recipientPostalCode,
          shippingMethodId: o.shippingMethodId,
          shippingMethodName: o.shippingMethodName,
          shippingMethodEta: o.shippingMethodEta || '2-3 business days',
          shippingPrice: o.shippingPrice,
          paymentMethod: o.paymentMethod,
          subtotal,
          discountAmount: 0,
          total,
          status: o.status,
          createdAt: o.createdAt,
          shippedAt: o.shippedAt || null,
          deliveredAt: o.deliveredAt || null,
          completedAt: o.completedAt || null,
          cancelledAt: o.cancelledAt || null,
          trackingNumber: o.trackingNumber || null,
        },
        update: {
          recipientName: o.recipientName,
          subtotal,
          total,
          status: o.status,
          trackingNumber: o.trackingNumber || null,
        },
      })
    );

    // Seed OrderItems
    for (const item of o.items) {
      await withRetry(() =>
        prisma.orderItem.create({
          data: {
            orderId: createdOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            productName: item.productName,
            productPrice: item.productPrice,
            productImage: item.productImage,
            subtotal: item.productPrice * item.quantity,
            discountAllocation: 0,
          },
        })
      );
    }

    // Seed Payment
    await withRetry(() =>
      prisma.payment.create({
        data: {
          orderId: createdOrder.id,
          provider: o.paymentMethod === 'stripe' ? 'STRIPE' : 'MANUAL',
          providerPaymentId: `PAY-${o.publicId}`,
          status: o.paymentStatus,
          amount: total,
          currency: 'JPY',
          paidAt: o.paymentStatus === 'PAID' || o.paymentStatus === 'REFUNDED' ? o.createdAt : null,
          createdAt: o.createdAt,
        },
      })
    );

    // Seed Shipment
    await withRetry(() =>
      prisma.shipment.create({
        data: {
          orderId: createdOrder.id,
          provider: o.carrierName.toUpperCase().replace(/\s+/g, '_'),
          carrierName: o.carrierName,
          serviceCode: o.shippingMethodId,
          serviceName: o.shippingMethodName,
          trackingNumber: o.trackingNumber || `TRACK-${o.publicId}`,
          status: o.shipmentStatus,
          shippingCost: o.shippingPrice,
          currency: 'JPY',
          shippedAt: o.shippedAt || null,
          deliveredAt: o.deliveredAt || null,
          createdAt: o.createdAt,
        },
      })
    );

    // Seed OrderStatusHistory Audit Trail
    await withRetry(() =>
      prisma.orderStatusHistory.create({
        data: {
          orderId: createdOrder.id,
          fromStatus: null,
          toStatus: 'PENDING_PAYMENT',
          note: 'Customer placed order through marketplace storefront',
          actorType: 'CUSTOMER',
          actorId: o.userId,
          createdAt: o.createdAt,
        },
      })
    );

    if (o.paymentStatus === 'PAID' || o.status === 'PROCESSING' || o.status === 'SHIPPED' || o.status === 'DELIVERED' || o.status === 'COMPLETED') {
      await withRetry(() =>
        prisma.orderStatusHistory.create({
          data: {
            orderId: createdOrder.id,
            fromStatus: 'PENDING_PAYMENT',
            toStatus: 'PAID',
            note: 'Payment settled in full via Japanese Yen (JPY)',
            actorType: 'PAYMENT',
            createdAt: new Date(o.createdAt.getTime() + 1000 * 60 * 5),
          },
        })
      );
    }

    if (o.status === 'SHIPPED' || o.status === 'DELIVERED' || o.status === 'COMPLETED') {
      await withRetry(() =>
        prisma.orderStatusHistory.create({
          data: {
            orderId: createdOrder.id,
            fromStatus: 'PAID',
            toStatus: 'SHIPPED',
            note: `Dispatched with ${o.carrierName} - Tracking: ${o.trackingNumber}`,
            actorType: 'ADMIN',
            createdAt: o.shippedAt || new Date(o.createdAt.getTime() + 1000 * 60 * 60 * 4),
          },
        })
      );
    }

    if (o.status === 'DELIVERED' || o.status === 'COMPLETED') {
      await withRetry(() =>
        prisma.orderStatusHistory.create({
          data: {
            orderId: createdOrder.id,
            fromStatus: 'SHIPPED',
            toStatus: 'DELIVERED',
            note: 'Package signed and successfully received by recipient in Japan',
            actorType: 'SYSTEM',
            createdAt: o.deliveredAt || new Date(o.createdAt.getTime() + 1000 * 60 * 60 * 24),
          },
        })
      );
    }

    if (o.status === 'CANCELLED') {
      await withRetry(() =>
        prisma.orderStatusHistory.create({
          data: {
            orderId: createdOrder.id,
            fromStatus: 'PENDING_PAYMENT',
            toStatus: 'CANCELLED',
            note: 'Order cancelled by customer before dispatch; payment refunded',
            actorType: 'CUSTOMER',
            actorId: o.userId,
            createdAt: o.cancelledAt || new Date(o.createdAt.getTime() + 1000 * 60 * 40),
          },
        })
      );
    }

    console.log(`Seeded order & transaction history: ${o.publicId} (${o.status})`);
  }

  console.log('Asian Mart database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
