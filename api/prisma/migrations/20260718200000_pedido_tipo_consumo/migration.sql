-- CreateEnum
CREATE TYPE "TipoConsumo" AS ENUM ('LEVAR', 'COMER_AQUI');

-- AlterTable
ALTER TABLE "pedido" ADD COLUMN "tipo_consumo" "TipoConsumo" NOT NULL DEFAULT 'COMER_AQUI';
