-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "coins" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pixKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PixWebhook" (
    "id" TEXT NOT NULL,
    "endToEndId" TEXT NOT NULL,
    "txid" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "chave" TEXT NOT NULL,
    "horario" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PixWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_pixKey_key" ON "User"("pixKey");

-- CreateIndex
CREATE UNIQUE INDEX "PixWebhook_endToEndId_key" ON "PixWebhook"("endToEndId");

-- CreateIndex
CREATE UNIQUE INDEX "PixWebhook_txid_key" ON "PixWebhook"("txid");

-- AddForeignKey
ALTER TABLE "PixWebhook" ADD CONSTRAINT "PixWebhook_chave_fkey" FOREIGN KEY ("chave") REFERENCES "User"("pixKey") ON DELETE RESTRICT ON UPDATE CASCADE;
