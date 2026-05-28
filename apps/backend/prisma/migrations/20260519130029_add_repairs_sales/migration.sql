-- CreateEnum
CREATE TYPE "RepairStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RepairPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "SaleStage" AS ENUM ('PROSPECTING', 'VISIT_SCHEDULED', 'OFFER_MADE', 'NEGOTIATING', 'SIGNED', 'CLOSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "repairs" (
    "id" SERIAL NOT NULL,
    "property_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "status" "RepairStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "RepairPriority" NOT NULL DEFAULT 'MEDIUM',
    "provider" TEXT,
    "provider_phone" TEXT,
    "estimated_cost" DOUBLE PRECISION,
    "actual_cost" DOUBLE PRECISION,
    "currency" "Currency" NOT NULL DEFAULT 'ARS',
    "reported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduled_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repairs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" SERIAL NOT NULL,
    "property_id" INTEGER NOT NULL,
    "asking_price" DOUBLE PRECISION NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "stage" "SaleStage" NOT NULL DEFAULT 'PROSPECTING',
    "buyer_name" TEXT,
    "buyer_phone" TEXT,
    "buyer_email" TEXT,
    "offer_amount" DOUBLE PRECISION,
    "closing_date" TIMESTAMP(3),
    "commission_pct" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "commission_amount" DOUBLE PRECISION,
    "notes" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
