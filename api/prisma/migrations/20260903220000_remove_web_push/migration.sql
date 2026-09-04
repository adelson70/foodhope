DROP TABLE IF EXISTS "push_subscription";

DROP INDEX IF EXISTS "checkout_sessao_visitor_id_idx";

ALTER TABLE "checkout_sessao" DROP COLUMN IF EXISTS "visitor_id";
