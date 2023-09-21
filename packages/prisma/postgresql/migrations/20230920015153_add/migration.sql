/*
  Warnings:

  - Added the required column `body` to the `Webhook` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Webhook" DROP COLUMN "body",
ADD COLUMN     "body" JSONB NOT NULL;

-- CreateTable
CREATE TABLE "Blubot" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "url" TEXT,
    "method" TEXT NOT NULL,
    "body" JSONB NOT NULL,
    "typebotId" TEXT NOT NULL,

    CONSTRAINT "Blubot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Answer_storageUsed_idx" ON "Answer"("storageUsed");

-- AddForeignKey
ALTER TABLE "Blubot" ADD CONSTRAINT "Blubot_typebotId_fkey" FOREIGN KEY ("typebotId") REFERENCES "Typebot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
