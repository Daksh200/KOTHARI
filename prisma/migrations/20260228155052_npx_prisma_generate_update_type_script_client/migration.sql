-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "city" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pincode" TEXT;
