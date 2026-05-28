-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "previous_contract_id" INTEGER;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "interest_amount" DOUBLE PRECISION,
ADD COLUMN     "interest_days" INTEGER,
ADD COLUMN     "interest_rate" DOUBLE PRECISION;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_previous_contract_id_fkey" FOREIGN KEY ("previous_contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
