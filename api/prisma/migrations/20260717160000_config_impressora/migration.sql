-- CreateTable
CREATE TABLE "config_impressora" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "ip" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "config_impressora_pkey" PRIMARY KEY ("id")
);
