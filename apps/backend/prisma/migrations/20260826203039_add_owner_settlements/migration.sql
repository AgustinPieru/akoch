-- CreateEnum
CREATE TYPE "SettlementChargeCategory" AS ENUM ('IMPUESTO', 'SERVICIO', 'TASA', 'OTRO');

-- CreateTable
CREATE TABLE "owner_settlements" (
    "id" SERIAL NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "period_year" INTEGER NOT NULL,
    "period_month" INTEGER NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" "Currency" NOT NULL DEFAULT 'ARS',
    "total_rent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_commission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_expenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_charges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "net_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "sent_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owner_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owner_settlement_properties" (
    "id" SERIAL NOT NULL,
    "owner_settlement_id" INTEGER NOT NULL,
    "property_id" INTEGER NOT NULL,
    "contract_id" INTEGER,
    "share_percentage" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "rent_collected" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commission_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commission_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expenses_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "owner_settlement_properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owner_settlement_charges" (
    "id" SERIAL NOT NULL,
    "owner_settlement_id" INTEGER NOT NULL,
    "property_id" INTEGER,
    "category" "SettlementChargeCategory" NOT NULL DEFAULT 'OTRO',
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "owner_settlement_charges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "owner_settlements_owner_id_period_year_period_month_key" ON "owner_settlements"("owner_id", "period_year", "period_month");

-- CreateIndex
CREATE UNIQUE INDEX "owner_settlement_properties_owner_settlement_id_property_id_key" ON "owner_settlement_properties"("owner_settlement_id", "property_id");

-- AddForeignKey
ALTER TABLE "owner_settlements" ADD CONSTRAINT "owner_settlements_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_settlement_properties" ADD CONSTRAINT "owner_settlement_properties_owner_settlement_id_fkey" FOREIGN KEY ("owner_settlement_id") REFERENCES "owner_settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_settlement_properties" ADD CONSTRAINT "owner_settlement_properties_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_settlement_properties" ADD CONSTRAINT "owner_settlement_properties_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_settlement_charges" ADD CONSTRAINT "owner_settlement_charges_owner_settlement_id_fkey" FOREIGN KEY ("owner_settlement_id") REFERENCES "owner_settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_settlement_charges" ADD CONSTRAINT "owner_settlement_charges_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
