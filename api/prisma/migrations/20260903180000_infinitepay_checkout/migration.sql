-- AlterTable
ALTER TABLE "pedido" ADD COLUMN "pago" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "pedido_pago_idx" ON "pedido"("pago");

-- CreateTable
CREATE TABLE "config_infinitepay" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "handle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "config_infinitepay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkout_sessao" (
    "id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "amount_centavos" INTEGER NOT NULL,
    "checkout_url" TEXT,
    "invoice_slug" TEXT,
    "transaction_nsu" TEXT,
    "receipt_url" TEXT,
    "capture_method" TEXT,
    "installments" INTEGER,
    "pago_at" TIMESTAMP(3),
    "pedido_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checkout_sessao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "checkout_sessao_transaction_nsu_key" ON "checkout_sessao"("transaction_nsu");

-- CreateIndex
CREATE UNIQUE INDEX "checkout_sessao_pedido_id_key" ON "checkout_sessao"("pedido_id");

-- AddForeignKey
ALTER TABLE "checkout_sessao" ADD CONSTRAINT "checkout_sessao_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;
