-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "expiry_notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "late_notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "monthly_notifications_enabled" BOOLEAN NOT NULL DEFAULT true;
