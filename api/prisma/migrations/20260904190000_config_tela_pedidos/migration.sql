-- CreateTable
CREATE TABLE "config_tela_pedidos" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "config_tela_pedidos_pkey" PRIMARY KEY ("id")
);
