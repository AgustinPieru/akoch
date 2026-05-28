-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERATOR');

-- CreateEnum
CREATE TYPE "OwnerType" AS ENUM ('PERSONA_FISICA', 'PERSONA_JURIDICA');

-- CreateEnum
CREATE TYPE "TaxStatus" AS ENUM ('MONOTRIBUTISTA', 'RESPONSABLE_INSCRIPTO', 'EXENTO', 'CONSUMIDOR_FINAL');

-- CreateEnum
CREATE TYPE "OwnerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('CASA', 'DEPARTAMENTO', 'LOCAL_COMERCIAL', 'OFICINA', 'TERRENO', 'COCHERA', 'DEPOSITO', 'GALPON', 'OTRO');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('AVAILABLE', 'RENTED', 'FOR_SALE', 'SOLD', 'OCCUPIED_WITHOUT_CONTRACT', 'UNDER_RENOVATION', 'BLOCKED');

-- CreateEnum
CREATE TYPE "PaidBy" AS ENUM ('AGENCY', 'OWNER', 'TENANT', 'SHARED');

-- CreateEnum
CREATE TYPE "PhotoType" AS ENUM ('ENTRY', 'EXIT', 'REPAIR', 'MARKETING', 'DOCUMENT', 'GENERAL');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owners" (
    "id" SERIAL NOT NULL,
    "type" "OwnerType" NOT NULL DEFAULT 'PERSONA_FISICA',
    "first_name" TEXT,
    "last_name" TEXT,
    "business_name" TEXT,
    "cuit" TEXT NOT NULL,
    "tax_status" "TaxStatus" NOT NULL DEFAULT 'MONOTRIBUTISTA',
    "address" TEXT,
    "phone" TEXT,
    "phone2" TEXT,
    "email" TEXT,
    "email2" TEXT,
    "cbu" TEXT,
    "bank_name" TEXT,
    "notes" TEXT,
    "status" "OwnerStatus" NOT NULL DEFAULT 'ACTIVE',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" SERIAL NOT NULL,
    "type" "PropertyType" NOT NULL,
    "street" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "floor" TEXT,
    "apartment" TEXT,
    "zip_code" TEXT,
    "city" TEXT NOT NULL,
    "province" TEXT NOT NULL DEFAULT 'Buenos Aires',
    "cadastral_nomenclature" TEXT,
    "deed_number" TEXT,
    "covered_surface" DOUBLE PRECISION,
    "total_surface" DOUBLE PRECISION,
    "age" INTEGER,
    "rooms" TEXT,
    "appraisal_ars" DOUBLE PRECISION,
    "appraisal_usd" DOUBLE PRECISION,
    "status" "PropertyStatus" NOT NULL DEFAULT 'AVAILABLE',
    "abl_paid_by" "PaidBy" NOT NULL DEFAULT 'TENANT',
    "ordinary_expenses_paid_by" "PaidBy" NOT NULL DEFAULT 'TENANT',
    "extraordinary_expenses_paid_by" "PaidBy" NOT NULL DEFAULT 'TENANT',
    "gas_paid_by" "PaidBy" NOT NULL DEFAULT 'TENANT',
    "electricity_paid_by" "PaidBy" NOT NULL DEFAULT 'TENANT',
    "water_paid_by" "PaidBy" NOT NULL DEFAULT 'TENANT',
    "abl_amount" DOUBLE PRECISION,
    "monthly_expenses_estimate" DOUBLE PRECISION,
    "has_mortgage" BOOLEAN NOT NULL DEFAULT false,
    "has_lien" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "publish_for_rent" BOOLEAN NOT NULL DEFAULT false,
    "publish_for_sale" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_owners" (
    "id" SERIAL NOT NULL,
    "property_id" INTEGER NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_photos" (
    "id" SERIAL NOT NULL,
    "property_id" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "type" "PhotoType" NOT NULL DEFAULT 'GENERAL',
    "caption" TEXT,
    "taken_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "owners_cuit_key" ON "owners"("cuit");

-- CreateIndex
CREATE UNIQUE INDEX "property_owners_property_id_owner_id_key" ON "property_owners"("property_id", "owner_id");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_owners" ADD CONSTRAINT "property_owners_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_owners" ADD CONSTRAINT "property_owners_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_photos" ADD CONSTRAINT "property_photos_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
