-- CreateEnum
CREATE TYPE "TipoProduto" AS ENUM ('SIMPLES', 'VARIAVEL');

-- AlterTable
ALTER TABLE "produto" ADD COLUMN "tipo" "TipoProduto" NOT NULL DEFAULT 'SIMPLES';

-- CreateTable
CREATE TABLE "variacao_produto" (
    "id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "imagem_url" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "variacao_produto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "variacao_produto_produto_id_idx" ON "variacao_produto"("produto_id");

-- CreateIndex
CREATE UNIQUE INDEX "variacao_produto_produto_id_nome_key" ON "variacao_produto"("produto_id", "nome");

-- AddForeignKey
ALTER TABLE "variacao_produto" ADD CONSTRAINT "variacao_produto_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "pedido_item" ADD COLUMN "variacao_id" TEXT,
ADD COLUMN "variacao_nome" TEXT;

-- AddForeignKey
ALTER TABLE "pedido_item" ADD CONSTRAINT "pedido_item_variacao_id_fkey" FOREIGN KEY ("variacao_id") REFERENCES "variacao_produto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Bebidas existentes passam a ser produtos variáveis (casando pelo nome, que é único).
UPDATE produto
SET tipo = 'VARIAVEL'
WHERE nome IN ('Suco Caixinha 200ml', 'Refrigerante Lata', 'Água 500ml');

INSERT INTO variacao_produto (id, produto_id, nome, preco, ativo, ordem, "createdAt", "updatedAt")
SELECT gen_random_uuid(), p.id, v.nome, p.preco, true, v.ordem, NOW(), NOW()
FROM produto p
JOIN (
  VALUES
    ('Suco Caixinha 200ml', 'Uva', 0),
    ('Suco Caixinha 200ml', 'Laranja', 1),
    ('Suco Caixinha 200ml', 'Pêssego', 2),
    ('Refrigerante Lata', 'Coca-Cola', 0),
    ('Refrigerante Lata', 'Coca Zero', 1),
    ('Refrigerante Lata', 'Guaraná', 2),
    ('Água 500ml', 'Sem gás', 0),
    ('Água 500ml', 'Com gás', 1)
) AS v(produto_nome, nome, ordem) ON v.produto_nome = p.nome
ON CONFLICT (produto_id, nome) DO NOTHING;
