-- CreateEnum
CREATE TYPE "TenantType" AS ENUM ('PERSONA_FISICA', 'PERSONA_JURIDICA');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('EMPLEADO_RELACION_DEPENDENCIA', 'AUTONOMO', 'JUBILADO', 'OTRO');

-- CreateTable
CREATE TABLE "tenants" (
    "id" SERIAL NOT NULL,
    "type" "TenantType" NOT NULL DEFAULT 'PERSONA_FISICA',
    "first_name" TEXT,
    "last_name" TEXT,
    "business_name" TEXT,
    "dni" TEXT,
    "cuit" TEXT,
    "birth_date" TIMESTAMP(3),
    "address" TEXT,
    "work_address" TEXT,
    "employer" TEXT,
    "phone" TEXT,
    "phone2" TEXT,
    "email" TEXT,
    "employment_status" "EmploymentStatus",
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);
