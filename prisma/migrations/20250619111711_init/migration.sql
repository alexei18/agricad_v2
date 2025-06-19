-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING');

-- CreateEnum
CREATE TYPE "LogType" AS ENUM ('ASSIGNMENT', 'USER_ACTION', 'SYSTEM', 'PARCEL_UPLOAD', 'ADMIN_ACTION');

-- CreateTable
CREATE TABLE "Mayor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "subscriptionStatus" "Status" NOT NULL DEFAULT 'PENDING',
    "subscriptionEndDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mayor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Village" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mayorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Village_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Farmer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyCode" TEXT NOT NULL,
    "village" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Farmer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parcel" (
    "id" TEXT NOT NULL,
    "village" TEXT NOT NULL,
    "area" DOUBLE PRECISION NOT NULL,
    "coordinates" JSONB NOT NULL,
    "ownerId" TEXT,
    "cultivatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parcel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogEntry" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logType" "LogType" NOT NULL,
    "actor" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT,

    CONSTRAINT "LogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Mayor_email_key" ON "Mayor"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Village_name_key" ON "Village"("name");

-- CreateIndex
CREATE INDEX "Village_mayorId_idx" ON "Village"("mayorId");

-- CreateIndex
CREATE UNIQUE INDEX "Farmer_companyCode_key" ON "Farmer"("companyCode");

-- CreateIndex
CREATE UNIQUE INDEX "Farmer_email_key" ON "Farmer"("email");

-- CreateIndex
CREATE INDEX "Parcel_village_idx" ON "Parcel"("village");

-- CreateIndex
CREATE INDEX "Parcel_ownerId_idx" ON "Parcel"("ownerId");

-- CreateIndex
CREATE INDEX "Parcel_cultivatorId_idx" ON "Parcel"("cultivatorId");

-- CreateIndex
CREATE INDEX "LogEntry_timestamp_idx" ON "LogEntry"("timestamp");

-- CreateIndex
CREATE INDEX "LogEntry_logType_idx" ON "LogEntry"("logType");

-- CreateIndex
CREATE INDEX "LogEntry_actor_idx" ON "LogEntry"("actor");

-- AddForeignKey
ALTER TABLE "Village" ADD CONSTRAINT "Village_mayorId_fkey" FOREIGN KEY ("mayorId") REFERENCES "Mayor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcel" ADD CONSTRAINT "Parcel_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Farmer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcel" ADD CONSTRAINT "Parcel_cultivatorId_fkey" FOREIGN KEY ("cultivatorId") REFERENCES "Farmer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
