CREATE TYPE "StatusPagamento" AS ENUM ('PAGO', 'NAO_PAGO', 'GRATUITO');

ALTER TABLE "pedido" ADD COLUMN "status_pagamento" "StatusPagamento" NOT NULL DEFAULT 'PAGO';

UPDATE "pedido"
SET "status_pagamento" = CASE
  WHEN "pago" = false THEN 'NAO_PAGO'::"StatusPagamento"
  ELSE 'PAGO'::"StatusPagamento"
END;

DROP INDEX "pedido_pago_idx";

ALTER TABLE "pedido" DROP COLUMN "pago";

CREATE INDEX "pedido_status_pagamento_idx" ON "pedido"("status_pagamento");

UPDATE "pedido"
SET "status_pagamento" = 'GRATUITO'::"StatusPagamento"
WHERE lower(trim(nome_completo)) = 'banda'
   OR lower(nome_completo) LIKE '% banda';
