-- AlterTable
ALTER TABLE "Category" ADD COLUMN "archivedAt" TIMESTAMP(3),
ADD COLUMN "description" TEXT,
ADD COLUMN "slug" TEXT NOT NULL DEFAULT '',
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- Backfill Category slugs from id
UPDATE "Category" SET "slug" = "id" WHERE "slug" = '';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "archivedAt" TIMESTAMP(3),
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'JPY',
ADD COLUMN "sku" TEXT NOT NULL DEFAULT '',
ADD COLUMN "slug" TEXT NOT NULL DEFAULT '',
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- Backfill Product slugs and SKUs
UPDATE "Product" SET "slug" = "id" WHERE "slug" = '';
UPDATE "Product" SET "sku" = 'RUPA-' || UPPER(REPLACE("id", '-', '')) WHERE "sku" = '';

-- CreateTable
CREATE TABLE "CategoryTranslation" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPriceHistory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "previousPrice" INTEGER NOT NULL,
    "newPrice" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'JPY',
    "changedBy" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogAuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategoryTranslation_locale_idx" ON "CategoryTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryTranslation_categoryId_locale_key" ON "CategoryTranslation"("categoryId", "locale");

-- CreateIndex
CREATE INDEX "ProductPriceHistory_productId_idx" ON "ProductPriceHistory"("productId");

-- CreateIndex
CREATE INDEX "ProductPriceHistory_createdAt_idx" ON "ProductPriceHistory"("createdAt");

-- CreateIndex
CREATE INDEX "CatalogAuditLog_entityType_entityId_idx" ON "CatalogAuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "CatalogAuditLog_action_idx" ON "CatalogAuditLog"("action");

-- CreateIndex
CREATE INDEX "CatalogAuditLog_createdAt_idx" ON "CatalogAuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_status_idx" ON "Category"("status");

-- CreateIndex
CREATE INDEX "Category_slug_idx" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_sku_idx" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_slug_idx" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "Product"("status");

-- AddForeignKey
ALTER TABLE "CategoryTranslation" ADD CONSTRAINT "CategoryTranslation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPriceHistory" ADD CONSTRAINT "ProductPriceHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
