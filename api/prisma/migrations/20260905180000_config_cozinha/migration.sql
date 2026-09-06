-- CreateTable
CREATE TABLE "config_cozinha" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "config_cozinha_pkey" PRIMARY KEY ("id")
);
