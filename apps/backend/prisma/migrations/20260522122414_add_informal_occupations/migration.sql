-- CreateEnum
CREATE TYPE "OccupationReason" AS ENUM ('EXPIRED_CONTRACT', 'OWNER_FAMILY', 'CONTRACT_IN_PROGRESS', 'OTHER');

-- CreateEnum
CREATE TYPE "OccupationStatus" AS ENUM ('ACTIVE', 'REGULARIZED', 'VACATED');

-- CreateTable
CREATE TABLE "informal_occupations" (
    "id" SERIAL NOT NULL,
    "property_id" INTEGER NOT NULL,
    "occupant_name" TEXT NOT NULL,
    "occupant_phone" TEXT,
    "occupant_tenant_id" INTEGER,
    "start_date" TIMESTAMP(3) NOT NULL,
    "reason" "OccupationReason" NOT NULL DEFAULT 'OTHER',
    "informal_amount" DOUBLE PRECISION,
    "currency" "Currency" NOT NULL DEFAULT 'ARS',
    "status" "OccupationStatus" NOT NULL DEFAULT 'ACTIVE',
    "end_date" TIMESTAMP(3),
    "converted_to_contract_id" INTEGER,
    "alert_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "informal_occupations_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "informal_occupations" ADD CONSTRAINT "informal_occupations_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "informal_occupations" ADD CONSTRAINT "informal_occupations_occupant_tenant_id_fkey" FOREIGN KEY ("occupant_tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "informal_occupations" ADD CONSTRAINT "informal_occupations_converted_to_contract_id_fkey" FOREIGN KEY ("converted_to_contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
