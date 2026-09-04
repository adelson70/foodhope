-- AlterTable
ALTER TABLE "checkout_sessao" ADD COLUMN "visitor_id" TEXT;

-- CreateIndex
CREATE INDEX "checkout_sessao_visitor_id_idx" ON "checkout_sessao"("visitor_id");

-- CreateTable
CREATE TABLE "push_subscription" (
    "id" TEXT NOT NULL,
    "visitor_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "push_subscription_endpoint_key" ON "push_subscription"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscription_visitor_id_idx" ON "push_subscription"("visitor_id");
