-- AlterTable
ALTER TABLE "config_impressora" ALTER COLUMN "ip" DROP NOT NULL;

-- AlterTable
ALTER TABLE "config_impressora" ADD COLUMN "dispositivo" TEXT;
