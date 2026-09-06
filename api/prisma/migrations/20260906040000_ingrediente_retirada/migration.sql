-- CreateTable
CREATE TABLE "ingrediente_produto" (
    "id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingrediente_produto_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "pedido_item" ADD COLUMN "retirada_venda" JSONB;

-- CreateIndex
CREATE INDEX "ingrediente_produto_produto_id_idx" ON "ingrediente_produto"("produto_id");

-- AddForeignKey
ALTER TABLE "ingrediente_produto" ADD CONSTRAINT "ingrediente_produto_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
