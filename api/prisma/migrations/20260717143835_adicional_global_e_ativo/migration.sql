-- AlterTable
ALTER TABLE "adicional_produto" ADD COLUMN     "ativo" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "adicional_global" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adicional_global_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produto_adicional_global" (
    "produto_id" TEXT NOT NULL,
    "adicional_global_id" TEXT NOT NULL,

    CONSTRAINT "produto_adicional_global_pkey" PRIMARY KEY ("produto_id","adicional_global_id")
);

-- AddForeignKey
ALTER TABLE "produto_adicional_global" ADD CONSTRAINT "produto_adicional_global_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produto_adicional_global" ADD CONSTRAINT "produto_adicional_global_adicional_global_id_fkey" FOREIGN KEY ("adicional_global_id") REFERENCES "adicional_global"("id") ON DELETE CASCADE ON UPDATE CASCADE;
