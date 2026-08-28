-- DropForeignKey
ALTER TABLE "settlements" DROP CONSTRAINT "settlements_contract_id_fkey";

-- DropForeignKey
ALTER TABLE "settlements" DROP CONSTRAINT "settlements_property_id_fkey";

-- DropTable
DROP TABLE "settlements";
