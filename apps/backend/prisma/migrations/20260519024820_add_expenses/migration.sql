-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('EXPENSAS', 'ABL', 'GAS', 'ELECTRICIDAD', 'AGUA', 'REPARACION', 'SEGURO', 'HONORARIOS', 'OTRO');

-- CreateTable
CREATE TABLE "expenses" (
    "id" SERIAL NOT NULL,
    "property_id" INTEGER NOT NULL,
    "contract_id" INTEGER,
    "category" "ExpenseCategory" NOT NULL DEFAULT 'OTRO',
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'ARS',
    "date" TIMESTAMP(3) NOT NULL,
    "period_year" INTEGER NOT NULL,
    "period_month" INTEGER NOT NULL,
    "paid_by" "PaidBy" NOT NULL DEFAULT 'AGENCY',
    "invoice_number" TEXT,
    "notes" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
