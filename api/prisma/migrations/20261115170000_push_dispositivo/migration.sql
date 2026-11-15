-- DropForeignKey
ALTER TABLE "push_pedido" DROP CONSTRAINT "push_pedido_pedido_id_fkey";

-- AlterTable
ALTER TABLE "checkout_sessao" ADD COLUMN     "visitor_id" TEXT;

-- DropTable
DROP TABLE "push_pedido";

-- CreateTable
CREATE TABLE "push_dispositivo" (
    "id" TEXT NOT NULL,
    "visitor_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_dispositivo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "push_dispositivo_token_key" ON "push_dispositivo"("token");

-- CreateIndex
CREATE INDEX "push_dispositivo_visitor_id_idx" ON "push_dispositivo"("visitor_id");

-- AddForeignKey
ALTER TABLE "push_dispositivo" ADD CONSTRAINT "push_dispositivo_visitor_id_fkey" FOREIGN KEY ("visitor_id") REFERENCES "visitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_sessao" ADD CONSTRAINT "checkout_sessao_visitor_id_fkey" FOREIGN KEY ("visitor_id") REFERENCES "visitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

