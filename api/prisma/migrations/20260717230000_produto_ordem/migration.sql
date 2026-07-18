-- AlterTable
ALTER TABLE "produto" ADD COLUMN "ordem" INTEGER NOT NULL DEFAULT 0;

-- Backfill ordem por grupo de categoria
WITH ranked AS (
  SELECT
    id,
    (ROW_NUMBER() OVER (
      PARTITION BY categoria_id
      ORDER BY "createdAt" ASC, id ASC
    ) - 1)::INTEGER AS nova_ordem
  FROM "produto"
)
UPDATE "produto" AS p
SET "ordem" = ranked.nova_ordem
FROM ranked
WHERE p.id = ranked.id;

-- CreateIndex
CREATE INDEX "produto_ordem_idx" ON "produto"("ordem");
