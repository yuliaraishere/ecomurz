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
  await prisma.returnItem.deleteMany();
  await prisma.return.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.cancellation.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.promotionUsage.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.inventoryReservation.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
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

  // 3. Seed Categories
  const categoryNames = Array.from(new Set(mockProducts.map((p) => p.category)));
  const newCategoryIds = categoryNames.map((name) => name.toLowerCase());

  // Remove old categories
  await prisma.category.deleteMany({
    where: {
      id: {
        notIn: newCategoryIds,
      },
    },
  });

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
