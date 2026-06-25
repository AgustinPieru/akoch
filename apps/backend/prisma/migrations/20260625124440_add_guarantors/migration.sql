-- CreateTable
CREATE TABLE "guarantors" (
    "id" SERIAL NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "full_name" TEXT NOT NULL,
    "dni" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guarantors_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "guarantors" ADD CONSTRAINT "guarantors_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
