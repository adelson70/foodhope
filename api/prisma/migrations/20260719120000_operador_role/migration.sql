-- CreateEnum
CREATE TYPE "RoleOperador" AS ENUM ('ADMIN', 'OPERADOR', 'TOTEM');

-- AlterTable
ALTER TABLE "operador" ADD COLUMN "role" "RoleOperador" NOT NULL DEFAULT 'OPERADOR';
