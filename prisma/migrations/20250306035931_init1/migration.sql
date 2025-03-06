/*
  Warnings:

  - A unique constraint covering the columns `[txid]` on the table `PixWebhook` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `status` to the `PixWebhook` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PixWebhook" ADD COLUMN     "status" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PixWebhook_txid_key" ON "PixWebhook"("txid");
