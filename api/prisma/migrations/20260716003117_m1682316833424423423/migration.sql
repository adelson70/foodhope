/*
  Warnings:

  - The `numero` column on the `pedido` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "pedido" DROP COLUMN "numero",
ADD COLUMN     "numero" BIGSERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "pedido_numero_key" ON "pedido"("numero");

-- CreateIndex
CREATE INDEX "pedido_numero_idx" ON "pedido"("numero");
