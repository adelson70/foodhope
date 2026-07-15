-- CreateTable
CREATE TABLE "operador" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead" (
    "id" TEXT NOT NULL,
    "primeiro_nome" TEXT NOT NULL,
    "sobrenome" TEXT NOT NULL,
    "contato" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "nome_completo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produto" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "preco" DECIMAL(10,2) NOT NULL,
    "adicional" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido_item" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "preco_venda" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedido_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_id_idx" ON "lead"("id");

-- CreateIndex
CREATE INDEX "lead_primeiro_nome_idx" ON "lead"("primeiro_nome");

-- CreateIndex
CREATE INDEX "lead_primeiro_nome_sobrenome_idx" ON "lead"("primeiro_nome", "sobrenome");

-- CreateIndex
CREATE UNIQUE INDEX "pedido_numero_key" ON "pedido"("numero");

-- CreateIndex
CREATE INDEX "pedido_numero_idx" ON "pedido"("numero");

-- CreateIndex
CREATE INDEX "pedido_nome_completo_idx" ON "pedido"("nome_completo");

-- CreateIndex
CREATE INDEX "pedido_item_pedidoId_idx" ON "pedido_item"("pedidoId");

-- CreateIndex
CREATE INDEX "pedido_item_produtoId_idx" ON "pedido_item"("produtoId");

-- AddForeignKey
ALTER TABLE "pedido_item" ADD CONSTRAINT "pedido_item_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_item" ADD CONSTRAINT "pedido_item_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
