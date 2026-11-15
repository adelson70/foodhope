-- AlterTable
ALTER TABLE "pedido" ADD COLUMN "impressao_pendente" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "impressao_falhou" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "impresso_em" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "pedido_impressao_falhou_idx" ON "pedido"("impressao_falhou");
