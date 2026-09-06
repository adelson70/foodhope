-- AlterTable
ALTER TABLE "pedido" ADD COLUMN "client_request_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "pedido_client_request_id_key" ON "pedido"("client_request_id");
