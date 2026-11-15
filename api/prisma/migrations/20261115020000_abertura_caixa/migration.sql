-- CreateTable
CREATE TABLE "abertura_caixa" (
    "id" TEXT NOT NULL,
    "fundo_troco" DECIMAL(10,2) NOT NULL,
    "observacao" TEXT,
    "operador_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abertura_caixa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "abertura_caixa_createdAt_idx" ON "abertura_caixa"("createdAt");
