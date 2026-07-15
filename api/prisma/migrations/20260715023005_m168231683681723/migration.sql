/*
  Warnings:

  - You are about to drop the column `pedidoId` on the `pedido_item` table. All the data in the column will be lost.
  - You are about to drop the column `preco_venda` on the `pedido_item` table. All the data in the column will be lost.
  - You are about to drop the column `produtoId` on the `pedido_item` table. All the data in the column will be lost.
  - You are about to drop the column `adicional` on the `produto` table. All the data in the column will be lost.
  - Added the required column `pedido_id` to the `pedido_item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `preco_produto` to the `pedido_item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `produto_id` to the `pedido_item` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "pedido_item" DROP CONSTRAINT "pedido_item_pedidoId_fkey";

-- DropForeignKey
ALTER TABLE "pedido_item" DROP CONSTRAINT "pedido_item_produtoId_fkey";

-- DropIndex
DROP INDEX "pedido_item_pedidoId_idx";

-- DropIndex
DROP INDEX "pedido_item_produtoId_idx";

-- AlterTable
ALTER TABLE "pedido_item" DROP COLUMN "pedidoId",
DROP COLUMN "preco_venda",
DROP COLUMN "produtoId",
ADD COLUMN     "adicional_venda" JSONB,
ADD COLUMN     "pedido_id" TEXT NOT NULL,
ADD COLUMN     "preco_produto" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "produto_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "produto" DROP COLUMN "adicional";

-- CreateTable
CREATE TABLE "AdicionalProduto" (
    "id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdicionalProduto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pedido_item_pedido_id_idx" ON "pedido_item"("pedido_id");

-- CreateIndex
CREATE INDEX "pedido_item_produto_id_idx" ON "pedido_item"("produto_id");

-- AddForeignKey
ALTER TABLE "AdicionalProduto" ADD CONSTRAINT "AdicionalProduto_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_item" ADD CONSTRAINT "pedido_item_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_item" ADD CONSTRAINT "pedido_item_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
