-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'RENEWED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "IndexType" AS ENUM ('ICL_BCRA', 'IPC_INDEC', 'FREE', 'NONE');

-- CreateEnum
CREATE TYPE "UpdateFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'FOUR_MONTHLY', 'SEMI_ANNUAL', 'ANNUAL');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('ARS', 'USD');

-- CreateTable
CREATE TABLE "contracts" (
    "id" SERIAL NOT NULL,
    "property_id" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "duration_months" INTEGER NOT NULL,
    "initial_amount" DOUBLE PRECISION NOT NULL,
    "current_amount" DOUBLE PRECISION NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'ARS',
    "index_type" "IndexType" NOT NULL DEFAULT 'ICL_BCRA',
    "update_frequency" "UpdateFrequency" NOT NULL DEFAULT 'QUARTERLY',
    "free_percentage" DOUBLE PRECISION,
    "admin_commission_pct" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "initial_commission" DOUBLE PRECISION,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "termination_date" TIMESTAMP(3),
    "termination_reason" TEXT,
    "special_clauses" TEXT,
    "last_adjustment_date" TIMESTAMP(3),
    "next_adjustment_date" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_tenants" (
    "id" SERIAL NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_adjustments" (
    "id" SERIAL NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "applied_at" TIMESTAMP(3) NOT NULL,
    "previous_amount" DOUBLE PRECISION NOT NULL,
    "new_amount" DOUBLE PRECISION NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "index_type" "IndexType" NOT NULL,
    "index_value" DOUBLE PRECISION,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contract_tenants_contract_id_tenant_id_key" ON "contract_tenants"("contract_id", "tenant_id");

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_tenants" ADD CONSTRAINT "contract_tenants_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_tenants" ADD CONSTRAINT "contract_tenants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_adjustments" ADD CONSTRAINT "contract_adjustments_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
