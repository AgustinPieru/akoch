-- AlterTable: add API paid_by column to properties
ALTER TABLE "properties" ADD COLUMN "api_paid_by" "PaidBy" NOT NULL DEFAULT 'TENANT';
