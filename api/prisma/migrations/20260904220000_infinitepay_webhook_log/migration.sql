-- CreateEnum
CREATE TYPE "InfinitePayWebhookDirecao" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateTable
CREATE TABLE "infinitepay_webhook_log" (
    "id" TEXT NOT NULL,
    "correlacao_id" TEXT NOT NULL,
    "direcao" "InfinitePayWebhookDirecao" NOT NULL,
    "order_nsu" TEXT,
    "transaction_nsu" TEXT,
    "http_status" INTEGER,
    "corpo" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "infinitepay_webhook_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "infinitepay_webhook_log_correlacao_id_idx" ON "infinitepay_webhook_log"("correlacao_id");

-- CreateIndex
CREATE INDEX "infinitepay_webhook_log_order_nsu_idx" ON "infinitepay_webhook_log"("order_nsu");

-- CreateIndex
CREATE INDEX "infinitepay_webhook_log_transaction_nsu_idx" ON "infinitepay_webhook_log"("transaction_nsu");

-- CreateIndex
CREATE INDEX "infinitepay_webhook_log_createdAt_idx" ON "infinitepay_webhook_log"("createdAt");
