-- CreateEnum
CREATE TYPE "CommissionInstallmentStatus" AS ENUM ('PENDING', 'PAID');

-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "initial_commission_installments" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "contract_fee_installments" (
    "id" SERIAL NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "CommissionInstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_fee_installments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contract_fee_installments_contract_id_number_key" ON "contract_fee_installments"("contract_id", "number");

-- AddForeignKey
ALTER TABLE "contract_fee_installments" ADD CONSTRAINT "contract_fee_installments_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
