-- CreateEnum
CREATE TYPE "VisualizacaoTelaPedidos" AS ENUM ('DIA', 'TUDO');

-- AlterTable
ALTER TABLE "config_tela_pedidos" ADD COLUMN "visualizacao" "VisualizacaoTelaPedidos" NOT NULL DEFAULT 'DIA';
