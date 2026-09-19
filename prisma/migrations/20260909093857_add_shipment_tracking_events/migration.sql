-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "carrierName" TEXT;

-- CreateTable
CREATE TABLE "ShipmentTrackingEvent" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "eventId" TEXT,
    "status" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipmentTrackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShipmentTrackingEvent_shipmentId_idx" ON "ShipmentTrackingEvent"("shipmentId");

-- CreateIndex
CREATE INDEX "ShipmentTrackingEvent_occurredAt_idx" ON "ShipmentTrackingEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "ShipmentTrackingEvent_status_idx" ON "ShipmentTrackingEvent"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ShipmentTrackingEvent_shipmentId_eventId_key" ON "ShipmentTrackingEvent"("shipmentId", "eventId");

-- AddForeignKey
ALTER TABLE "ShipmentTrackingEvent" ADD CONSTRAINT "ShipmentTrackingEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
