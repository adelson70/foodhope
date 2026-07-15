/*
  Warnings:

  - You are about to drop the `AdicionalProduto` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AdicionalProduto" DROP CONSTRAINT "AdicionalProduto_produto_id_fkey";

-- DropForeignKey
ALTER TABLE "pedido_item" DROP CONSTRAINT "pedido_item_pedido_id_fkey";

-- DropForeignKey
ALTER TABLE "pedido_item" DROP CONSTRAINT "pedido_item_produto_id_fkey";

-- DropTable
DROP TABLE "AdicionalProduto";

-- CreateTable
CREATE TABLE "adicional_produto" (
    "id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adicional_produto_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "adicional_produto" ADD CONSTRAINT "adicional_produto_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_item" ADD CONSTRAINT "pedido_item_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_item" ADD CONSTRAINT "pedido_item_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
