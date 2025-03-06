-- CreateTable
CREATE TABLE "PixWebhook" (
    "id" SERIAL NOT NULL,
    "endToEndId" TEXT NOT NULL,
    "txid" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "chave" TEXT NOT NULL,
    "horario" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PixWebhook_pkey" PRIMARY KEY ("id")
);
