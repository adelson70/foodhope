-- AlterTable
ALTER TABLE "pedido" ADD COLUMN "pronto_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "pedido_pronto_at_idx" ON "pedido"("pronto_at");
