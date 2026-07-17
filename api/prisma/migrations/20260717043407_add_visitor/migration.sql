-- CreateTable
CREATE TABLE "visitor" (
    "id" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "challenge" TEXT,
    "challenge_expires_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitor_pkey" PRIMARY KEY ("id")
);
